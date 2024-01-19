import { NestedStack, NestedStackProps, SecretValue } from "aws-cdk-lib";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { IVpc, SecurityGroup, Subnet, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  Cluster,
  ContainerImage,
  Secret as ecs_Secret,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  ApplicationLoadBalancer,
  IApplicationLoadBalancer,
  ListenerAction,
  ListenerCondition,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { CfnAccessKey, Effect, ManagedPolicy, Policy, PolicyStatement, User } from "aws-cdk-lib/aws-iam";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { SesSmtpCredentials } from "@pepperize/cdk-ses-smtp-credentials";
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from "aws-cdk-lib/aws-s3";

export interface ECSServiceProps extends NestedStackProps {
  vpc: IVpc;
  dbSecret: ISecret;
  certificate: ICertificate;
  dbName: string;
  dbHostname: string;
  dbPort: string;
  applicationName: string;
  authorizedIPsForAdminAccess: string[];
}

export class ECSService extends NestedStack {
  public readonly loadBalancer: IApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props?: ECSServiceProps) {
    super(scope, id, props);

    const {
      vpc,
      dbSecret,
      dbHostname,
      dbName,
      dbPort,
      certificate,
      applicationName,
      authorizedIPsForAdminAccess,
    } = props!;

    const bucket = new Bucket(scope, 'Bucket', {
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      cors: [{
        allowedOrigins: ['*'],
        allowedMethods: [HttpMethods.GET],
        allowedHeaders: ['*'],
        exposedHeaders: [],
        maxAge: 3000
      }],
    });

    const strapiSecret = new Secret(this, "StrapiSecret", {
      secretName: `${applicationName}-strapi-secret`,

      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "StrapiKey",
        excludePunctuation: true,
      },
    });

    const loadBalancer = new ApplicationLoadBalancer(this, "ALB", {
      vpc,
      internetFacing: true,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
        onePerAz: true,
      },
    });

    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc,
    });

    const user = new User(this, 'IamUser', {
      userName: 'iam-user',
    });

    const policy = new Policy(this, 'IamUserPolicy', {
      policyName: 'IamUserPolicy',
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ses:SendRawEmail", "ses:SendEmail"],
          resources: ["*"],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:*"],
          resources: [
            bucket.arnForObjects("*"), 
            bucket.bucketArn,
          ],
        }),
      ],
    });
    policy.attachToUser(user);

    const accessKey = new CfnAccessKey(this, 'IamUserAccessKey', {
      userName: user.userName,
    });

    const iamSecret = new Secret(this, "IamUserSecret", {
      secretObjectValue: {
        key: SecretValue.unsafePlainText(accessKey.ref),
        secret: SecretValue.unsafePlainText(accessKey.attrSecretAccessKey),
      },
    });

    const cluster = new Cluster(this, "Cluster", { vpc });
    const loadBalancedService = new ApplicationLoadBalancedFargateService(
      this,
      "FargateService",
      {
        cluster,
        taskImageOptions: {
          secrets: {
            ...this.getSecretsDefinition(dbSecret, strapiSecret, iamSecret),
          },
          image: ContainerImage.fromAsset("../cms"),
          containerPort: 1337,
          environment: {
            DATABASE_CLIENT: "postgres",
            DATABASE_HOST: dbHostname,
            DATABASE_PORT: dbPort,
            DATABASE_NAME: dbName,
            HOST: "0.0.0.0",
            PORT: "1337",
            AWS_BUCKET: bucket.bucketName,
          },
        },
        certificate,
        loadBalancer,
        securityGroups: [securityGroup],
      }
    );

    const policyStatement = new PolicyStatement({
      resources: [dbSecret.secretFullArn!, strapiSecret.secretFullArn!],
      actions: ["secretsmanager:GetSecretValue"],
    });

    loadBalancedService.taskDefinition.addToExecutionRolePolicy(
      policyStatement
    );

    // this.restricAccessToAdmin(loadBalancedService, authorizedIPsForAdminAccess);

    this.loadBalancer = loadBalancedService.loadBalancer;
  }

  private getSecretsDefinition(dbSecret: ISecret, strapiSecret: ISecret, iamSecret: ISecret) {
    return {
      DATABASE_USERNAME: ecs_Secret.fromSecretsManager(dbSecret, "username"),
      DATABASE_PASSWORD: ecs_Secret.fromSecretsManager(dbSecret, "password"),
      JWT_SECRET: ecs_Secret.fromSecretsManager(strapiSecret, "StrapiKey"),
      APP_KEYS: ecs_Secret.fromSecretsManager(strapiSecret, "StrapiKey"),
      API_TOKEN_SALT: ecs_Secret.fromSecretsManager(strapiSecret, "StrapiKey"),
      ADMIN_JWT_SECRET: ecs_Secret.fromSecretsManager(
        strapiSecret,
        "StrapiKey"
      ),
      AWS_ACCESS_KEY_ID: ecs_Secret.fromSecretsManager(iamSecret, "key"),
      AWS_ACCESS_SECRET_KEY: ecs_Secret.fromSecretsManager(iamSecret, "secret"),
    };
  }

  private restricAccessToAdmin(
    loadBalancedService: ApplicationLoadBalancedFargateService,
    authorizedIPsForAdminAccess: string[]
  ) {
    loadBalancedService.listener.addAction("accept", {
      priority: 1,
      conditions: [
        ListenerCondition.pathPatterns(["/admin/*"]),
        ListenerCondition.sourceIps(authorizedIPsForAdminAccess),
      ],
      action: ListenerAction.forward([loadBalancedService.targetGroup]),
    });

    loadBalancedService.listener.addAction("forbidden", {
      priority: 2,
      conditions: [ListenerCondition.pathPatterns(["/admin/*"])],
      action: ListenerAction.fixedResponse(403, {
        contentType: "text/html",
        messageBody: "Your IP address is not authorized",
      }),
    });
  }
}

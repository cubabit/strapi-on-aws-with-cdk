import { SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { ECSService } from "./ecs-service";
import { Vpc } from "aws-cdk-lib/aws-ec2";

import { Route53Record } from "./route53-record";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

class StrapiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpcId = this.node.tryGetContext("vpcId");
    const applicationName = this.node.tryGetContext("applicationName");
    const dbUsername = this.node.tryGetContext("dbUsername");
    const dbPort = this.node.tryGetContext("dbPort");
    const dbPassword = this.node.tryGetContext("dbPassword");
    const dbHostname = this.node.tryGetContext("dbHostname");
    const dbSecurityGroupId = this.node.tryGetContext("dbSecurityGroupId");
    const hostedZoneDomainName = this.node.tryGetContext(
      "hostedZoneDomainName"
    );
    const authorizedIPsForAdminAccess: string[] = this.node
      .tryGetContext("authorizedIPsForAdminAccess")
      .split(",");
    const certificateArn = this.node.tryGetContext("certificateArn");

    const dbSecret = new Secret(this, "DBCredentialsSecret", {
      secretObjectValue: {
        username: SecretValue.unsafePlainText(dbUsername),
        database: SecretValue.unsafePlainText(applicationName),
        password: SecretValue.unsafePlainText(dbPassword),
      },
    });

    const vpc = Vpc.fromLookup(this, 'ImportVPC', {
      vpcId,
    });

    const certificate = Certificate.fromCertificateArn(this,'Certificate', certificateArn);

    const ecsServiceStack = new ECSService(this, ECSService.name, {
      certificate,
      dbHostname,
      dbPort,
      dbName: applicationName,
      dbSecret,
      dbSecurityGroupId,
      vpc,
      applicationName,
      authorizedIPsForAdminAccess,
    });

    new Route53Record(this, Route53Record.name, {
      hostedZoneDomainName,
      applicationName,
      loadBalancer: ecsServiceStack.loadBalancer,
    });
  }
}

export { StrapiStack };

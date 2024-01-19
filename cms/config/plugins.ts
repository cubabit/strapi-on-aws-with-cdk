export default ({ env }) => ({
  email: {
    config: {
      provider: 'amazon-ses',
      providerOptions: {
        key: env('AWS_ACCESS_KEY_ID'),
        secret: env('AWS_ACCESS_SECRET_KEY'),
        amazon: 'https://email.eu-west-1.amazonaws.com',
      },
      settings: {
        defaultFrom: 'cms@ruuby.com',
        defaultReplyTo: 'noreply@ruuby.com',
      },
    },
  },
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_ACCESS_SECRET_KEY'),
        region: "eu-west-1",
        params: {
          ACL: env('AWS_ACL', 'public-read'),
          signedUrlExpires: env('AWS_SIGNED_URL_EXPIRES', 15 * 60),
          Bucket: env('AWS_BUCKET'),
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  //
  // graphql: {
  //   config: {
  //     endpoint: '/graphql',
  //     shadowCRUD: true,
  //     playgroundAlways: false,
  //     depthLimit: 7,
  //     amountLimit: 100,
  //     apolloServer: {
  //       tracing: false,
  //     },
  //   },
  // },
});

import path from "node:path";

export default ({ env }) => ({
  connection: {
    client: 'sqlite',
    connection: {
      filename: path.join(__dirname, '../../', env('DATABASE_FILENAME', '.tmp/data.db')),
    },
    useNullAsDefault: true,
  },
  // connection: {
  //   client: "postgres",
  //   connection: {
  //     host: env("DATABASE_HOST", "127.0.0.1"),
  //     port: env.int("DATABASE_PORT", 5432),
  //     database: env("DATABASE_NAME", "strapi"),
  //     user: env("DATABASE_USERNAME", "admin"),
  //     password: env("DATABASE_PASSWORD", "admin"),
  //     ssl: env.bool("DATABASE_SSL", false),
  //   },
  // },
});

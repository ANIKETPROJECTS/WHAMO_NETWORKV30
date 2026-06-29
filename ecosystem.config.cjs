module.exports = {
  apps: [
    {
      name: "whamo-app",
      script: "./dist/index.cjs",
      env: {
        NODE_ENV: "production",
        PORT: 3006,
        MONGODB_URI: "mongodb+srv://raneaniket23_db_user:CziItK0T30mdH4Uq@hydraulictransient.am7vyms.mongodb.net/?appName=HYDRAULICTRANSIENT",
        JWT_SECRET: "7NKdfyo2YjvXFiVDNGYRy2+Ks3+/Nwt27Clvsn2I4BhNWmmObO/Cm/933wPfVRIAFtVjQJwZIMKhyUYfk/tbqg==",
      }
    }
  ]
};

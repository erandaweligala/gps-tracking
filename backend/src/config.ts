export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://gps:gps@localhost:5432/gps_tracking",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  // CORS for the dashboard (REST + Socket.IO).
  // - If CORS_ORIGIN is set, it is a comma-separated allow-list of origins.
  // - If it is unset (local dev), we reflect ANY request origin (`true`) so it
  //   works whether you open the dashboard via localhost, 127.0.0.1, or a LAN
  //   IP. Set CORS_ORIGIN explicitly in production.
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
    : true,
};

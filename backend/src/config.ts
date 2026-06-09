export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://gps:gps@localhost:5432/gps_tracking",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  // Comma-separated list of allowed dashboard origins. Defaults to both the
  // `localhost` and `127.0.0.1` forms on Vite's dev port, since browsers treat
  // them as distinct origins for CORS.
  corsOrigin: (
    process.env.CORS_ORIGIN ??
    "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server as IOServer } from "socket.io";
import { z } from "zod";
import { config } from "./config.js";
import { initDb, pool } from "./db.js";
import { bearer, signToken, verifyToken } from "./auth.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: config.corsOrigin });

// --- Schemas -------------------------------------------------------------

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  altitude: z.number().optional(),
  battery: z.number().optional(),
  // Epoch millis from the device; defaults to server time when absent.
  recordedAt: z.number().optional(),
});

// A device may upload a batch (offline buffer flush) or a single point.
const ingestSchema = z.union([locationSchema, z.array(locationSchema)]);

// --- Health --------------------------------------------------------------

app.get("/health", async () => ({ ok: true }));

// --- Ingest (device only) ------------------------------------------------

app.post("/api/locations", async (req, reply) => {
  const auth = verifyToken(bearer(req.headers.authorization) ?? "");
  if (!auth || auth.role !== "device" || !auth.deviceId) {
    return reply.code(401).send({ error: "device token required" });
  }

  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }
  const points = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  const deviceId = auth.deviceId;

  for (const p of points) {
    const recordedAt = new Date(p.recordedAt ?? Date.now());
    const { rows } = await pool.query(
      `INSERT INTO locations
         (device_id, geom, lat, lng, accuracy, speed, heading, altitude, battery, recorded_at)
       VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
               $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, recorded_at`,
      [
        deviceId,
        p.lat,
        p.lng,
        p.accuracy ?? null,
        p.speed ?? null,
        p.heading ?? null,
        p.altitude ?? null,
        p.battery ?? null,
        recordedAt,
      ]
    );

    // Relay live to any viewer watching this device.
    io.to(`device:${deviceId}`).emit("location", {
      id: rows[0].id,
      deviceId,
      ...p,
      recordedAt: rows[0].recorded_at,
    });
  }

  return reply.code(201).send({ accepted: points.length });
});

// --- History (viewer) ----------------------------------------------------

app.get("/api/devices/:id/locations", async (req, reply) => {
  const auth = verifyToken(bearer(req.headers.authorization) ?? "");
  if (!auth) return reply.code(401).send({ error: "auth required" });

  const { id } = req.params as { id: string };
  // Devices may only read their own track.
  if (auth.role === "device" && auth.deviceId !== id) {
    return reply.code(403).send({ error: "forbidden" });
  }

  const limit = Math.min(Number((req.query as any).limit ?? 500), 5000);
  const { rows } = await pool.query(
    `SELECT id, lat, lng, accuracy, speed, heading, altitude, battery, recorded_at
       FROM locations
      WHERE device_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2`,
    [id, limit]
  );
  return rows.reverse();
});

app.get("/api/devices", async (req, reply) => {
  const auth = verifyToken(bearer(req.headers.authorization) ?? "");
  if (!auth) return reply.code(401).send({ error: "auth required" });
  const { rows } = await pool.query(
    `SELECT d.id, d.name,
            (SELECT recorded_at FROM locations l
              WHERE l.device_id = d.id
              ORDER BY recorded_at DESC LIMIT 1) AS last_seen
       FROM devices d ORDER BY d.name`
  );
  return rows;
});

// --- Boot ----------------------------------------------------------------

await initDb();

const server = app.server;
const io = new IOServer(server, { cors: { origin: config.corsOrigin } });

// Viewers authenticate with their JWT, then subscribe to a device room.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  const payload = verifyToken(token ?? "");
  if (!payload) return next(new Error("unauthorized"));
  (socket.data as any).auth = payload;
  next();
});

io.on("connection", (socket) => {
  socket.on("watch", (deviceId: string) => {
    socket.join(`device:${deviceId}`);
  });
  socket.on("unwatch", (deviceId: string) => {
    socket.leave(`device:${deviceId}`);
  });
});

await app.listen({ port: config.port, host: "0.0.0.0" });

// Convenience: print demo tokens on boot for local development.
app.log.info(
  { deviceToken: signToken({ role: "device", deviceId: "demo-device" }) },
  "demo device token"
);
app.log.info({ viewerToken: signToken({ role: "viewer" }) }, "demo viewer token");

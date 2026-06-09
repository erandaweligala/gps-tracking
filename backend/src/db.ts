import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

/** Apply schema.sql (idempotent) and seed a demo device. */
export async function initDb(): Promise<void> {
  const schema = await readFile(join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  await pool.query(
    `INSERT INTO devices (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    ["demo-device", "Demo device"]
  );
}

// db.js
import { Pool } from "pg";

let pool: Pool | undefined;

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      user: process.env.RDS_USER,
      host: process.env.RDS_HOST,
      database: process.env.RDS_DATABASE,
      password: process.env.RDS_PASSWORD,
      port: process.env.RDS_PORT ? parseInt(process.env.RDS_PORT, 10) : undefined,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

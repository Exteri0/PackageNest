import * as pg from "pg";
import "dotenv/config";
const { Pool } = pg;

let pool: any;

export function getDbPool() {
  if (!pool) {
    console.log("Creating new database connection pool");
    pool = new Pool({
      user: process.env.RDS_USER,
      host: process.env.RDS_HOST,
      database: process.env.RDS_DATABASE,
      password: process.env.RDS_PASSWORD,
      port: process.env.RDS_PORT ? parseInt(process.env.RDS_PORT, 10) : 5432,
      ssl: { rejectUnauthorized: false },
      // Alternatively, if SSL is not required:
      // ssl: false,
    });

    pool.on("error", (err: any) => {
      console.error("Unexpected error on idle client", err);
      process.exit(-1);
    });
  }
  return pool;
}

/**
 * Database Connection Module
 * 
 * This file provides a singleton instance for managing connections to the database.
 * It uses the PostgreSQL `pg` library and ensures that only one connection pool 
 * is created and reused throughout the application.
 * 
 * The Singleton Design Pattern is followed to ensure efficient use of resources 
 * and prevent multiple database connection pools from being created.
 */

import pkg from "pg"; // Import the CommonJS module as a default export
const { Pool } = pkg; // Destructure Pool from the default import
import "dotenv/config";

let pool: any = null;

/**
 * Retrieves the singleton instance of the database connection pool.
 * 
 * If the pool does not exist, a new connection pool is created using environment 
 * variables for configuration. The connection pool is then reused for subsequent calls.
 * 
 * @returns The database connection pool.
 */
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
    });

    pool.on("error", (err: any) => {
      console.error("Unexpected error on idle client", err);
      process.exit(-1);
    });
  }
  return pool;
}

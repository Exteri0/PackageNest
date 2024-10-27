const Client = require("pg").Client;
import { get } from "http";
import { getDbPool } from "../service/databaseConnection";
import "dotenv/config";

export async function populateRegistry(): Promise<void> {
  try {
    const pool = getDbPool();
    const packages = [
      { name: "package1", version: "1.0.0", score: 0.5 },
      { name: "package2", version: "1.0.1", score: 0.75 },
      { name: "package3", version: "1.0.2", score: 0.9 },
    ];

    for (const pkg of packages) {
      const query = `INSERT INTO public."packages" (name, version, score) VALUES ($1, $2, $3) RETURNING id;`;
      const res = await pool.query(query, [pkg.name, pkg.version, pkg.score]);
      console.log(`Inserted package with ID: ${res.rows[0].id}`);
    }
  } catch (error) {
    console.error("Error populating registry:", error);
    throw error;
  }
}
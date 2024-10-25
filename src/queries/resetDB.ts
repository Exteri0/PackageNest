const Client = require("pg").Client;
import * as fs from "fs";
import * as path from "path";

import "dotenv/config";

// Database connection configuration
const client = new Client({
  user: process.env.RDS_USER, // PostgreSQL DB username
  host: process.env.RDS_HOST, // RDS endpoint (from AWS RDS console)
  database: process.env.RDS_DATABASE, // Your database name
  password: process.env.RDS_PASSWORD, // Your RDS password
  port: process.env.RDS_PORT, // Default PostgreSQL port
  ssl: { rejectUnauthorized: false }, // SSL configuration
});

async function executeSqlFile(filePath: string): Promise<void> {
  try {
    // Connect to the PostgreSQL database
    await client.connect();

    // Read the SQL file
    const sql = fs.readFileSync(filePath, "utf8");

    // Execute the SQL file
    await client.query(sql);

    console.log("SQL file executed successfully");
  } catch (err) {
    console.error("Error executing SQL file:", err);
  } finally {
    // Close the database connection
    await client.end();
  }
}

// Path to the SQL file
const sqlFilePath = path.join(__dirname, "../../databasereset.sql");

// Execute the SQL file
executeSqlFile(sqlFilePath);

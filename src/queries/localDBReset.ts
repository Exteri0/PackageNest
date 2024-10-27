const Client = require("pg").Client;
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";
import awsSdk from "aws-sdk";
const bucketName = process.env.S3_BUCKET_NAME;
const s3 = new awsSdk.S3();

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

async function resetS3(): Promise<void> {
    // Implement your S3 reset logic here
    console.log("Resetting S3...");
    if (!bucketName) {
    throw new Error("S3_BUCKET_NAME is not defined in the environment variables.");
    }

    console.log("Started registryReset");

    try {
        // Step 1: Delete all packages from the S3 `packages` folder
        console.log("Listing S3 objects in packages folder");
        const listParams = {
        Bucket: bucketName,
        Prefix: "packages/",
        };
        const listedObjects = await s3.listObjectsV2(listParams).promise();

        if (listedObjects.Contents && listedObjects.Contents.length > 0) {
        console.log("Deleting S3 objects in packages folder");
        const deleteParams = {
            Bucket: bucketName,
            Delete: {
            Objects: listedObjects.Contents.map((item) => ({ Key: item.Key! })),
            },
        };
        await s3.deleteObjects(deleteParams).promise();
        console.log("All S3 packages deleted successfully");
        } else {
        console.log("No objects to delete in the S3 packages folder");
        }
    } catch (error: any) {
        console.error("Error occurred during registry reset:", error);
        throw new Error(`Failed to reset registry: ${error.message}`);
    }
}
// Path to the SQL file
const sqlFilePath = path.join(__dirname, "../../databasereset.sql");
// Execute the SQL file
async function resetAllLocal() {
    console.log("Reset RDS LOCALLY");
    await executeSqlFile(sqlFilePath);
    console.log("Reset S3 LOCALLY");
    await resetS3();
};

resetAllLocal(); // Call the function to reset the local database and S3

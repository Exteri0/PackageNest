"use strict";

import { Request, Response, NextFunction, response } from "express";
import awsSdk from "aws-sdk";
import { executeSqlFile } from "../queries/resetDB";
import "dotenv/config";
import { getDbPool } from "./databaseConnection";
import * as packageQueries from "../queries/packageQueries";
import { CustomError } from "../utils/types";

const bucketName = process.env.S3_BUCKET_NAME;
const s3 = new awsSdk.S3();

/**
 * Types
 */
export interface PackagesListResponse {
  packages: Package[];
  nextOffset: number | null;
}

export interface AuthenticationRequest {
  User: {
    name: string;
    isAdmin: boolean;
  };
  Secret: {
    password: string;
  };
}

export interface AuthenticationToken {
  token: string;
}

export interface PackageName {
  name: string;
}

export interface PackageID {
  id: string;
}

export interface PackageMetadata {
  Version: string;
  ID: string;
  Name: string;
}

export interface Package {
  metadata: PackageMetadata;
  data: {
    Content: string;
    debloat: boolean;
    JSProgram: string;
    URL: string;
  };
}

export interface PackageCost {
  standaloneCost: number;
  totalCost: number;
}

export interface PackageRating {
  GoodPinningPractice: number;
  CorrectnessLatency: number;
  PullRequestLatency: number;
  RampUpLatency: number;
  PullRequest: number;
  LicenseScore: number;
  BusFactorLatency: number;
  LicenseScoreLatency: number;
  GoodPinningPracticeLatency: number;
  Correctness: number;
  ResponsiveMaintainerLatency: number;
  NetScoreLatency: number;
  NetScore: number;
  ResponsiveMaintainer: number;
  RampUp: number;
  BusFactor: number;
}

export interface PackageQuery {
  Version: string;
  ID: string;
  Name: string;
}

/**
 * (NON-BASELINE)
 * Create an access token.
 *
 * @param body AuthenticationRequest
 * @returns Promise<AuthenticationToken>
 */
export function createAuthToken(
  body: AuthenticationRequest
): Promise<AuthenticationToken> {
  return new Promise(function (resolve, reject) {
    if (body) {
      const token =
        "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      resolve({ token });
    } else {
      reject({
        message: "Missing required properties 'User' or 'Secret'",
        status: 400,
      });
    }
  });
}
/*
Test body:
{
  "User": {
    "name": "ece30861defaultadminuser",
    "isAdmin": true
  },
  "Secret": {
    "password": "correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;"
  }
}
*/

/**
 * (NON-BASELINE)
 * Return the history of this package (all versions).
 *
 * @param name PackageName
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
export function packageByNameGet(
  name: PackageName,
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  return new Promise(function (resolve) {
    const examples: { [key: string]: Array<any> } = {
      "application/json": [
        {
          Action: "CREATE",
          User: {
            name: "Alfalfa",
            isAdmin: true,
          },
          PackageMetadata: {
            Version: "1.2.3",
            ID: "123567192081501",
            Name: "Name",
          },
          Date: "2023-03-23T23:11:15Z",
        },
        {
          Action: "CREATE",
          User: {
            name: "Alfalfa",
            isAdmin: true,
          },
          PackageMetadata: {
            Version: "1.2.3",
            ID: "123567192081501",
            Name: "Name",
          },
          Date: "2023-03-23T23:11:15Z",
        },
      ],
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (BASELINE)
 * Search for a package using a regular expression over package names and READMEs.
 *
 * @param body PackageQuery
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
export function packageByRegExGet(
  body: PackageQuery,
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  return new Promise(function (resolve) {
    const examples: { [key: string]: Array<any> } = {
      "application/json": [
        {
          Version: "1.2.3",
          ID: "123567192081501",
          Name: "Name",
        },
        {
          Version: "1.2.3",
          ID: "123567192081501",
          Name: "Name",
        },
      ],
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (BASELINE)
 * Upload or Ingest a new package.
 *
 * @param body Package
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Package>
 */
export async function packageCreate(
  body: {
    Content: string;
    JSProgram: string;
    url: string;
    debloat: boolean;
    Name: string;
  },
  xAuthorization: AuthenticationToken
) {
  console.log("Entered packageCreate service function");
  console.log("Received body:", JSON.stringify(body));
  console.log("Received xAuthorization:", xAuthorization);

  // Check if required fields are present in body
  if (!body || !body.Name || !body.Content || !body.JSProgram) {
    console.error(
      "Invalid request body: 'Name', 'Content', and 'JSProgram' are required."
    );
    throw new CustomError(
      "Invalid request body. 'Name', 'Content', and 'JSProgram' are required.",
      400
    );
  }

  if (!bucketName) {
    console.error(
      "S3_BUCKET_NAME is not defined in the environment variables."
    );
    throw new Error(
      "S3_BUCKET_NAME is not defined in the environment variables."
    );
  }

  const packageName = sanitizeInput(body.Name);
  const packageVersion = "1.0.0"; // Assuming a default version, change as necessary
  const packageId = packageName.toLowerCase().replace(/[^a-z0-9\-]/g, ""); // Generate package_id based on Name

  // Set up the S3 key for storing the package data
  const s3Key = `packages/${packageId}/v${packageVersion}/package.zip`;
  const s3Params = {
    Bucket: bucketName,
    Key: s3Key,
    Body: Buffer.from(body.Content, "base64"),
    ContentType: "application/zip",
  };

  try {
    // Upload the package to S3
    if (body.Content) {
      console.log("Uploading package to S3 with key:", s3Key);
      const s3Data = await s3.putObject(s3Params).promise();
      console.log(`Package uploaded successfully: ${s3Data.ETag}`);
    }

    // Insert package metadata into the packages table
    const query = `
      INSERT INTO public."packages" (name, version, package_id, readme)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name, version) DO NOTHING
      RETURNING id
    `;
    const values = [
      packageName,
      packageVersion,
      packageId,
      body.Content ? "README for " + packageName : null, // Placeholder readme, adjust as necessary
    ];

    console.log("Inserting package into the packages table");
    const res = await getDbPool().query(query, values);
    const packageIdFromDb = res.rows[0]?.id;

    if (!packageIdFromDb) {
      console.error("Package already exists");
      throw new CustomError("Package exists already.", 409);
    }

    console.log("Package inserted successfully with ID:", packageIdFromDb);

    // Insert js_program into the package_data table
    const packageDataQuery = `
      INSERT INTO public."package_data" (package_id, url, debloat, js_program)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const packageDataValues = [
      packageIdFromDb,
      body.url || null, // URL can be null
      body.debloat || false,
      body.JSProgram,
    ];

    console.log("Inserting package data into the package_data table");
    const packageDataRes = await getDbPool().query(
      packageDataQuery,
      packageDataValues
    );
    const packageDataId = packageDataRes.rows[0]?.id;

    if (!packageDataId) {
      console.error("Failed to insert JS Program into package_data");
      throw new CustomError(
        "Failed to insert JS Program into package_data.",
        500
      );
    }

    console.log("JS Program inserted successfully with ID:", packageDataId);

    // Prepare response
    const response = {
      metadata: {
        Name: packageName,
        Version: packageVersion,
        ID: packageIdFromDb, // Use the database ID
      },
      data: {
        Content: body.Content,
        JSProgram: body.JSProgram,
      },
    };

    console.log("Returning updated body:", JSON.stringify(response));
    return response;
  } catch (error: any) {
    console.error("Error occurred in packageCreate:", error);
    throw new CustomError(
      `Failed to upload package or insert into database: ${error.message}`,
      500
    );
  }
}

function sanitizeInput(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_\.]/g, "");
}

/* BASE INPUT: Put it as body in postman

{
  "metadata": {
    "Version": "1.0.0",
    "ID": "1234567890",
    "Name": "ExamplePackage"
  },
  "data": {
    "Content": "This is a sample content for the package.",
    "debloat": false,
    "JSProgram": "console.log('Hello World!');",
    "URL": "https://example.com/package/example.zip"
  }
}
  
*/

/**
 * (NON-BASELINE)
 * Delete a package that matches the ID.
 *
 * @param xAuthorization AuthenticationToken
 * @param id PackageID
 * @returns Promise<void>
 */
export function packageDelete(
  xAuthorization: AuthenticationToken,
  id: PackageID
): Promise<void> {
  return new Promise(function (resolve) {
    resolve();
  });
}

/**
 * (BASELINE)
 * Get the cost of a package.
 *
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @param dependency boolean (optional)
 * @returns Promise<PackageCost>
 */
export function packageIdCostGET(
  id: PackageID,
  xAuthorization: AuthenticationToken,
  dependency?: boolean
): Promise<PackageCost> {
  return new Promise(function (resolve) {
    const examples: { [key: string]: PackageCost } = {
      "application/json": {
        standaloneCost: 0.8008281904610115,
        totalCost: 6.027456183070403,
      },
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (BASELINE)
 * Get ratings for this package.
 *
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @returns Promise<PackageRating>
 */
export function packageRate(
  id: PackageID,
  xAuthorization: AuthenticationToken
): Promise<PackageRating> {
  return new Promise(function (resolve) {
    const examples: { [key: string]: PackageRating } = {
      "application/json": {
        GoodPinningPractice: 4.145608029883936,
        CorrectnessLatency: 5.962133916683182,
        PullRequestLatency: 1.0246457001441578,
        RampUpLatency: 2.3021358869347655,
        PullRequest: 1.2315135367772556,
        LicenseScore: 3.616076749251911,
        BusFactorLatency: 6.027456183070403,
        LicenseScoreLatency: 2.027123023002322,
        GoodPinningPracticeLatency: 7.386281948385884,
        Correctness: 1.4658129805029452,
        ResponsiveMaintainerLatency: 9.301444243932576,
        NetScoreLatency: 6.84685269835264,
        NetScore: 1.4894159098541704,
        ResponsiveMaintainer: 7.061401241503109,
        RampUp: 5.637376656633329,
        BusFactor: 0.8008281904610115,
      },
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (BASELINE)
 * Return this package.
 *
 * @param xAuthorization AuthenticationToken
 * @param id PackageID
 * @returns Promise<Package>
 */
export function packageRetrieve(
  xAuthorization: AuthenticationToken,
  id: PackageID
): Promise<Package> {
  return new Promise(function (resolve) {
    const examples: { [key: string]: Package } = {
      "application/json": {
        metadata: {
          Version: "1.2.3",
          ID: "123567192081501",
          Name: "Name",
        },
        data: {
          Content: "Content",
          debloat: true,
          JSProgram: "JSProgram",
          URL: "URL1",
        },
      },
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (BASELINE)
 * Update the content of the package.
 *
 * @param body Package
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @returns Promise<void>
 */
export function packageUpdate(
  body: Package,
  id: PackageID,
  xAuthorization: AuthenticationToken
): Promise<void> {
  return new Promise(function (resolve) {
    resolve();
  });
}

/**
 * (BASELINE)
 * Get the packages from the registry.
 *
 * @param body Array<PackageQuery>
 * @param offset string (optional)
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<PackageQuery>>
 */
export async function packagesList(
  body: PackageQuery[],
  offset?: string,
  xAuthorization?: AuthenticationToken
): Promise<PackagesListResponse> {
  console.log("Entered packagesList service function");
  console.log("Received body:", JSON.stringify(body));
  console.log("Received offset:", offset);
  console.log("Received xAuthorization:", xAuthorization);

  const limit = 10; // Number of items per page
  const offsetValue = offset ? parseInt(offset, 10) : 0;

  try {
    let queryParams: any[] = [];
    let whereClauses: string[] = [];

    if (body && body.length > 0) {
      // Handle special case: Name is "*"
      if (body.length === 1 && body[0].Name === "*") {
        // No where clause, select all packages
        console.log("Selecting all packages");
      } else {
        let queryIndex = 1;
        let packageConditions: string[] = [];

        for (const pkgQuery of body) {
          let conditions: string[] = [];
          const queryValues: any[] = [];

          // Ensure only one Version format per query
          if (pkgQuery.Version) {
            const versionFormats = [
              /^\d+\.\d+\.\d+$/, // Exact version
              /^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/, // Bounded range
              /^\^\d+\.\d+\.\d+$/, // Carat notation
              /^~\d+\.\d+\.\d+$/, // Tilde notation
            ];
            const matches = versionFormats.filter((regex) =>
              regex.test(pkgQuery.Version)
            );
            if (matches.length !== 1) {
              throw new Error(
                `Invalid or ambiguous version format: ${pkgQuery.Version}`
              );
            }
          }

          // Handle Name
          if (pkgQuery.Name) {
            conditions.push(`name = $${queryIndex}`);
            queryValues.push(pkgQuery.Name);
            queryIndex++;
          }

          // Handle ID
          if (pkgQuery.ID) {
            conditions.push(`id = $${queryIndex}`);
            queryValues.push(pkgQuery.ID);
            queryIndex++;
          }

          // Handle Version
          if (pkgQuery.Version) {
            const version = pkgQuery.Version.trim();

            if (/^\d+\.\d+\.\d+$/.test(version)) {
              // Exact version
              conditions.push(`version = $${queryIndex}`);
              queryValues.push(version);
              queryIndex++;
            } else if (/^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/.test(version)) {
              // Bounded range
              const [startVersion, endVersion] = version.split("-");
              conditions.push(
                `version >= $${queryIndex} AND version <= $${queryIndex + 1}`
              );
              queryValues.push(startVersion, endVersion);
              queryIndex += 2;
            } else if (/^\^\d+\.\d+\.\d+$/.test(version)) {
              // Carat notation
              const baseVersion = version.substring(1);
              const [major] = baseVersion.split(".");
              conditions.push(`version LIKE $${queryIndex}`);
              queryValues.push(`${major}.%`);
              queryIndex++;
            } else if (/^~\d+\.\d+\.\d+$/.test(version)) {
              // Tilde notation
              const baseVersion = version.substring(1);
              const [major, minor] = baseVersion.split(".");
              conditions.push(`version LIKE $${queryIndex}`);
              queryValues.push(`${major}.${minor}.%`);
              queryIndex++;
            } else {
              throw new Error(`Invalid version format: ${version}`);
            }
          }

          if (conditions.length > 0) {
            const conditionString = conditions.join(" AND ");
            packageConditions.push(`(${conditionString})`);
            queryParams.push(...queryValues);
          }
        }

        if (packageConditions.length > 0) {
          whereClauses.push(packageConditions.join(" OR "));
        }
      }
    }

    // Prepare query conditions and parameters
    const packages = await packageQueries.getPackages(
      whereClauses,
      queryParams,
      limit,
      offsetValue
    );

    // Determine if there is a next page
    const nextOffset = packages.length === limit ? offsetValue + limit : null;

    return {
      packages,
      nextOffset,
    };
  } catch (error) {
    console.error("Error in packagesList:", error);
    throw error;
  }
}
/*
Test input:
[
  {
    "Name": "Underscore",
    "Version": "1.2.3"
  },
  {
    "Name": "Lodash",
    "Version": "1.2.3-2.1.0"
  },
  {
    "Name": "React",
    "Version": "^1.2.3"
  }
] 
*/

/**
 * (NON-BASELINE)
 * Resets the registry.
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<void>
 */
export async function registryReset(
  xAuthorization: AuthenticationToken
): Promise<void> {
  if (!bucketName) {
    throw new Error(
      "S3_BUCKET_NAME is not defined in the environment variables."
    );
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

    // Step 2: Reset RDS database

    await executeSqlFile();
  } catch (error: any) {
    console.error("Error occurred during registry reset:", error);
    throw new Error(`Failed to reset registry: ${error.message}`);
  }
}

/**
 * (NON-BASELINE)
 * Returns an array of track objects.
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
export function tracksGET(
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  return new Promise<Array<any>>((resolve) => {
    const examples: { [key: string]: Array<any> } = {
      "application/json": [
        {
          Version: "1.2.3",
          ID: "123567192081501",
          Name: "Name",
        },
        {
          Version: "1.2.3",
          ID: "123567192081501",
          Name: "Name",
        },
      ],
    };
    resolve(examples["application/json"]);
  });
}

/**
 * (NON-BASELINE)
 * Testing
 *
 * @param xAuthorization AuthenticationToken
 * @returns Promise<Array<any>>
 */
export function testGET(
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  return new Promise<Array<any>>((resolve) => {
    const examples: { [key: string]: Array<any> } = {
      "application/json": [
        {
          Version: "1.2.3",
          ID: "testing",
          Name: "Name",
        },
        {
          Version: "1.2.3",
          ID: "aaaaaaaa",
          Name: "Name",
        },
      ],
    };
    resolve(examples["application/json"]);
  });
}

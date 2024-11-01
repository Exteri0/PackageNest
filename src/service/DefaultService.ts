"use strict";

import { Request, Response, NextFunction, response } from "express";
import awsSdk from "aws-sdk";
import { executeSqlFile } from "../queries/resetDB";
import "dotenv/config";
import { getDbPool } from "./databaseConnection";
import * as packageQueries from "../queries/packageQueries";
import {calculateMetrics} from "../Metrics/metricExport";
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

export interface PackageRegEx {
  RegEx: string;
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
  CorrectnessLatency: number;
  RampUpLatency: number;
  LicenseScore: number;
  BusFactorLatency: number;
  LicenseScoreLatency: number;
  PullRequest: number;
  PullRequestLatency: number;
  GoodPinningPractice: number;
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
export async function packageByRegExGet(
  body: PackageRegEx,
  xAuthorization: AuthenticationToken
): Promise<Array<any>> {
  console.log("Entered packageByRegExGet function");
  console.log("Received body:", JSON.stringify(body));
  console.log("Received xAuthorization:", xAuthorization);

  if (!body || !body.RegEx) {
    console.error("Invalid request body: 'RegEx' is required.");
    throw new CustomError("Invalid request body. 'RegEx' is required.", 400);
  }

  try {
    // Perform a query to retrieve packages whose names match the regular expression
    const regexQuery = `
      SELECT name AS Name, version AS Version, package_id AS ID
      FROM public.packages
      WHERE name ~ $1
    `;
    const regexValues = [body.RegEx];

    //  const packageData = await getDbPool().query(insertPackageQuery, [packageName, packageVersion, packageId, false]);

    const result = await getDbPool().query(regexQuery, regexValues);

    if (result.rows.length === 0) {
      console.log("No packages matched the provided regular expression.");
      return [];
    }

    // Prepare the result list in the specified format
    const response = result.rows.map((row) => ({
      Name: row.name,
      Version: row.version,
      ID: row.package_id,
    }));

    console.log("Returning matched packages:", JSON.stringify(response));
    return response;
  } catch (error: any) {
    console.error("Error occurred in packageByRegExGet:", error);
    throw new CustomError(`Failed to retrieve packages: ${error.message}`, 500);
  }
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
    URL: string;
    debloat: boolean;
    Name: string;
  },
  xAuthorization: AuthenticationToken
) {
  console.log("Entered packageCreate service function");
  console.log("Received body:", JSON.stringify(body));
  console.log("Received xAuthorization:", xAuthorization);

  if (!body || !body.Name || (!body.Content && !body.URL)) {
    console.error("Invalid request body: 'Name', and 'Content' or 'URL' are required.");
    throw new CustomError("Invalid request body. 'Name', and 'Content' or 'URL' are required.", 400);
  }

  if (!bucketName) {
    console.error("S3_BUCKET_NAME is not defined in the environment variables.");
    throw new CustomError("S3_BUCKET_NAME is not defined in the environment variables.", 500);
  }

  const packageName = sanitizeInput(body.Name);
  const packageVersion = "1.0.0"; // Assuming a default version
  const packageId = packageName.toLowerCase().replace(/[^a-z0-9\-]/g, "");

  const s3Key = `packages/${packageId}/v${packageVersion}/package.zip`;

  const s3Params = {
    Bucket: bucketName,
    Key: s3Key,
    Body: Buffer.from(body.Content, "base64"),
    ContentType: "application/zip",
  };

  try {
    if (body.Content) {
      console.log("Uploading package to S3 with key:", s3Key);
      await s3.putObject(s3Params).promise();
    }

    const insertPackageQuery = `
      INSERT INTO public.packages (name, version, package_id, content_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name, version) DO NOTHING
      RETURNING package_id;
    `;
    const packageData = await getDbPool().query(insertPackageQuery, [packageName, packageVersion, packageId, false]);

    const insertMetadataQuery = `
      INSERT INTO public.package_metadata (package_id, name, version)
      VALUES ($1, $2, $3);
    `;
    await getDbPool().query(insertMetadataQuery, [packageId, packageName, packageVersion]);

    const insertDataQuery = `
      INSERT INTO public.package_data (package_id, content_type, url, debloat, js_program)
      VALUES ($1, $2, $3, $4, $5);
    `;
    await getDbPool().query(insertDataQuery, [packageId, false, body.URL || "null", body.debloat, body.JSProgram]);

    console.log("Package and metadata inserted successfully.");

    const response = {
      metadata: {
        Name: packageName,
        Version: packageVersion,
        ID: packageId,
      },
      data: {
        Content: body.Content,
        JSProgram: body.JSProgram,
      },
    };

    return response;
  } catch (error) {
    console.error("Error occurred in packageCreate:", error);
    throw new CustomError(`Failed to upload package or insert into database`, 500);
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
export async function packageRate(id: PackageID, xAuthorization: AuthenticationToken): Promise<PackageRating> {
  /* return new Promise(function(resolve) {
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
    resolve(examples['application/json']);
  }); */
  const testOutput: any = await calculateMetrics("");
  let response: PackageRating = {
    GoodPinningPractice: 0,
    CorrectnessLatency: 0,
    PullRequestLatency: 0,
    RampUpLatency: 0,
    PullRequest: 0,
    LicenseScore: 0,
    BusFactorLatency: 0,
    LicenseScoreLatency: 0,
    GoodPinningPracticeLatency: 0,
    Correctness: 0,
    ResponsiveMaintainerLatency: 0,
    NetScoreLatency: 0,
    NetScore: 0,
    ResponsiveMaintainer: 0,
    RampUp: 0,
    BusFactor: 0,
  };
  response.BusFactor = testOutput.BusFactor;
  response.Correctness = testOutput.Correctness;
  response.GoodPinningPractice = testOutput.GoodPinningPractice;
  response.LicenseScore = testOutput.LicenseScore;
  response.NetScore = testOutput.NetScore;
  response.PullRequest = testOutput.PullRequest;
  response.RampUp = testOutput.RampUp;
  response.ResponsiveMaintainer = testOutput.ResponsiveMaintainer;
  response.BusFactorLatency = testOutput.BusFactor_Latency;
  response.CorrectnessLatency = testOutput.Correctness_Latency;
  response.GoodPinningPracticeLatency = testOutput.GoodPinningPracticeLatency;
  response.LicenseScoreLatency = testOutput.LicenseScore_Latency;
  response.NetScoreLatency = testOutput.NetScore_Latency;
  response.PullRequestLatency = testOutput.PullRequest_Latency;
  response.RampUpLatency = testOutput.RampUp_Latency;
  response.ResponsiveMaintainerLatency = testOutput.ResponsiveMaintainer_Latency;
  return Promise.resolve(response);
}

/**
 * (BASELINE)
 * Return this package.
 *
 * @param xAuthorization AuthenticationToken
 * @param id PackageID
 * @returns Promise<Package>
 */
export async function packageRetrieve(
  xAuthorization: AuthenticationToken,
  id: string
) {
  console.log("Entered packageRetrieve function with ID:", id);
  console.log("Received xAuthorization:", xAuthorization);

  if (!bucketName) {
    console.error("S3_BUCKET_NAME is not defined in the environment variables.");
    throw new CustomError("S3_BUCKET_NAME is not defined in the environment variables.", 500);
  }

  try {
    // Retrieve package metadata from the packages and package_data tables using the provided ID
    const metadataQuery = `
      SELECT p.name as packageName, p.version as packageVersion, p.package_id as packageId,
             pd.url as packageURL, pd.js_program as packageJS, p.content_type
      FROM public.packages AS p
      JOIN public.package_data AS pd ON p.package_id = pd.package_id
      WHERE p.package_id = $1
    `;
    const metadataValues = [id];

    const metadataResult = await getDbPool().query(metadataQuery, metadataValues);
    const metadata = metadataResult.rows[0];

    if (!metadata) {
      console.error("Package not found with ID:", id);
      throw new CustomError("Package not found.", 404);
    }

    console.log("Metadata of the query: ",metadata);

    // Construct the S3 key to retrieve the zip file based on package_id
    //const s3Key = `packages/${packageId}/v${packageVersion}/package.zip`;
    const s3Key = `packages/${metadata.packageid}/v${metadata.packageversion}/package.zip`;
    const s3Params = {
      Bucket: bucketName,
      Key: s3Key,
    };

    // Fetch the package content from S3
    console.log("Fetching package content from S3 with key:", s3Key);
    const s3Object = await s3.getObject(s3Params).promise();
    const content = s3Object.Body ? s3Object.Body.toString("base64") : null;

    if (!content) {
      console.error("Failed to retrieve package content from S3 for key:", s3Key);
      throw new CustomError("Package content not found in S3.", 404);
    }

    // Prepare response in the desired format
    const response = {
      metadata: {
        Name: metadata.packagename,
        Version: metadata.packageversion,
        ID: metadata.packageid,
      },
      data: {
        Content: content, // Base64 encoded zip content
        JSProgram: metadata.packagejs,
      },
    };

    console.log("Returning package data:", JSON.stringify(response));
    return response;
  } catch (error: any) {
    console.error("Error occurred in packageRetrieve:", error);
    throw new CustomError(`Failed to retrieve package: ${error.message}`, 500);
  }
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
              throw new CustomError(
                `Invalid or ambiguous version format: ${pkgQuery.Version}`,
                400
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
              throw new CustomError(`Invalid version format: ${version}`,
                400
              );
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
    if (error instanceof CustomError) {
      console.error("Error in packagesList:", error.message);
      throw error;
    } else {
      console.error("Unexpected error in packagesList:", error);
      throw new CustomError("An unexpected error occurred.", 500);
    }
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

"use strict";

import { Request, Response, NextFunction, response } from "express";
import * as https from "https";
import awsSdk from "aws-sdk";
import axios from "axios";
import { executeSqlFile } from "../queries/resetDB.js";
import "dotenv/config";
import { getDbPool } from "./databaseConnection.js";
import * as packageQueries from "../queries/packageQueries.js";
import { calculateMetrics } from "../Metrics/metricExport.js";
import {
  calculateSize,
  debloatPackage,
  generateUniqueId,
  compareVersions,
} from "../service/packageUtils.js";
import {
  updatePackageData,
  updatePackageMetadata,
} from "../queries/packageQueries.js";
import { CustomError, PackageCostDetail } from "../utils/types.js";
import { extractGithubRepoLink } from "../utils/packageExtractor.js"; // Import the extractor
import * as crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { convertNpmUrlToGitHubUrl } from "../utils/urlConverter.js"; // Import the helper function
import {
  createToken,
  createUser,
  deleteToken,
  getAllUsers,
  getTokenByUserId,
  getUserByUsername,
  updateToken,
} from "../queries/userQueries.js";
import {
  getPackageInfoZipFile,
  getPackageInfoRepo,
  downloadFile,
  convertTarballToZipBuffer,
} from "../utils/retrievePackageJson.js";

import {
  extractReadme, // Import the README extraction function
} from "../utils/readmeExtractor.js"; // Adjust the path if necessary
import { get } from "http";

const bucketName = process.env.S3_BUCKET_NAME;
const s3 = new awsSdk.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
  region: "us-east-2", // Replace with your region
});

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
    isBackend: boolean;
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

interface InputPackage {
  Content: string;
  JSProgram: string | undefined;
  debloat: boolean;
  Name: string | undefined;
}

export function registerUser(body: AuthenticationRequest): Promise<void> {
  return new Promise(async function (resolve, reject) {
    if (body) {
      const user = body.User;
      const secret = body.Secret.password;
      const hashedPassword = await bcrypt.hash(secret, 10);

      try {
        await createUser(
          user.name,
          hashedPassword,
          user.isAdmin,
          user.isBackend
        );
        resolve();
      } catch (error) {
        console.error("Error occurred in registerUser:", error);
        if (error instanceof CustomError)
          reject(
            new CustomError(`Failed to register user: ${error.message}`, 500)
          );
        else reject(new CustomError(`Failed to register user`, 500));
      }
    } else {
      reject(
        new CustomError("Missing required properties 'User' or 'Password'", 400)
      );
    }
  });
}

export function getUsers(): Promise<any> {
  return new Promise(async function (resolve, reject) {
    try {
      const result = await getAllUsers();
      resolve(result);
    } catch (error) {
      console.error("Error occurred in getAllUsers:", error);
      reject(new CustomError(`Failed to retrieve users`, 500));
    }
  });
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
  return new Promise(async function (resolve, reject) {
    console.log("Entered createAuthToken function with body:", body);
    if (body.User && body.User.name && body.Secret && body.Secret.password) {
      const foundUser = await getUserByUsername(body.User.name);
      if (foundUser) {
        console.log("Found user:", foundUser);
        const validPassword = await bcrypt.compare(
          body.Secret.password,
          foundUser.password_hash
        );
        if (validPassword) {
          const foundToken = await getTokenByUserId(foundUser.id);
          if (foundToken) {
            await deleteToken(foundUser.id);
          }
          const token = jwt.sign(
            {
              name: foundUser.name,
              isAdmin: foundUser.isadmin,
              isBackend: foundUser.isbackend,
            },
            process.env.JWT_SECRET ?? "defaultSecret",
            {
              expiresIn: "10h",
            }
          );
          await createToken(foundUser.id, token);
          resolve({ token: token });
        } else {
          reject(new CustomError("Invalid password", 401));
        }
      } else {
        reject(new CustomError("User not found", 404));
      }
    } else {
      reject(
        new CustomError("Missing required properties 'User' or 'Password'", 400)
      );
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
): Promise<Array<{ Name: string; Version: string; ID: string }>> {
  console.log("Entered packageByRegExGet function");
  console.log("Received body:", JSON.stringify(body));
  console.log("Received xAuthorization:", JSON.stringify(xAuthorization));

  // Validate request body
  if (!body || !body.RegEx) {
    console.error("Invalid request body: 'RegEx' is required.");
    throw new CustomError("Invalid request body. 'RegEx' is required.", 400);
  }

  try {
    // SQL query to search both package names and READMEs using the same RegEx
    const regexQuery = `
      SELECT p.name AS name, p.version AS version, p.package_id AS package_id
      FROM public.packages p
      JOIN public.package_metadata pm ON p.package_id = pm.package_id
      WHERE p.name ~ $1 OR pm.readme ~ $1
    `;
    const regexValues = [body.RegEx];

    // Execute the query
    const result = await getDbPool().query(regexQuery, regexValues);

    if (result.rows.length === 0) {
      console.log("No packages matched the provided regular expression.");
      return [];
    }

    // Format the response
    const response = result.rows.map((row: any) => ({
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
 * Creates a new package by processing either uploaded content or a repository URL.
 * Optionally debloats the package by minifying JavaScript files.
 * @param Content - Base64-encoded string of the ZIP file.
 * @param URL - URL of the package repository (GitHub or npmjs.com).
 * @param debloat - Boolean flag to indicate whether debloating should be performed.
 * @param JSProgram - Optional JavaScript program related to the package.
 * @param customName - Optional custom name for the package.
 * @returns An object containing metadata and data about the uploaded package.
 * @throws CustomError if any step fails.
 */
export async function packageCreate(
  Content?: string,
  URL?: string,
  debloat?: boolean,
  JSProgram?: string,
  customName?: string // Added customName parameter
) {
  // Initialize variables to hold package information
  let packageName: string | undefined = undefined;
  let packageVersion: string | undefined = undefined;
  let packageId: string | undefined = undefined;
  let contentBuffer: Buffer | undefined = undefined; // For holding binary data
  let returnString: string | undefined = undefined;
  let debloatVal: boolean = debloat ?? false;

  let metrics: any; // Existing type from your code
  let rating: number = 0;
  let readmeContent: string = "";

  // Helper function to handle upload and optional debloating
  async function handleUpload(
    packageName: string,
    packageVersion: string,
    zipBuffer: Buffer,
    debloatVal: boolean
  ): Promise<{ returnString: string; s3Key: string }> {
    let finalBuffer = zipBuffer;
    let s3Key: string;

    if (debloatVal) {
      console.log("Debloating is enabled. Starting the debloating process...");
      finalBuffer = await debloatPackage(zipBuffer);
      console.log("Debloating completed successfully.");
      s3Key = `packages/${packageName}/v${packageVersion}/package.zip`;
    } else {
      s3Key = `packages/${packageName}/v${packageVersion}/package.zip`;
    }

    // Convert the Buffer to a base64 encoded string for the response
    const returnString = finalBuffer.toString("base64");

    // Prepare parameters for uploading to S3
    const s3Params = {
      Bucket: bucketName as string,
      Key: s3Key,
      Body: finalBuffer,
      ContentType: "application/zip",
    };

    console.log("Uploading package to S3 with key:", s3Key);
    // Upload the package content to S3
    await s3.putObject(s3Params).promise();
    console.log("Package uploaded to S3 successfully.");

    return { returnString, s3Key };
  }

  // Check that either 'Content' or 'URL' is provided, but not both or neither
  if ((!URL && !Content) || (URL && Content)) {
    console.error(
      "Invalid request body: 'Content' or 'URL' (exclusively) is required."
    );
    throw new CustomError(
      "Invalid request body. 'Content' or 'URL' (exclusively) is required.",
      400
    );
  } else {
    // If 'URL' is provided
    if (URL) {
      console.log("Processing package creation with URL");

      try {
        if (URL.includes("npmjs.com")) {
          URL = await convertNpmUrlToGitHubUrl(URL);
          console.log(`Converted npmjs.com URL to GitHub URL: ${URL}`);
        }
        if (URL.includes("github.com")) {
          // Extract repository owner and name from the GitHub URL
          const repoMatch = URL.match(
            /github\.com\/([^/]+)\/([^/]+)(?:\/blob\/[^/]+\/.+)?$/
          );
          if (!repoMatch)
            throw new CustomError("Invalid GitHub URL format", 400);
          const owner = repoMatch[1];
          const repo = repoMatch[2];

          // Retrieve package information from the repository's package.json
          const packageInfo = await getPackageInfoRepo(owner, repo);
          packageName = packageInfo.name;
          packageVersion = packageInfo.version || "1.0.0";
          console.log(
            `Retrieved packageName: ${packageName}, packageVersion: ${packageVersion}`
          );
        } else {
          throw new CustomError(
            "Unsupported URL format. Please provide a GitHub or npmjs.com URL.",
            400
          );
        }
      } catch (error: any) {
        console.error(
          "Error occurred in retrieving info from package.json using URL",
          error
        );
        throw new CustomError(
          `Failed to retrieve package info from package.json using URL: ${error.message}`,
          500
        );
      }
    }
    // If 'Content' is provided
    else if (Content) {
      console.log("Processing package creation with Content");
      try {
        // Retrieve package information from the provided zip file content
        const responseInfo = await getPackageInfoZipFile(Content);
        packageName = customName || responseInfo.name; // Use customName if provided
        packageVersion = responseInfo.version || "1.0.0";
        console.log(
          `Retrieved packageName: ${packageName}, packageVersion: ${packageVersion}`
        );
      } catch (error: any) {
        console.error(
          "Error occurred in retrieving info from package.json:",
          error
        );
        throw new CustomError(
          `Failed to retrieve package info from package.json`,
          500
        );
      }
    }

    if (!packageName) {
      console.error("Package name is missing.");
      throw new CustomError("Package name is missing.", 400);
    }

    // Validate package version format "x.y.z"
    if (!/^\d+\.\d+\.\d+$/.test(packageVersion || "")) {
      console.error("Package version is missing or invalid.");
      throw new CustomError("Package version is missing or invalid.", 400);
    }

    // Generate a unique numerical package ID based on name and version
    packageId = generateUniqueId(packageName, packageVersion as string);
    console.log(`Generated packageId: ${packageId}`);

    // Ensure that the S3 bucket name is defined
    if (!bucketName) {
      console.error(
        "S3_BUCKET_NAME is not defined in the environment variables."
      );
      throw new CustomError(
        "S3_BUCKET_NAME is not defined in the environment variables.",
        500
      );
    }

    // Check if the package already exists in the database
    if (await packageQueries.packageExists(packageId)) {
      console.error("Package already exists with ID:", packageId);
      throw new CustomError("Package already exists.", 409);
    }

    // Initialize variables for S3 upload
    let zipBuffer: Buffer = new Buffer("", "base64");

    if (Content && !URL) {
      console.log("Entered packageCreate service function with Content");
      console.log(
        "Received body:",
        JSON.stringify({
          Content: `${Content}`,
          debloat: `${debloatVal}`,
          JSProgram: `${JSProgram ?? null}`,
          customName: `${customName ?? null}`,
        })
      );

      try {
        // Decode the base64 encoded zip file to a Buffer
        contentBuffer = Buffer.from(Content, "base64");
        zipBuffer = contentBuffer;

        const packageExtractorInput = {
          Content,
          JSProgram,
          debloat: debloatVal,
          Name: customName,
        };

        const repoLink = await extractGithubRepoLink(packageExtractorInput);
        console.log(`Extracted repository link: ${repoLink}`);

        if (repoLink) {
          readmeContent = await extractReadme({ URL: repoLink });
          console.log(
            `Extracted README content FROM CONTENT: ${readmeContent.substring(
              0,
              100
            )}...`
          ); // Log a snippet of README
          console.log("Calculating metrics for the package...");
          metrics = await calculateMetrics(repoLink);
          rating = metrics.NetScore;
          console.log(`Calculated NetScore (rating): ${rating}`);
        } else {
          console.log("Repository link not found in package.json.");
        }
      } catch (error: any) {
        console.error(
          "Error occurred in packageCreate (Content Processing):",
          error
        );
        throw new CustomError(
          `Failed to process package content: ${error.message}`,
          500
        );
      }
    }
    // If 'URL' is provided (downloading from GitHub or npmjs.com)
    else if (URL && !Content) {
      console.log("Entered packageCreate service function with URL");
      console.log(
        "Received body:",
        JSON.stringify({
          URL: `${URL}`,
          debloat: `${debloatVal}`,
          JSProgram: `${JSProgram ?? null}`,
        })
      );

      try {
        console.log("Calculating metrics for the package...");
        metrics = await calculateMetrics(URL);
        rating = metrics.NetScore;
        console.log(`Calculated NetScore (rating): ${rating}`);

        if (rating < 0.5) {
          throw new CustomError(
            "Rating is below the acceptable threshold (0.5). Upload aborted.",
            400
          );
        }

        readmeContent = await extractReadme({ URL: URL }); // Extract README
        console.log(
          `Extracted README content from URL: ${readmeContent.substring(
            0,
            100
          )}...`
        ); // Log a snippet of README

        if (URL.includes("npmjs.com")) {
          URL = await convertNpmUrlToGitHubUrl(URL);
          console.log(`Converted npmjs.com URL to GitHub URL: ${URL}`);
        }
        if (URL.includes("github.com")) {
          // Extract repo owner and name
          const repoMatch = URL.match(
            /github\.com\/([^/]+)\/([^/]+)(?:\/blob\/[^/]+\/.+)?$/
          );
          if (!repoMatch)
            throw new CustomError("Invalid GitHub URL format", 400);
          const owner = repoMatch[1];
          const repo = repoMatch[2];
          const apiUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;

          console.log(`Downloading ZIP from GitHub: ${apiUrl}`);
          // Download the repository zip file
          zipBuffer = await downloadFile(apiUrl);
        } else {
          throw new CustomError(
            "Unsupported URL format. Please provide a GitHub or npmjs.com URL.",
            400
          );
        }
      } catch (error: any) {
        console.error(
          "Error occurred in packageCreate (URL Processing):",
          error
        );
        throw new CustomError(
          `Failed to process package from URL: ${error.message}`,
          500
        );
      }
    }

    // Handle upload and debloating
    try {
      const { returnString: uploadedReturn, s3Key } = await handleUpload(
        packageName,
        packageVersion as string,
        zipBuffer as Buffer,
        debloatVal
      );
      returnString = uploadedReturn;
    } catch (error: any) {
      console.error("Error during debloating and upload:", error);
      throw new CustomError(
        `Failed to debloat and upload package: ${error.message}`,
        500
      );
    }

    // Insert the package into the 'packages' table
    try {
      await packageQueries.insertPackageQuery(
        packageName,
        packageVersion as string,
        packageId,
        !URL // 'content_type' is true if 'URL' is not provided
      );
      console.log("Package information inserted into the 'packages' table.");

      // Insert metadata into the 'package_metadata' table
      await packageQueries.insertIntoMetadataQuery(
        packageName,
        packageVersion as string,
        packageId,
        readmeContent
      );
      console.log(
        "Package metadata inserted into the 'package_metadata' table."
      );

      // Insert additional data into the 'package_data' table
      await packageQueries.insertIntoPackageDataQuery(
        packageId,
        !URL, // 'content_type' is true if 'URL' is not provided
        URL,
        debloatVal,
        JSProgram
      );
      console.log("Package data inserted into the 'package_data' table.");

      // Insert metrics into the 'package_ratings' table if metrics are available
      if (metrics) {
        console.log("Inserting metrics into the 'package_ratings' table.");
        await packageQueries.insertIntoPackageRatingsQuery(packageId, metrics);
        console.log("Metrics inserted into the 'package_ratings' table.");
      }

      console.log("Package and metadata registered successfully.");

      // Prepare the response data
      const responseData: any = {
        Content: returnString,
        JSProgram: JSProgram,
      };

      // Include 'URL' in response if it was provided
      if (URL) {
        responseData.URL = URL;
      }

      // Construct the response object
      const response = {
        metadata: {
          Name: packageName,
          Version: packageVersion,
          ID: packageId,
        },
        data: responseData,
      };

      // Return the response object
      return response;
    } catch (error: any) {
      console.error(
        "Error occurred in packageCreate (Database Insertion):",
        error
      );
      throw new CustomError(
        `Failed to upload package or insert into database: ${error.message}`,
        500
      );
    }
  }
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
/*export function packageIdCostGET(
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
}*/
export async function packageIdCostGET(
  id: PackageID,
  dependency?: boolean
): Promise<{ [packageId: string]: PackageCostDetail }> {
  try {
    const { packageName, version } = await packageQueries.getPackageDetails(
      id.id
    );
    const costDetails = await calculateSize(
      packageName,
      version,
      dependency ?? false
    );
    return costDetails;
  } catch (error) {
    console.error("Error calculating package size:", error);
    const errorMessage = (error as Error).message;
    throw new CustomError(
      `Failed to calculate package size cost: ${errorMessage}`,
      500
    );
  }
}

/**
 * (BASELINE)
 * Get ratings for this package.
 *
 * @param id PackageID
 * @param xAuthorization AuthenticationToken
 * @returns Promise<PackageRating>
 */
export async function packageRate(
  id: PackageID,
  xAuthorization: AuthenticationToken
): Promise<PackageRating> {
  try {
    console.log(`ID inputted: ${id.id}`);
    const ratings = await packageQueries.getPackageRatings(id.id);
    if (!ratings) {
      console.error(`Package ratings not found for ID: ${id.id}`);
      throw new CustomError("Package ratings not found.", 404);
    }

    const response: PackageRating = {
      GoodPinningPractice: ratings.good_pinning_practice,
      CorrectnessLatency: ratings.correctness_latency,
      PullRequestLatency: ratings.pull_request_latency,
      RampUpLatency: ratings.ramp_up_latency,
      PullRequest: ratings.pull_request,
      LicenseScore: ratings.license_score,
      BusFactorLatency: ratings.bus_factor_latency,
      LicenseScoreLatency: ratings.license_score_latency,
      GoodPinningPracticeLatency: ratings.good_pinning_practice_latency,
      Correctness: ratings.correctness,
      ResponsiveMaintainerLatency: ratings.responsive_maintainer_latency,
      NetScoreLatency: ratings.net_score_latency,
      NetScore: ratings.net_score,
      ResponsiveMaintainer: ratings.responsive_maintainer,
      RampUp: ratings.ramp_up,
      BusFactor: ratings.bus_factor,
    };

    console.log(`Retrieved ratings for package ID ${id.id}:`, response);
    return response;
  } catch (error: any) {
    console.error("Error occurred in packageRate:", error);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError("Failed to retrieve package rating.", 500);
  }
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
    console.error(
      "S3_BUCKET_NAME is not defined in the environment variables."
    );
    throw new CustomError(
      "S3_BUCKET_NAME is not defined in the environment variables.",
      500
    );
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

    const metadataResult = await getDbPool().query(
      metadataQuery,
      metadataValues
    );
    const metadata = metadataResult.rows[0];

    if (!metadata) {
      console.error("Package not found with ID:", id);
      throw new CustomError("Package not found.", 404);
    }

    console.log("Metadata of the query: ", metadata);

    // Construct the S3 key to retrieve the zip file based on package_id
    //const s3Key = `packages/${packageId}/v${packageVersion}/package.zip`;
    const s3Key = `packages/${metadata.packagename}/v${metadata.packageversion}/package.zip`;
    const s3Params = {
      Bucket: bucketName,
      Key: s3Key,
    };

    // Fetch the package content from S3
    console.log("Fetching package content from S3 with key:", s3Key);
    const s3Object = await s3.getObject(s3Params).promise();
    const content = s3Object.Body ? s3Object.Body.toString("base64") : null;

    if (!content) {
      console.error(
        "Failed to retrieve package content from S3 for key:",
        s3Key
      );
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
export async function packageUpdate(
  id: string,
  Content?: string,
  URL?: string,
  debloat?: boolean,
  JSProgram?: string,
  customName?: string
) {
  let packageName: string | undefined;
  let packageVersion: string | undefined;
  let updatedPackageId: string | undefined;
  let contentBuffer: Buffer | undefined;
  const debloatVal = debloat ?? false;

  // Ensure either 'Content' or 'URL' is provided, but not both or neither
  if ((!URL && !Content) || (URL && Content)) {
    throw new CustomError(
      "Invalid input: Provide either 'Content' or 'URL', but not both.",
      400
    );
  }

  // Fetch the existing package details by ID
  const pool = getDbPool();
  const existingPackageQuery = `SELECT name, version, content_type FROM public.packages WHERE package_id = $1`;
  const existingPackageResult = await pool.query(existingPackageQuery, [id]);

  if (existingPackageResult.rows.length === 0) {
    throw new CustomError("Package not found.", 404);
  }

  const existingPackage = existingPackageResult.rows[0];
  const existingName = existingPackage.name;
  const existingVersion = existingPackage.version;
  const existingContentType = existingPackage.content_type;

  console.log(`Existing package details: ${JSON.stringify(existingPackage)}`);

  // Ensure update type matches the existing package
  if ((Content && !existingContentType) || (URL && existingContentType)) {
    throw new CustomError(
      `Invalid update type: Existing package was uploaded with ${
        existingContentType ? "Content" : "URL"
      }. Update must match the original type.`,
      400
    );
  }

  async function handleUpload(
    packageName: string,
    packageVersion: string,
    zipBuffer: Buffer,
    debloatVal: boolean
  ): Promise<{ s3Key: string }> {
    let finalBuffer = zipBuffer;
    let s3Key: string;

    if (debloatVal) {
      console.log("Debloating is enabled. Starting the debloating process...");
      finalBuffer = await debloatPackage(zipBuffer);
      console.log("Debloating completed successfully.");
    }

    s3Key = `packages/${packageName}/v${packageVersion}/package.zip`;

    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: s3Key,
      Body: finalBuffer,
      ContentType: "application/zip",
    };

    console.log("Uploading package to S3 with key:", s3Key);
    // Upload the package content to S3
    await s3.putObject(s3Params).promise();
    console.log("Package uploaded to S3 successfully.");

    return { s3Key };
  }

  // Process update with URL
  if (URL) {
    console.log("Processing package update with URL...");
    try {
      if (URL.includes("npmjs.com")) {
        URL = await convertNpmUrlToGitHubUrl(URL);
        console.log(`Converted npmjs.com URL to GitHub URL: ${URL}`);
      }
      if (URL.includes("github.com")) {
        // Extract repository owner and name from the GitHub URL
        const repoMatch = URL.match(
          /github\.com\/([^/]+)\/([^/]+)(?:\/blob\/[^/]+\/.+)?$/
        );
        if (!repoMatch) throw new CustomError("Invalid GitHub URL format", 400);
        const owner = repoMatch[1];
        const repo = repoMatch[2];

        // Retrieve package information from the repository's package.json
        const packageInfo = await getPackageInfoRepo(owner, repo);
        packageName = customName || packageInfo.name;
        packageVersion = packageInfo.version || "1.0.0";
        console.log(
          `Retrieved packageName: ${packageName}, packageVersion: ${packageVersion}`
        );
      } else {
        throw new CustomError(
          "Unsupported URL format. Provide GitHub or npmjs.com URL.",
          400
        );
      }

      // Download and upload package to S3
      console.log("Downloading package from URL...");
      const fileBuffer = await downloadFile(URL);
      await handleUpload(packageName!, packageVersion!, fileBuffer, debloatVal);
    } catch (error: any) {
      console.error("Error occurred while processing URL:", error);
      throw new CustomError(`Failed to process URL: ${error.message}`, 500);
    }
  }

  // Process update with Content
  if (Content) {
    console.log("Processing package update with Content...");
    try {
      // Retrieve package information from the provided zip file content
      const responseInfo = await getPackageInfoZipFile(Content);
      packageName = customName || responseInfo.name; // Use customName if provided
      packageVersion = responseInfo.version || "1.0.0";

      // Decode the base64 encoded zip file to a Buffer
      contentBuffer = Buffer.from(Content, "base64");

      // Upload package to S3
      await handleUpload(
        packageName!,
        packageVersion!,
        contentBuffer,
        debloatVal
      );
    } catch (error: any) {
      console.error("Error occurred while processing Content:", error);
      throw new CustomError(`Failed to process Content: ${error.message}`, 500);
    }
  }

  if (
    !packageName ||
    !packageVersion ||
    !/^\d+\.\d+\.\d+$/.test(packageVersion)
  ) {
    throw new CustomError("Invalid package name or version.", 400);
  }

  // Validate the version update
  if (!compareVersions(packageVersion, existingVersion)) {
    throw new CustomError(
      `Invalid version update: Existing version is ${existingVersion}. Update must not be a lower patch version.`,
      400
    );
  }

  // Generate a new package ID for the updated package
  updatedPackageId = generateUniqueId(packageName, packageVersion);
  console.log(`Generated new package ID: ${updatedPackageId}`);

  // Update metadata and data in the database
  try {
    const readmeContent = await extractReadme({ URL: URL ?? "" });
    console.log(
      `Extracted README content: ${readmeContent.substring(0, 100)}...`
    ); // Log a snippet of README

    const metrics = await calculateMetrics(URL ?? "");
    const rating = metrics?.NetScore || 0;

    await updatePackageMetadata(updatedPackageId, packageName, packageVersion);
    await updatePackageData(
      updatedPackageId,
      Content ? true : false,
      debloatVal,
      JSProgram,
      URL
    );

    // Insert metrics if available
    if (metrics) {
      await packageQueries.insertIntoPackageRatingsQuery(
        updatedPackageId,
        metrics
      );
      console.log("Metrics inserted into the 'package_ratings' table.");
    }

    console.log("Package metadata and data updated successfully.");
  } catch (error: any) {
    console.error("Error occurred during database update:", error);
    throw new CustomError(
      `Failed to update package in database: ${error.message}`,
      500
    );
  }
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
              throw new CustomError(`Invalid version format: ${version}`, 400);
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
export function tracksGET(xAuthorization: AuthenticationToken): any {
  console.log("Entered tracksGET function");

  const examples: { [key: string]: any } = {
    "application/json": {
      plannedTracks: ["Access control track"],
    },
  };
  return examples["application/json"];
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

export async function populatePackages(
  xAuthorization: AuthenticationToken
): Promise<any> {
  try {
    // Define the package URLs to populate
    const urls = [
      "https://www.npmjs.com/package/browserify",
      "https://github.com/nullivex/nodist",
    ];

    // Map each URL to a promise, correctly passing positional parameters
    const packagePromises = urls.map(async (url) => {
      try {
        // Call packageCreate with undefined for Content and pass URL as the second parameter
        const result = await packageCreate(
          undefined,
          url,
          false,
          undefined,
          undefined
        );
        return { url, success: true, result };
      } catch (error: any) {
        console.error(`Error creating package for URL ${url}:`, error);
        return { url, success: false, error: error.message };
      }
    });

    // Execute all package creation promises concurrently
    const results = await Promise.all(packagePromises);

    // Log success and return the results
    console.log(`Added links successfully`);
    return results; // Ensure that results are returned for the controller to handle
  } catch (error: any) {
    console.error("Error in populatePackages service function:", error);
    throw error; // Re-throw the error to be handled by the controller
  }
}

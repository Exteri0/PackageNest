/*
THIS IS SERVICE FOR THE CONTROLLER FILE. IT CONTAINS THE FUNCTIONS THAT WILL BE CALLED BY THE CONTROLLER FILE.

*/

"use strict";

import { Request, Response, NextFunction, response } from "express";
import * as https from "https";
import awsSdk from "aws-sdk";
import axios from "axios";
import { executeSqlFile } from "../queries/resetDB.js";
import safeRegex from "safe-regex";
import "dotenv/config";
import { getDbPool } from "./databaseConnection.js";
import * as packageQueries from "../queries/packageQueries.js";
import { calculateMetrics } from "../Metrics/metricExport.js";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
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
  deleteUserById,
} from "../queries/userQueries.js";
import {
  getPackageInfoZipFile,
  getPackageInfoRepo,
  downloadFile,
  convertTarballToZipBuffer,
} from "../utils/retrievePackageJson.js";

import deescapeString from "../utils/deescape.js";

import {
  extractReadme, // Import the README extraction function
} from "../utils/readmeExtractor.js"; // Adjust the path if necessary
import { get } from "http";
import { version } from "os";
const execFileAsync = promisify(execFile);


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
  packages: PackageMetadata[];
  nextOffset: number | null;
}

export interface PackageData {
  ID: string;
  contentType: boolean;
  Name: string;
  Version: string;
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

export function deleteUser(id: number): Promise<any> {
  return new Promise(async function (resolve, reject) {
    try {
      const result = await deleteUserById(id);
      resolve(result);
    } catch (error) {
      console.error("Error occurred in deleteSelf:", error);
      reject(new CustomError(`Failed to delete user`, 500));
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
      const deEscapedPassword = deescapeString(body.Secret.password);
      const foundUser = await getUserByUsername(body.User.name);
      if (foundUser) {
        console.log("Found user:", foundUser);
        const validPassword = await bcrypt.compare(
          deEscapedPassword,
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
  console.log("Received body:", JSON.stringify(body, null, 2));
  console.log(
    "Received xAuthorization:",
    JSON.stringify(xAuthorization, null, 2)
  );

  // Validate request body
  if (!body || !body.RegEx) {
    console.error("Invalid request body: 'RegEx' is required.");
    throw new CustomError("Invalid request body. 'RegEx' is required.", 400);
  }
  const regexPattern = body.RegEx;

  const emptyString = "";
  const match = emptyString.match(regexPattern);
  console.log(`Matching gives: ${JSON.stringify(match)}`);

  if (match !== null) {
    // The regex matches the empty string
    console.log("Regex matches the empty string. Throwing 404 error.");
    throw new CustomError("Regex matches the empty string.", 404);
  }

  // Check if the regex is safe using safe-regex library
  if (!safeRegex(regexPattern)) {
    console.error("Provided regex is potentially unsafe or too complex.");
    throw new CustomError(
      "Provided regular expression is unsafe or too complex.",
      400
    );
  }

  // Enforce a maximum length for the regex pattern
  const maxRegexLength = 100; // Adjust as needed
  if (regexPattern.length > maxRegexLength) {
    console.error(`RegEx pattern too long: ${regexPattern.length} characters.`);
    throw new CustomError(
      `RegEx pattern too long. Maximum allowed length is ${maxRegexLength} characters.`,
      400
    );
  }

  try {
    // Pre-check regex validity by executing a safe test query
    await getDbPool().query("SELECT 'test' ~* $1", [regexPattern]);
  } catch (preCheckError: any) {
    console.error("Regex pre-check failed:", preCheckError);
    throw new CustomError("Invalid regular expression.", 400);
  }

  try {
    // SQL query to search both package names and READMEs using the same RegEx
    const regexQuery = `
      SELECT p.name AS name, p.version AS version, p.package_id AS package_id
      FROM public.packages p
      LEFT JOIN public.package_metadata pm ON p.package_id = pm.package_id
      WHERE p.name ~* $1 OR pm.readme ~* $1
    `;
    const regexValues = [regexPattern];

    // Execute the main query with a statement timeout to prevent hanging
    const result = await getDbPool().query({
      text: regexQuery,
      values: regexValues,
    });

    if (result.rows.length === 0) {
      console.log("No packages matched the provided regular expression.");
      throw new CustomError("No package found under this regex.", 404);
    }

    // Format the response
    const response = result.rows.map((row: any) => ({
      Name: row.name,
      Version: row.version,
      ID: row.package_id,
    }));

    console.log(
      "Returning matched packages:",
      JSON.stringify(response, null, 2)
    );
    return response;
  } catch (error: any) {
    console.error("Error occurred in packageByRegExGet:", error);

    if (error instanceof CustomError) {
      throw error; // Re-throw CustomErrors to be handled by the controller
    }

    // For all other errors, respond with a generic bad request
    throw new CustomError(`Invalid request: ${error.message}`, 400);
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
  User: string,
  Content?: string,
  URL?: string,
  debloat?: boolean,
  JSProgram?: string,
  customName?: string
  // Added customName parameter
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
      console.log("Debloating is disabled. Skipping the debloating process.");
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
            `Retrieved packageName From URL: ${packageName}, packageVersion: ${packageVersion}`
          );
        } else {
          throw new CustomError(
            "Unsupported URL format. Please provide a GitHub or npmjs.com URL.",
            400
          );
        }
      } catch (error: any) {
        if (error instanceof CustomError) {
          throw error;
        } else {
          throw new CustomError(
            `Failed to retrieve package info from URL: ${error.message}`,
            500
          );
        }
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
      console.log("Package version is missing or invalid., setting to 1.0.0");
      packageVersion = "1.0.0";
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
            424
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
        if (error instanceof CustomError) {
          throw error;
        } else {
          throw new CustomError(
            `Failed to process package URL: ${error.message}`,
            500
          );
        }
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

      //Insert into history table
      console.log(
        "Inserting package history into the 'package_history' table."
      );
      await packageQueries.insertIntoPackageHistory(packageId, User, "CREATE");

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
        JSProgram: JSProgram ?? null,
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
    console.log(`ID inputted: ${id.id}`);
    console.log("Checking if package exists");
    const packageExists = await packageQueries.packageExists(id.id);
    if (!packageExists) {
      console.error(`Package not found with ID: ${id.id}`);
      throw new CustomError("Package not found.", 404);
    }
    const { packageName, version } = await packageQueries.getPackageDetails(
      id.id
    );
    const costDetails = await calculateSize(
      packageName,
      version,
      dependency ?? false
    );
    return costDetails;
  } catch (error: any) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError("Failed to calculate package cost.", 500);
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
 * Executes the provided JSProgram with the given arguments.
 * 
 * @param jsProgram - The JavaScript code to execute.
 * @param args - Array of command-line arguments.
 * @returns An object containing stdout and exitCode.
 * @throws CustomError if execution fails.
 */
async function executeJSProgram(jsProgram: string, args: string[]): Promise<{ stdout: string; exitCode: number }> {
  // Create a temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jsprog-'));
  
  try {
    const jsFilePath = path.join(tempDir, 'jsprog.js');
    console.log(`Hello I just entered, write path is: ${jsFilePath}`)
    // Write the JSProgram to a temporary file
    await fs.writeFile(jsFilePath, jsProgram, { encoding: 'utf-8', mode: 0o700 });
    
    // Execute the JSProgram using Node.js v22
    const nodePath = '/usr/bin/node'; 
    console.log(`The nodePath is: ${nodePath}`)
    console.log(`The jsFilePath: ${jsFilePath}`)
    console.log(`The arguments: ${args}`)
    const { stdout } = await execFileAsync(nodePath, [jsFilePath, ...args], { cwd: tempDir, timeout: 20000 }); 
    console.log(`The stdout from executeJSProg gives: ${stdout}`)
    
    // JSProgram executed successfully
    return { stdout, exitCode: 0 };
  } catch (error: any) {
    if (error.code === 'ETIMEDOUT') {
      throw new CustomError("JSProgram execution timed out.", 400);
    }
    // If the JSProgram exited with a non-zero code
    if (error.code !== undefined) {
      return { stdout: error.stdout || '', exitCode: error.code };
    }
    throw new CustomError("Failed to execute JSProgram.", 400);
  } finally {
    // Cleanup: Remove the temporary directory and its contents
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Retrieves a package, executes associated JSProgram (if any), and returns the package data.
 * 
 * @param xAuthorization - AuthenticationToken
 * @param id - Package ID
 * @param user - Downloader's username
 * @returns The package data or throws an error.
 */
export async function packageRetrieve(
  xAuthorization: AuthenticationToken,
  id: string,
  user: string
): Promise<Package> {
  console.log("Entered packageRetrieve function with ID:", id);
  console.log("Received xAuthorization:", JSON.stringify(xAuthorization, null, 2));
  console.log("Downloader Username:", user);

  if (!bucketName) {
    console.error("S3_BUCKET_NAME is not defined in the environment variables.");
    throw new CustomError(
      "S3_BUCKET_NAME is not defined in the environment variables.",
      500
    );
  }

  try {
    // Retrieve package metadata from the packages and package_data tables using the provided ID
    const metadataQuery = `
      SELECT 
        p.name AS packagename, 
        p.version AS packageversion, 
        p.package_id AS packageid,
        pd.url AS packageurl, 
        pd.js_program AS packagejs, 
        p.content_type
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

    // Log the entire metadata object for debugging
    console.log(
      `Metadata returned from packageRetrieve: ${JSON.stringify(
        metadata,
        null,
        2
      )}`
    );

    if (!metadata) {
      console.error("Package not found with ID:", id);
      throw new CustomError("Package not found.", 404);
    }

    // Check if there is an associated JSProgram
    if (metadata.packagejs) {
      console.log("JSProgram found for this package. Executing JSProgram...");

      // Retrieve Uploader Username using the new function
      const uploaderUsername = await packageQueries.getPackageUploader(id);
      console.log("Uploader Username:", uploaderUsername);

      // Downloader Username is passed as 'user' parameter
      const downloaderUsername = user;
      console.log("Downloader Username:", downloaderUsername);

      // Determine the ZIP file path
      // Download the package ZIP from S3 to a temporary location
      const s3Key = `packages/${metadata.packagename}/v${metadata.packageversion}/package.zip`;
      const s3Params = {
        Bucket: bucketName!,
        Key: s3Key,
      };

      console.log("Fetching package content from S3 with key:", s3Key);
      const s3Object = await s3.getObject(s3Params).promise();
      const zipContent = s3Object.Body as Buffer;

      // Create a temporary file to store the ZIP
      const tempZipDir = await fs.mkdtemp(path.join(os.tmpdir(), 'package-'));
      const tempZipPath = path.join(tempZipDir, 'package.zip');

      await fs.writeFile(tempZipPath, zipContent);
      console.log(`Package ZIP downloaded to temporary path: ${tempZipPath}`);

      // Execute the JSProgram with the required arguments
      const jsProgram = metadata.packagejs;
      const moduleName = metadata.packagename;
      const moduleVersion = metadata.packageversion;
      const zipFilePath = tempZipPath;

      const args = [
        moduleName,
        moduleVersion,
        uploaderUsername,
        downloaderUsername,
        zipFilePath,
      ];

      console.log("Executing JSProgram with arguments:", args);

      const { stdout, exitCode } = await executeJSProgram(jsProgram, args);
      console.log("JSProgram executed with exit code:", exitCode);
      console.log("JSProgram stdout:", stdout);

      if (exitCode !== 0) {
        // JSProgram indicates failure, reject the download
        throw new CustomError(`JSProgram execution failed: ${stdout}`, 400);
      }

      // Cleanup: Remove the temporary ZIP file
      await fs.rm(tempZipDir, { recursive: true, force: true });
      console.log("Temporary ZIP file cleaned up after JSProgram execution.");
    }

    // Proceed to fetch the package content from S3
    const finalS3Key = `packages/${metadata.packagename}/v${metadata.packageversion}/package.zip`;
    const finalS3Params = {
      Bucket: bucketName!,
      Key: finalS3Key,
    };

    console.log("Fetching package content from S3 with key:", finalS3Key);
    const finalS3Object = await s3.getObject(finalS3Params).promise();
    const finalContent = finalS3Object.Body ? finalS3Object.Body.toString("base64") : null;

    if (!finalContent) {
      console.error("Failed to retrieve package content from S3 for key:", finalS3Key);
      throw new CustomError("Package content not found in S3.", 404);
    }

    // Prepare the response in the desired format
    const response: Package = {
      metadata: {
        Name: metadata.packagename,
        Version: metadata.packageversion,
        ID: metadata.packageid,
      },
      data: {
        Content: finalContent, // Base64 encoded zip content
        JSProgram: metadata.packagejs ? metadata.packagejs : null, // Set to null if undefined
        debloat: metadata.content_type, // Assuming 'content_type' indicates debloat status
        URL: metadata.packageurl ? metadata.packageurl : null,
      },
    };

    // Insert into history table
    console.log("Inserting into package history table: DOWNLOAD action");
    await packageQueries.insertIntoPackageHistory(id, user, "DOWNLOAD");

    console.log("Returning package data:", JSON.stringify(response, null, 2));
    return response;
  } catch (error: any) {
    console.error("Error occurred in packageRetrieve:", error);
    if (error instanceof CustomError) {
      throw error; // Re-throw CustomErrors to be handled by the controller
    }
    throw new CustomError(`Failed to retrieve package: ${error.message}`, 500);
  }
}

export async function packageUpdate(
  user: string,
  idParam: string,
  metadataName?: string,
  Version?: string,
  metadataID?: string,
  dataName?: string,
  Content?: string,
  URL?: string,
  debloat?: boolean,
  JSProgram?: string
) {
  let packageName: string | undefined;
  let packageVersion: string | undefined;
  let updatedPackageId: string | undefined;
  let contentBuffer: Buffer | undefined;
  let apiUrl: string | undefined;
  const debloatVal = debloat ?? false;

  // Fetch the existing package details by ID
  console.log(`[INFO] Fetching existing package details for ID: ${idParam}...`);
  const existingPackageResult = await packageQueries.packageExists(idParam);
  console.log(
    `[INFO] Existing package fetched: ${JSON.stringify(existingPackageResult)}`
  );
  if (!existingPackageResult) {
    const errorMessage = `Package with ID ${idParam} not found.`;
    console.error(`[ERROR] ${errorMessage}`);
    throw new CustomError(errorMessage, 404);
  } else if (
    typeof existingPackageResult !== "boolean" &&
    existingPackageResult.Name == metadataName &&
    existingPackageResult.Version == Version
  ) {
    const errorMessage = `Package with ID ${idParam} already exists with the same name and version.`;
    console.error(`[ERROR] ${errorMessage}`);
    throw new CustomError(errorMessage, 409);
  }

  // Ensure either 'Content' or 'URL' is provided, but not both or neither
  if ((!URL && !Content) || (URL && Content)) {
    const errorMessage =
      "Invalid input: Provide either 'Content' or 'URL', but not both.";
    console.error(`[ERROR] ${errorMessage}`);
    throw new CustomError(errorMessage, 400);
  }

  if (!metadataName || !metadataID || !Version) {
    throw new CustomError(
      "Invalid input: 'metadataName', 'metadataID', and 'Version' are required.",
      400
    );
  }

  const existingPackage = existingPackageResult as PackageData;
  const existingName = existingPackage.Name;
  if (existingName !== metadataName || idParam !== metadataID) {
    const errorMessage = `Invalid package name in metadata or non-matching IDs for ${idParam}.`;
    console.error(`[ERROR] ${errorMessage}`);
    throw new CustomError(errorMessage, 400);
  }

  const existingVersion = existingPackage.Version;
  const existingContentType = existingPackage.contentType;
  console.log(
    `[INFO] Existing package details: Name=${existingName}, Version=${existingVersion}, ContentType=${existingContentType}`
  );

  // Ensure update type matches the existing package
  if ((Content && !existingContentType) || (URL && existingContentType)) {
    const errorMessage = `Invalid update type: Existing package was uploaded with ${
      existingContentType ? "Content" : "URL"
    }. Update must match the original type.`;
    console.error(`[ERROR] ${errorMessage}`);
    throw new CustomError(errorMessage, 400);
  }

  console.log("Starting compareVersions");
  // Validate the version update

  async function handleUpload(
    packageName: string,
    packageVersion: string,
    zipBuffer: Buffer,
    debloatVal: boolean
  ): Promise<{ s3Key: string }> {
    let finalBuffer = zipBuffer;
    let s3Key: string;

    if (debloatVal) {
      console.log(
        `[INFO] Debloating is enabled. Starting the debloating process...`
      );
      finalBuffer = await debloatPackage(zipBuffer);
      console.log(`[INFO] Debloating completed successfully.`);
    }

    s3Key = `packages/${packageName}/v${packageVersion}/package.zip`;
    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: s3Key,
      Body: finalBuffer,
      ContentType: "application/zip",
    };

    console.log(`[INFO] Uploading package to S3 with key: ${s3Key}`);
    try {
      await s3.putObject(s3Params).promise();
      console.log(`[INFO] Package uploaded to S3 successfully.`);
    } catch (err) {
      console.error(`[ERROR] S3 upload failed: ${err}`);
      throw new CustomError(`S3 upload failed: ${err}`, 500);
    }

    return { s3Key };
  }

  // Process update with URL
  if (URL) {
    console.log(`[INFO] Processing package update with URL: ${URL}...`);
    try {
      if (URL.includes("npmjs.com")) {
        URL = await convertNpmUrlToGitHubUrl(URL);
        console.log(`[INFO] Converted npmjs.com URL to GitHub URL: ${URL}`);
      }
      if (URL.includes("github.com")) {
        const repoMatch = URL.match(
          /github\.com\/([^/]+)\/([^/]+)(?:\/blob\/[^/]+\/.+)?$/
        );
        if (!repoMatch) throw new CustomError("Invalid GitHub URL format", 400);
        const owner = repoMatch[1];
        const repo = repoMatch[2];
        apiUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;

        packageName = dataName;
        packageVersion = Version || "1.0.0";
        console.log(
          `[INFO] Retrieved packageName: ${packageName}, packageVersion: ${packageVersion}`
        );
      } else {
        throw new CustomError(
          "Unsupported URL format. Provide GitHub or npmjs.com URL.",
          400
        );
      }

      if (!compareVersions(packageVersion, existingVersion)) {
        throw new CustomError(
          `Invalid version update: Existing version is ${existingVersion}. Update must be a newer patch version.`,
          400
        );
      }

      console.log(`[INFO] Downloading package from URL: ${apiUrl}...`);
      let fileBuffer: Buffer = await downloadFile(apiUrl);
      await handleUpload(packageName!, packageVersion!, fileBuffer, debloatVal);
    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      console.error(`[ERROR] Error occurred while processing URL: ${error}`);
      throw new CustomError(`Failed to process URL: ${error.message}`, 500);
    }
  }

  // Process update with Content
  if (Content) {
    console.log(`[INFO] Processing package update with provided content...`);
    try {
      const responseInfo = await getPackageInfoZipFile(Content);
      packageName = dataName || responseInfo.name; // Use customName if provided
      packageVersion = Version || responseInfo.version || "1.0.0";
      console.log(
        `[INFO] Package info retrieved from zip file: Name=${packageName}, Version=${packageVersion}`
      );

      if (!compareVersions(packageVersion, existingVersion)) {
        throw new CustomError(
          `Invalid version update: Existing version is ${existingVersion}. Update must be a newer patch version.`,
          400
        );
      }

      contentBuffer = Buffer.from(Content, "base64");

      console.log(`[INFO] Uploading package content to S3...`);
      await handleUpload(
        packageName!,
        packageVersion!,
        contentBuffer,
        debloatVal
      );
    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      console.error(
        `[ERROR] Error occurred while processing content: ${error}`
      );
      throw new CustomError(`Failed to process content: ${error.message}`, 500);
    }
  }

  if (
    !packageName ||
    !packageVersion ||
    !/^\d+\.\d+\.\d+$/.test(packageVersion)
  ) {
    throw new CustomError("Invalid package name or version.", 400);
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

    await packageQueries.insertPackageQuery(
      packageName,
      packageVersion,
      updatedPackageId,
      !URL
    );
    await updatePackageMetadata(updatedPackageId, packageName, packageVersion);
    await updatePackageData(
      updatedPackageId,
      Content ? true : false,
      debloatVal,
      JSProgram,
      URL
    );
    console.log("Inserting into history table");
    await packageQueries.insertIntoPackageHistory(
      existingPackage.ID,
      user,
      "UPDATE"
    );

    console.log("Inserting new package into history table");
    await packageQueries.insertIntoPackageHistory(
      updatedPackageId,
      user,
      "CREATE"
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
    if (error instanceof CustomError) {
      throw error;
    }
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
  console.log(
    "Authentication token:",
    xAuthorization?.token || "None provided"
  );
  console.log("Raw request body:", JSON.stringify(body));
  console.log("Offset:", offset);

  const limit = 10;
  const offsetValue = offset ? parseInt(offset, 10) : 0;

  try {
    let queryParams: any[] = [];
    let whereClauses: string[] = [];
    let packageConditions: string[] = [];

    if (body && body.length > 0) {
      if (body.length === 1 && body[0].Name === "*") {
        console.log("Selecting all packages (no filtering conditions).");
      } else {
        console.log("Processing package queries...");
        let queryIndex = 1;

        for (const pkgQuery of body) {
          console.log("Processing pkgQuery:", pkgQuery);
          const conditions: string[] = [];
          const queryValues: any[] = [];

          // Validate Version format if provided
          if (pkgQuery.Version) {
            const versionFormats = [
              /^\d+\.\d+\.\d+$/, // Exact version
              /^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/, // Bounded range
              /^\^\d+\.\d+\.\d+$/, // Carat notation
              /^~\d+\.\d+\.\d+$/, // Tilde notation
            ];
            const matches = versionFormats.filter((regex) =>
              regex.test(pkgQuery.Version!)
            );
            if (matches.length !== 1) {
              console.error(
                `Invalid or ambiguous version format: ${pkgQuery.Version}`
              );
              throw new CustomError(
                "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid.",
                400
              );
            }
          }

          // Handle Name (if not wildcard)
          if (pkgQuery.Name && pkgQuery.Name !== "*") {
            conditions.push(`name = $${queryIndex}`);
            queryValues.push(pkgQuery.Name);
            queryIndex++;
          }

          // Handle ID (maps to package_id in DB)
          if (pkgQuery.ID) {
            conditions.push(`package_id = $${queryIndex}`);
            queryValues.push(pkgQuery.ID);
            queryIndex++;
          }

          // Handle Version
          if (pkgQuery.Version) {
            const version = pkgQuery.Version.trim();
            if (/^\d+\.\d+\.\d+$/.test(version)) {
              // Exact
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
              console.error(`Invalid version format: ${version}`);
              throw new CustomError(
                "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid.",
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
          // 'OR' relationship between queries
          whereClauses.push(packageConditions.join(" OR "));
        }
      }
    }

    console.log("Final WHERE clauses:", whereClauses);
    console.log("Final query parameters:", queryParams);

    const dbPackages = await packageQueries.getPackages(
      whereClauses,
      queryParams,
      limit,
      offsetValue
    );

    console.log(
      "Packages returned from DB:",
      JSON.stringify(dbPackages, null, 2)
    );

    const nextOffset = dbPackages.length === limit ? offsetValue + limit : null;

    // Transform DB rows to required format
    const transformedPackages = dbPackages.map((pkg) => ({
      Version: pkg.Version,
      Name: pkg.Name,
      ID: pkg.ID,
    })) as PackageMetadata[];

    console.log(
      "Transformed packages to required format:",
      JSON.stringify(transformedPackages, null, 2)
    );
    console.log("Next offset:", nextOffset);

    return {
      packages: transformedPackages,
      nextOffset,
    };
  } catch (error) {
    console.error(
      "Error in packagesList:",
      error instanceof Error ? error.message : error
    );
    if (error instanceof CustomError) {
      throw error;
    } else {
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
          Name: "this is modified",
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
          "1",
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

export async function getHistory(
  id: string
): Promise<{ user_name: string; action: string; timestamp: string }[]> {
  try {
    const history = await packageQueries.getPackageHistory(id);
    return history;
  } catch (error: any) {
    if (error instanceof CustomError) {
      throw error;
    } else {
      throw new CustomError("Failed to retrieve package history.", 500);
    }
  }
}

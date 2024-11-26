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
import { calculateSize } from "../service/packageUtils.js";
import { CustomError, PackageCostDetail } from "../utils/types.js";
import { extractGithubRepoLink } from "../utils/packageExtractor.js"; // Import the extractor
import * as crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  createUser,
  getAllUsers,
  getUserByUsername,
} from "../queries/userQueries.js";
import {
  getPackageInfoZipFile,
  getPackageInfoRepo,
  downloadFile,
  convertTarballToZipBuffer
} from "../utils/retrievePackageJson.js";

import {
  extractReadme, // Import the README extraction function
} from "../utils/readmeExtractor.js"; // Adjust the path if necessary


const bucketName = process.env.S3_BUCKET_NAME;
const s3 = new awsSdk.S3(
  {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    region: 'us-east-2', // Replace with your region
  }
);

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
        const validPassword = await bcrypt.compare(
          body.Secret.password,
          foundUser.password_hash
        );
        if (validPassword) {
          const token = jwt.sign(
            {
              name: body.User.name,
              isAdmin: body.User.isAdmin,
              isBackend: body.User.isBackend,
            },
            process.env.JWT_SECRET ?? "defaultSecret",
            {
              expiresIn: "10h",
            }
          );
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
 * Generates a unique numerical ID based on package name and version.
 * The ID is stored as a string.
 * @param {string} name - Package name
 * @param {string} version - Package version in "x.y.z" format
 * @returns {string} - Unique ID as a string
 */
function generateUniqueId(name: string, version: string): string {
  // Create a SHA-256 hash of the name and version
  const hash = crypto.createHash("sha256").update(`${name}@${version}`).digest("hex");

  // Convert the first 12 characters of the hash to a numerical string
  const numericId = BigInt("0x" + hash.slice(0, 12)).toString();

  return numericId;
}

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

  let metrics: any = null;
  let rating: number = 0;
  let readmeContent: string = '';

  // Check that either 'Content' or 'URL' is provided, but not both or neither
  if ((!URL && !Content) || (URL && Content)) {
    console.error("Invalid request body: 'Content' or 'URL' (exclusively) is required.");
    throw new CustomError(
      "Invalid request body. 'Content' or 'URL' (exclusively) is required.",
      400
    );
  } else {
    // If 'URL' is provided
    if (URL) {
      console.log("Processing package creation with URL");

      try {
        if (URL.includes("github.com")) {
          // Extract repository owner and name from the GitHub URL
          const repoMatch = URL.match(/github\.com\/([^/]+)\/([^/]+)(?:\/blob\/[^/]+\/.+)?$/);
          if (!repoMatch) throw new CustomError("Invalid GitHub URL format", 400);
          const owner = repoMatch[1];
          const repo = repoMatch[2];

          // Retrieve package information from the repository's package.json
          const packageInfo = await getPackageInfoRepo(owner, repo);
          packageName = packageInfo.name;
          packageVersion = packageInfo.version || "1.0.0";
          console.log(`Retrieved packageName: ${packageName}, packageVersion: ${packageVersion}`);
        } else if (URL.includes("npmjs.com")) {
          // Extract package name from npmjs.com URL
          const packageNameMatch = URL.match(/npmjs\.com\/package\/([^/]+)/);
          if (!packageNameMatch) throw new CustomError("Invalid npmjs.com URL format", 400);
          const packageNameFromURL = packageNameMatch[1];

          // Assuming latest version; alternatively, allow specifying version
          const packageInfo = await getPackageInfoRepo(packageNameFromURL, ""); // Adjust if necessary
          packageName = packageInfo.name;
          packageVersion = packageInfo.version || "1.0.0";
          console.log(`Retrieved packageName: ${packageName}, packageVersion: ${packageVersion}`);
        } else {
          throw new CustomError("Unsupported URL format. Please provide a GitHub or npmjs.com URL.", 400);
        }
      } catch (error: any) {
        console.error("Error occurred in retrieving info from package.json using URL", error);
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
        console.log(`Retrieved packageName: ${packageName}, packageVersion: ${packageVersion}`);
      } catch (error: any) {
        console.error("Error occurred in retrieving info from package.json:", error);
        throw new CustomError(`Failed to retrieve package info from package.json`, 500);
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
      console.error("S3_BUCKET_NAME is not defined in the environment variables.");
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

    // If 'Content' is provided (uploading a zip file directly)
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
        returnString = Content; // Keep the original base64 string for the response
        
        const packageExtractorInput: InputPackage = {
          Content,
          JSProgram,
          debloat: debloatVal,
          Name: customName,
        };

        const repoLink = await extractGithubRepoLink(packageExtractorInput);
        console.log(`Extracted repository link: ${repoLink}`);

        if (repoLink) {
          readmeContent = await extractReadme({ URL: repoLink });
          console.log(`Extracted README content FROM CONTENT: ${readmeContent.substring(0, 100)}...`); // Log a snippet of README
          console.log("Calculating metrics for the package...");
          metrics = await calculateMetrics(repoLink);
          rating = metrics.NetScore;
          console.log(`Calculated NetScore (rating): ${rating}`);
        } else {
          console.log("Repository link not found in package.json.");
        }

        // Define the S3 key (path) for storing the package
        const s3Key = `packages/${packageName}/v${packageVersion}/package.zip`;

        // Prepare parameters for uploading to S3
        const s3Params = {
          Bucket: bucketName,
          Key: s3Key,
          Body: contentBuffer, // Upload the decoded zip file
          ContentType: "application/zip",
        };

        console.log("Uploading package to S3 with key:", s3Key);
        // Upload the package content to S3
        await s3.putObject(s3Params).promise();
        console.log("Package uploaded to S3 successfully.");
      } catch (error: any) {
        console.error("Error occurred in packageCreate (S3 Upload):", error);
        throw new CustomError(`Failed to upload content to S3`, 500);
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

      // Define variables for S3 upload
      let downloadBuffer: Buffer;
      let zipBuffer: Buffer;

      try {
        console.log("Calculating metrics for the package...");
        metrics = await calculateMetrics(URL);
        rating = metrics.NetScore;
        console.log(`Calculated NetScore (rating): ${rating}`);

        if (rating < 0.5) {
          throw new CustomError("Rating is below the acceptable threshold (0.5). Upload aborted.", 400);
        }

        readmeContent = await extractReadme({URL : URL}); // Added line to extract README
        console.log(`Extracted README content from URL: ${readmeContent.substring(0, 100)}...`); // Log a snippet of README


        if (URL.includes("github.com")) {
          // Extract repo owner and name
          const repoMatch = URL.match(/github\.com\/([^/]+)\/([^/]+)(?:\/blob\/[^/]+\/.+)?$/);
          if (!repoMatch) throw new CustomError("Invalid GitHub URL format", 400);
          const owner = repoMatch[1];
          const repo = repoMatch[2];
          const apiUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;

          console.log(`Downloading ZIP from GitHub: ${apiUrl}`);
          // Download the repository zip file
          downloadBuffer = await downloadFile(apiUrl);
          zipBuffer = downloadBuffer; // GitHub provides ZIP directly
        } else if (URL.includes("npmjs.com")) {
          // Extract package name from npmjs.com URL
          const packageNameMatch = URL.match(/npmjs\.com\/package\/([^/]+)/);
          if (!packageNameMatch) throw new CustomError("Invalid npmjs.com URL format", 400);
          const packageNameFromURL = packageNameMatch[1];

          // Fetch package metadata from npm registry
          const registryUrl = `https://registry.npmjs.org/${packageNameFromURL}`;
          const registryResponse = await axios.get(registryUrl);
          const latestVersion = registryResponse.data["dist-tags"].latest;
          const tarballUrl = registryResponse.data.versions[latestVersion].dist.tarball;

          console.log(`Downloading tarball from npm registry: ${tarballUrl}`);
          // Download the tarball
          const tarballBuffer = await downloadFile(tarballUrl);

          console.log("Converting tarball to ZIP");
          // Convert tarball to ZIP
          zipBuffer = await convertTarballToZipBuffer(tarballBuffer);
        } else {
          throw new CustomError("Unsupported URL format. Please provide a GitHub or npmjs.com URL.", 400);
        }

        // Convert the Buffer to a base64 encoded string for the response
        returnString = zipBuffer.toString("base64");

        // Define the S3 key (path) for storing the package
        const s3Key = `packages/${packageName}/v${packageVersion}/package.zip`;

        // Prepare parameters for uploading to S3
        const s3Params = {
          Bucket: bucketName,
          Key: s3Key,
          Body: zipBuffer, // Upload the zip file content directly
          ContentType: "application/zip",
        };

        console.log("Uploading package from URL to S3 with key:", s3Key);
        // Upload the package content to S3
        await s3.putObject(s3Params).promise();
        console.log("Package uploaded to S3 successfully.");
      } catch (error: any) {
        console.error("Error downloading or uploading file from URL:", error);
        throw new CustomError(
          `Failed to download or upload package from URL: ${error.message}`,
          500
        );
      }
    }

    try {
      // Insert the package into the 'packages' table
      await packageQueries.insertPackageQuery(
        packageName,
        packageVersion as string,
        packageId,
        !URL // 'content_type' is true if 'URL' is not provided
      );
      console.log("Package information inserted into the 'packages' table.");

      // Insert metadata into the 'package_metadata' table
      await packageQueries.insertIntoMetadataQuery(packageName, packageVersion as string, packageId, readmeContent);
      console.log("Package metadata inserted into the 'package_metadata' table.");

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
      console.error("Error occurred in packageCreate (Database Insertion):", error);
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
  dependency? : boolean
): Promise<{ [packageId: string]: PackageCostDetail }> {
  try {
    const {packageName, version} = await packageQueries.getPackageDetails(id.id);
    const costDetails = await calculateSize(packageName, version ,dependency ?? false);
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
  const testOutput: any = await calculateMetrics("https://github.com/hasansultan92/watch.js");
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
  response.LicenseScore = testOutput.License;
  response.NetScore = testOutput.NetScore;
  response.PullRequest = testOutput.PullRequest;
  response.RampUp = testOutput.RampUp;
  response.ResponsiveMaintainer = testOutput.ResponsiveMaintainer;
  response.BusFactorLatency = testOutput.BusFactor_Latency;
  response.CorrectnessLatency = testOutput.Correctness_Latency;
  response.GoodPinningPracticeLatency = testOutput.GoodPinningPracticeLatency;
  response.LicenseScoreLatency = testOutput.License_Latency;
  response.NetScoreLatency = testOutput.NetScore_Latency;
  response.PullRequestLatency = testOutput.PullRequestLatency;
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
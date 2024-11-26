// src/service/packageUtils.ts

import axios from 'axios';
import JSZip from 'jszip';
import { s3 } from "../service/awsConfig.js"; // Ensure awsConfig exports a configured S3 instance
import { CustomError } from "../utils/types.js"; // Ensure CustomError is properly defined
import {
  getPackageDetails,
  packageExists,
  getCachedSize,
  setCachedSize,
} from '../queries/packageQueries.js'; // Ensure these functions are correctly implemented
import * as tar from 'tar-stream';
import * as zlib from 'zlib';
import * as stream from 'stream';
import { pipeline } from 'stream/promises';
import * as semver from 'semver'; // Ensure semver is installed and imported correctly
import crypto from 'crypto'; // Import crypto for hashing

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

/**
 * Interface representing the cost details of a package.
 * Costs are in megabytes (MB) rounded to two decimal places.
 */
export interface PackageCostDetail {
  standaloneCost: number; // Size of the package itself in MB (rounded to 2 decimal places)
  totalCost: number;      // Size including all dependencies in MB (rounded to 2 decimal places)
}

/**
 * Downloads a package tarball from npm.
 * @param packageName - The name of the package.
 * @param versionRange - The version range of the package (e.g., "^0.1.2", "~1.0.0", ">=1.0.0 <2.0.0", "1.0.0").
 * @returns An object containing the package size and content buffer.
 */
async function downloadPackageFromNpm(
  packageName: string,
  versionRange: string
): Promise<{ packageSize: number; packageContentBuffer: Buffer }> {
  try {
    // Determine if the version is a range
    const isRange = /^(\^|~|>=|<=|>|<)/.test(versionRange);
    
    let exactVersion = versionRange; // Default to the provided version
    
    if (isRange) {
      console.log(`Version "${versionRange}" is a range. Resolving to an exact version.`);
      
      // Fetch package metadata from npm registry
      const metadataUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
      console.log(`Fetching package metadata from npm registry: ${metadataUrl}`);
      
      const metadataResponse = await axios.get(metadataUrl, {
        responseType: "json",
        validateStatus: (status) => status >= 200 && status < 300, // Accept only 2xx responses
      }).catch(error => {
        if (error.response && error.response.status === 404) {
          throw new CustomError(`Package "${packageName}" not found in npm registry.`, 404);
        }
        throw new CustomError(`Failed to fetch metadata for "${packageName}": ${error.message}`, 500);
      });
      
      const metadata = metadataResponse.data;
      
      if (!metadata.versions) {
        throw new CustomError(`No versions found for package "${packageName}".`, 500);
      }
      
      // Use semver to find the maximum version that satisfies the range
      const versions = Object.keys(metadata.versions);
      const maxSatisfying = semver.maxSatisfying(versions, versionRange);
      
      if (!maxSatisfying) {
        throw new CustomError(`No versions found for package "${packageName}" that satisfy the range "${versionRange}".`, 404);
      }
      
      exactVersion = maxSatisfying;
      console.log(`Resolved version "${versionRange}" to exact version "${exactVersion}".`);
    } else {
      console.log(`Version "${versionRange}" is an exact version. Using directly.`);
    }
    
    // Construct the correct registry URL for the tarball
    const sanitizedVersion = exactVersion.replace(/^v/, ""); // Remove leading 'v' if present
    const packageUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/-/${encodeURIComponent(packageName)}-${sanitizedVersion}.tgz`;
    
    console.log(`Downloading package from npm: ${packageUrl}`);
    
    const response = await axios.get(packageUrl, {
      responseType: "arraybuffer",
      validateStatus: (status) => status === 200, // Only accept 200 OK
    }).catch(error => {
      if (error.response && error.response.status === 404) {
        throw new CustomError(`Tarball for "${packageName}@${exactVersion}" not found in npm registry.`, 404);
      }
      throw new CustomError(`Failed to download tarball for "${packageName}@${exactVersion}": ${error.message}`, 500);
    });
    
    const packageContentBuffer = Buffer.from(response.data);
    const packageSize = packageContentBuffer.length;
    
    console.log(`Downloaded package ${packageName}@${exactVersion} from npm. Size: ${packageSize} bytes`);
    
    return { packageSize, packageContentBuffer };
  } catch (error: any) { // Typing error as any to access error.message
    if (error instanceof CustomError) {
      throw error; // Re-throw CustomErrors
    }
    console.error(`Unexpected error in downloadPackageFromNpm:`, error);
    throw new CustomError(`Unexpected error: ${error.message}`, 500);
  }
}

/**
 * Converts a Readable stream to a Buffer.
 * @param readableStream - The Readable stream to convert.
 * @returns A Promise that resolves to a Buffer containing the stream's data.
 */
function streamToBuffer(readableStream: stream.Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on('data', (chunk) => chunks.push(chunk));
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    readableStream.on('error', (err) => {
      console.error('Error converting stream to buffer:', err);
      reject(err);
    });
  });
}

/**
 * Fetches dependencies from a zip file (used for packages in S3).
 * @param packageContentBuffer - The buffer containing the zip file content.
 * @param packageName - The name of the package.
 * @param version - The version of the package.
 * @returns An array of dependencies with their names and versions.
 */
async function fetchPackageDependenciesFromZip(
  packageContentBuffer: Buffer,
  packageName: string,
  version: string
): Promise<{ name: string; version: string }[]> {
  try {
    console.log(`\nExtracting package.json from zip for ${packageName}@${version}`);
    // Load the zip file
    const zip = await JSZip.loadAsync(packageContentBuffer);

    // List all files in the zip archive
    console.log(`Files in zip archive for ${packageName}@${version}:`);
    zip.forEach((relativePath, file) => {
      console.log(` - ${relativePath}`);
    });

    // Identify all top-level folders (directories) in the zip
    const topLevelFolders: string[] = [];
    zip.forEach((relativePath, file) => {
      if (file.dir && /^[^/]+\/$/.test(relativePath)) { // Adjusted regex to match directories ending with '/'
        topLevelFolders.push(relativePath);
      }
    });

    console.log(`Identified top-level folders: ${topLevelFolders}`);

    if (topLevelFolders.length !== 1) {
      console.error(`Expected exactly one top-level folder in the zip for ${packageName}@${version}, found ${topLevelFolders.length}`);
      throw new CustomError(
        `Invalid zip structure for ${packageName}@${version}: Expected one top-level folder, found ${topLevelFolders.length}`,
        400
      );
    }

    const subfolderName = topLevelFolders[0].replace(/\/$/, ''); // Remove trailing slash
    console.log(`Single top-level folder identified: ${subfolderName}`);

    // Construct the path to package.json inside the subfolder
    const packageJsonPath = `${subfolderName}/package.json`;
    console.log(`Looking for package.json at path: ${packageJsonPath}`);

    const packageJsonFile = zip.file(packageJsonPath);

    if (!packageJsonFile) {
      console.error(`package.json not found at path ${packageJsonPath} for ${packageName}@${version}`);
      throw new CustomError(
        `package.json not found in ${packageName}@${version}`,
        400
      );
    }

    // Read package.json content
    const packageJsonContent = await packageJsonFile.async("string");

    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = packageJson.dependencies || {};
    console.log(`Dependencies extracted for ${packageName}@${version}:`, dependencies);

    // Map dependencies to an array of { name, version }
    return Object.entries(dependencies).map(([depName, depVersion]) => ({
      name: depName,
      version: depVersion as string,
    }));
  } catch (error: any) { // Typing error as any to access error.message
    if (error instanceof CustomError) {
      console.error(`CustomError in fetchPackageDependenciesFromZip():`, error.message);
      throw error; // Re-throw CustomErrors
    }
    console.error(
      `Unexpected error fetching dependencies from zip for ${packageName}@${version}:`,
      error
    );
    throw new CustomError(
      `Failed to fetch dependencies for ${packageName}@${version}`,
      500
    );
  }
}

/**
 * Fetches dependencies from a tarball (used for packages downloaded from npm).
 * @param packageContentBuffer - The buffer containing the tarball content.
 * @returns An array of dependencies with their names and versions.
 */
async function fetchPackageDependenciesFromTarball(
  packageContentBuffer: Buffer
): Promise<{ name: string; version: string }[]> {
  return new Promise<{ name: string; version: string }[]>((resolve, reject) => {
    const extract = tar.extract();
    let packageJsonContent: string | undefined;

    extract.on('entry', (header, readableStream, next) => {
      if (
        header.name === 'package/package.json' ||
        header.name === 'package.json'
      ) {
        const chunks: Buffer[] = [];
        readableStream.on('data', (chunk) => chunks.push(chunk));
        readableStream.on('end', () => {
          packageJsonContent = Buffer.concat(chunks).toString('utf-8');
          next();
        });
        readableStream.on('error', (err) => {
          console.error('Error reading tarball entry:', err);
          reject(err);
        });
      } else {
        readableStream.resume(); // Skip other files
        readableStream.on('end', next);
        readableStream.on('error', (err) => {
          console.error('Error processing tarball entry:', err);
          reject(err);
        });
      }
    });

    extract.on('finish', () => {
      if (packageJsonContent) {
        try {
          const packageJson = JSON.parse(packageJsonContent);
          const dependencies = packageJson.dependencies || {};
          console.log(`Dependencies extracted from tarball:`, dependencies);
          const depsArray = Object.entries(dependencies).map(([depName, depVersion]) => ({
            name: depName,
            version: depVersion as string,
          }));
          resolve(depsArray);
        } catch (parseError: any) {
          console.error('Error parsing package.json from tarball:', parseError);
          reject(new CustomError('Invalid package.json in tarball.', 500));
        }
      } else {
        console.error('package.json not found in tarball package');
        reject(new CustomError('package.json not found in package', 400));
      }
    });

    extract.on('error', (err) => {
      console.error('Error extracting tarball:', err);
      reject(new CustomError('Failed to extract tarball.', 500));
    });

    pipeline(
      stream.Readable.from(packageContentBuffer),
      zlib.createGunzip(),
      extract
    ).catch((err) => {
      console.error('Pipeline failed during tarball extraction:', err);
      reject(new CustomError('Pipeline failed during tarball extraction.', 500));
    });
  });
}

/**
 * Calculates the size costs of a package and its dependencies.
 * @param packageName - The name of the root package.
 * @param version - The version of the root package (can be a range).
 * @param dependency - Whether to include dependencies in the calculation.
 * @returns An object mapping package IDs to their PackageCostDetail.
 */
export async function calculateSize(
  packageName: string,
  version: string,
  dependency = true
): Promise<{ [packageId: string]: PackageCostDetail }> { // Adjusted return type to match the desired output format
  // Map to keep track of visited packages and their cost details
  const visitedPackages = new Map<string, PackageCostDetail>();

  /**
   * Recursive helper function to calculate costs.
   * @param packageName - The name of the package.
   * @param version - The version of the package.
   * @param allowDownloadIfNotInRegistry - Whether to allow downloading from npm if not in registry.
   * @returns The total cost in MB for the package and its dependencies.
   */
  async function calculate(
    packageName: string,
    version: string,
    allowDownloadIfNotInRegistry = false
  ): Promise<number> { // Returns totalCost in MB
    console.log(`\nStarting calculation for package: ${packageName}@${version}`);

    // Generate unique ID for the package using SHA-256 hashing
    const packageId = generateUniqueId(packageName, version);
    console.log(`Generated unique ID for ${packageName}@${version}: ${packageId}`);

    // Check if the package has already been processed
    if (visitedPackages.has(packageId)) {
      console.log(`Package ${packageId} already processed. Using cached values.`);
      return visitedPackages.get(packageId)!.totalCost;
    }

    try {
      // Check if the package exists in the internal registry
      const existsInRegistry = await packageExists(packageId);
      console.log(`Package ${packageId} exists in registry: ${existsInRegistry}`);

      let standaloneCostMB: number;
      let totalCostMB: number = 0;

      if (existsInRegistry) {
        // Retrieve package details from the database
        const packageDetails = await getPackageDetails(packageId);
        if (!packageDetails) {
          throw new CustomError(`Package details not found in the database for ${packageName}@${version}.`, 404);
        }
        const { packageName: dbPackageName, version: dbVersion } = packageDetails;
        console.log(`Retrieved package details from DB: name=${dbPackageName}, version=${dbVersion}`);

        // S3 bucket name from environment variables
        const bucketName = process.env.S3_BUCKET_NAME;
        if (!bucketName) {
          throw new CustomError("S3_BUCKET_NAME is not defined in the environment variables.", 500);
        }

        // Construct the S3 key for the package zip file
        const s3Key = `packages/${dbPackageName}/v${dbVersion}/package.zip`;
        console.log(`S3 key for package: ${s3Key}`);

        // Check if standalone size is cached
        let cachedStandaloneSize = await getCachedSize(packageId, false);
        console.log(`Cached standalone size for ${packageId}: ${cachedStandaloneSize} bytes`);

        if (cachedStandaloneSize !== undefined) {
          standaloneCostMB = parseFloat((cachedStandaloneSize / (1024 * 1024)).toFixed(4)); // bytes to MB, rounded to 2 decimal places
          console.log(`Using cached standalone size for ${packageId}: ${standaloneCostMB} MB`);
        } else {
          // Fetch package from S3
          console.log(`Fetching package from S3: Bucket=${bucketName}, Key=${s3Key}`);
          const s3Object = await s3.getObject({ Bucket: bucketName, Key: s3Key }).promise();
          if (!s3Object.Body) {
            throw new CustomError(`No content found in S3 for ${s3Key}.`, 500);
          }

          let packageContentBuffer: Buffer;
          if (s3Object.Body instanceof Buffer) {
            packageContentBuffer = s3Object.Body;
          } else {
            packageContentBuffer = await streamToBuffer(s3Object.Body as stream.Readable);
          }

          const packageSizeBytes = s3Object.ContentLength || packageContentBuffer.length;
          console.log(`Fetched package size from S3 for ${packageId}: ${packageSizeBytes} bytes`);

          standaloneCostMB = parseFloat((packageSizeBytes / (1024 * 1024)).toFixed(4)); // bytes to MB, rounded to 2 decimal places
          console.log(`Standalone size for ${packageId}: ${standaloneCostMB} MB`);

          // Cache the standalone size
          await setCachedSize(packageId, packageSizeBytes, false);
          console.log(`Cached standalone size for ${packageId}: ${packageSizeBytes} bytes`);
        }

        totalCostMB = standaloneCostMB;

        if (dependency) {
          // Fetch dependencies from zip
          console.log(`Fetching dependencies from zip for package ${packageName}@${version}`);
          const s3Object = await s3.getObject({ Bucket: bucketName, Key: s3Key }).promise();
          if (!s3Object.Body) {
            throw new CustomError(`No content found in S3 for ${s3Key}.`, 500);
          }

          let packageContentBuffer: Buffer;
          if (s3Object.Body instanceof Buffer) {
            packageContentBuffer = s3Object.Body;
          } else {
            packageContentBuffer = await streamToBuffer(s3Object.Body as stream.Readable);
          }

          const dependencies = await fetchPackageDependenciesFromZip(
            packageContentBuffer,
            packageName,
            version
          );
          console.log(`Found ${dependencies.length} dependencies for ${packageName}@${version}`);

          // Process dependencies
          for (const dep of dependencies) {
            const depTotalCost = await calculate(dep.name, dep.version, allowDownloadIfNotInRegistry);
            totalCostMB += depTotalCost;
          }
        }

        // Create and store PackageCostDetail with rounded values
        const costDetail: PackageCostDetail = {
          standaloneCost: standaloneCostMB,
          totalCost: parseFloat(totalCostMB.toFixed(4)),
        };
        console.log(`Calculated cost detail for ${packageId}:`, costDetail);
        visitedPackages.set(packageId, costDetail);

        return totalCostMB;
      } else if (allowDownloadIfNotInRegistry) {
        // Package not in internal registry, download from npm
        console.log(`Package ${packageName}@${version} not found in registry. Downloading from npm.`);
        const { packageSize, packageContentBuffer } = await downloadPackageFromNpm(packageName, version);
        standaloneCostMB = parseFloat((packageSize / (1024 * 1024)).toFixed(4)); // bytes to MB, rounded to 2 decimal places
        console.log(`Downloaded standalone size for ${packageName}@${version}: ${standaloneCostMB} MB`);

        // Cache standalone size
        await setCachedSize(packageId, packageSize, false);
        console.log(`Cached standalone size for ${packageId}: ${packageSize} bytes`);

        totalCostMB = standaloneCostMB;

        if (dependency) {
          // Fetch dependencies from tarball
          console.log(`Fetching dependencies from tarball for package ${packageName}@${version}`);
          const dependencies = await fetchPackageDependenciesFromTarball(packageContentBuffer);
          console.log(`Found ${dependencies.length} dependencies for ${packageName}@${version}`);

          // Process dependencies
          for (const dep of dependencies) {
            const depTotalCost = await calculate(dep.name, dep.version, allowDownloadIfNotInRegistry);
            totalCostMB += depTotalCost;
          }
        }

        // Create and store PackageCostDetail with rounded values
        const costDetail: PackageCostDetail = {
          standaloneCost: standaloneCostMB,
          totalCost: parseFloat(totalCostMB.toFixed(4)),
        };
        console.log(`Calculated cost detail for ${packageId}:`, costDetail);
        visitedPackages.set(packageId, costDetail);

        return totalCostMB;
      } else {
        throw new CustomError(
          `Package ${packageName}@${version} not found in internal registry and downloading is not allowed.`,
          404
        );
      }
    } catch (error: any) {
      if (error instanceof CustomError) {
        console.error(`CustomError in calculate():`, error.message);
        throw error; // Re-throw CustomErrors
      }
      console.error(`Unexpected error in calculate():`, error);
      throw new CustomError(`Unexpected error: ${error.message}`, 500);
    }
  } // End of calculate function

  try {
    // Start calculation with the root package
    console.log(`\nInitiating calculation for root package: ${packageName}@${version}`);
    await calculate(packageName, version, dependency);

    // Prepare the output
    const output: { [packageId: string]: PackageCostDetail } = {};

    if (dependency) {
      console.log(`\nDependency flag is true. Including all dependencies in the output.`);
      visitedPackages.forEach((cost, id) => {
        output[id] = cost;
      });
    } else {
      console.log(`\nDependency flag is false. Including only the root package in the output.`);
      const rootPackageId = generateUniqueId(packageName, version);
      const rootCost = visitedPackages.get(rootPackageId);
      if (rootCost) {
        output[rootPackageId] = rootCost;
      } else {
        throw new CustomError(`Root package ${packageName}@${version} not found after calculation.`, 500);
      }
    }

    // Round all costs to two decimal places in the final output
    for (const id in output) {
      output[id].standaloneCost = parseFloat(output[id].standaloneCost.toFixed(4));
      output[id].totalCost = parseFloat(output[id].totalCost.toFixed(4));
    }

    console.log(`\nFinal output for package ${packageName}@${version}:`, output);

    return output;
  } catch (error: any) {
    if (error instanceof CustomError) {
      console.error(`CustomError in calculateSize():`, error.message);
      throw error;
    }
    console.error(`Unexpected error in calculateSize():`, error);
    throw new CustomError(`Unexpected error: ${error.message}`, 500);
  }
}
export function compareVersions(newVersion: string, oldVersion: string): boolean {
  const [newMajor, newMinor, newPatch] = newVersion.split('.').map(Number);
  const [oldMajor, oldMinor, oldPatch] = oldVersion.split('.').map(Number);

  if (newMajor < oldMajor) return false; // Reject if major version is lower
  if (newMajor === oldMajor && newMinor < oldMinor) return false; // Reject if minor version is lower
  if (newMajor === oldMajor && newMinor === oldMinor && newPatch < oldPatch) return false; // Reject if patch version is lower
  return true; // Allow higher or equal versions
}

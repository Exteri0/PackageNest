// retrieves each package's size from S3
// fetches dependencies dynamically 
// recursively calculates the size for each dependency 
import axios from 'axios';
import { s3 } from "../service/awsConfig";
import { urlMain, fetchUrl } from '/home/shay/a/manjuna0/461/PackageNest/src/Metrics/urlHandler.js';
import { CustomError } from "../utils/types";
import { getDbPool } from "../service/databaseConnection";

/**
 * Fetch dependencies for a given package from an external API (e.g., npm registry).
 * 
 * @param packageName - The name of the package to fetch dependencies for.
 * @param packageVersion - The specific version of the package to fetch dependencies for.
 * @returns A list of dependencies for the package.
 * @throws CustomError if the API request fails or if dependencies cannot be retrieved.
 */
export async function fetchPackageDependencies(packageName: string, packageVersion: string): Promise<string[]> {
    try {
        // Construct the npm URL and retrieve GitHub repo details
        const npmUrl = `https://registry.npmjs.org/${packageName}/${packageVersion}`;
        const { repoOwner, repoName } = await urlMain(npmUrl);

        if (!repoOwner || !repoName) {
            throw new CustomError(`Invalid repository URL for package ${packageName}@${packageVersion}`, 400);
        }

        // Define the GitHub API URL to fetch package.json
        const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/package.json`;

        // Fetch the package.json content from GitHub with authentication
        const headers = {
            'Accept': 'application/vnd.github.v3.raw',
            'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}` // Use GitHub token for authentication
        };
        const packageJson = await fetchUrl(githubApiUrl, { headers });

        // Extract dependencies from the package.json data
        const dependencies = packageJson.dependencies || {};
        return Object.keys(dependencies);

    } catch (error) {
        console.error(`Error fetching dependencies for package ${packageName}@${packageVersion}:`, error);
        throw new CustomError(`Failed to fetch dependencies for ${packageName}@${packageVersion}`, 500);
    }
}
/**
 * Calculate the size of a package, including its dependencies.
 * 
 * @param packageId - The ID of the package in the format "name@version".
 * @param dependency - Whether to include dependencies in the size calculation.
 * @returns The total size of the package in bytes.
 * @throws CustomError if there's an error in retrieving package data or calculating size.
 */

export async function calculateSize(packageId: string, dependency = true): Promise<number> {
    const dbPool = getDbPool(); // Connection to RDS
    const visitedPackages = new Set<string>(); // To track processed packages and avoid loops

    if (!process.env.S3_BUCKET_NAME) {
        throw new Error("S3_BUCKET_NAME is not defined in the environment variables.");
    }

    async function calculate(packageName: string, version: string): Promise<number> {
        const fullPackageId = `${packageName}@${version}`;
        
        // Check if this package has already been processed
        if (visitedPackages.has(fullPackageId)) return 0;
        visitedPackages.add(fullPackageId);

        // Check for cached size in the database
        const cachedSize = await getCachedSize(fullPackageId);
        if (cachedSize !== undefined) {
            return cachedSize; // Return cached size if available
        }

        // Fetch package size from S3
        const bucketName = process.env.S3_BUCKET_NAME;
        if (!bucketName) {
             throw new Error("S3_BUCKET_NAME is not defined in the environment variables.");
        }
        const s3Params = { Bucket: bucketName, Key: `packages/${packageName}/v${version}/package.zip` };
        const s3Object = await s3.headObject(s3Params).promise();
        const packageSize = s3Object.ContentLength || 0;

        let totalSize = packageSize;

        // If dependency flag is true, calculate sizes of dependencies
        if (dependency) {
            const dependencies = await fetchPackageDependencies(packageName, version);
            for (const dep of dependencies) {
                const [depName, depVersion] = dep.split("@");
                totalSize += await calculate(depName, depVersion || 'latest');
            }
        }
        // Cache the calculated size in the database
        await setCachedSize(fullPackageId, totalSize);

        return totalSize;
    }

    // Helper function to check cached size in database
    async function getCachedSize(packageId: string): Promise<number | undefined> {
        const query = `SELECT size_cost FROM packages WHERE package_id = $1`;
        const result = await dbPool.query(query, [packageId]);
        return result.rows[0]?.size_cost || undefined;
    }

    // Helper function to store calculated size in database
    async function setCachedSize(packageId: string, size: number): Promise<void> {
        const query = `UPDATE packages SET size_cost = $1 WHERE package_id = $2`;
        await dbPool.query(query, [size, packageId]);
    }

    // Start calculation with root package name and version
    const [packageName, version] = packageId.split("@");
    return calculate(packageName, version || 'latest');
}

// retrieves each package's size from S3
// fetches dependencies dynamically 
// recursively calculates the size for each dependency 
import axios from 'axios';
import { s3 } from "../service/awsConfig";
import { CustomError } from "../utils/types";

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
        // Define the API URL for fetching package data from the npm registry
        const apiUrl = `https://registry.npmjs.org/${packageName}/${packageVersion}`;

        // Make the request to the external API
        const response = await axios.get(apiUrl);

        // Extract dependencies from the response
        const dependencies = response.data.dependencies || {};
        
        // Return dependencies as an array of package names
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
    const visitedPackages = new Set<string>(); // To track processed packages and avoid circular dependencies

    async function calculate(packageName: string, version: string): Promise<number> {
        // Skip if already processed
        if (visitedPackages.has(`${packageName}@${version}`)) return 0;
        visitedPackages.add(`${packageName}@${version}`);

        // Fetch package size from S3
        const bucketName = process.env.S3_BUCKET_NAME;
        if (!bucketName) throw new Error("S3_BUCKET_NAME is not defined in the environment variables.");
        
        const s3Params = { Bucket: bucketName, Key: `packages/${packageName}/v${version}/package.zip` };
        const s3Object = await s3.headObject(s3Params).promise();
        const packageSize = s3Object.ContentLength || 0;

        let totalSize = packageSize;

        // Fetch dependencies dynamically if required
        if (dependency) {
            const dependencies = await fetchPackageDependencies(packageName, version);
            for (const dep of dependencies) {
                // Call `calculate` recursively for each dependency
                const [depName, depVersion] = dep.split("@");
                totalSize += await calculate(depName, depVersion || 'latest');
            }
        }

        return totalSize;
    }

    // Start calculation with the root package name and version
    const [packageName, version] = packageId.split("@");
    return calculate(packageName, version || 'latest');
}

/*import { s3 } from "../service/awsConfig";
import { getPackageById } from "../queries/packageQueries";
import { CustomError } from "../utils/types";

export async function calculateSize(packageId: string, dependency = true): Promise<number> {
    const visitedPackages = new Set<string>(); // Localize visitedPackages

    async function calculate(packageId: string): Promise<number> {
        // Skip if already processed
        if (visitedPackages.has(packageId)) return 0;
        visitedPackages.add(packageId);

        const packageMetadata = await getPackageById(packageId);
        if (!packageMetadata) {
            throw new CustomError(`Package with ID ${packageId} not found`, 404);
        }

        const { version, dependencies } = packageMetadata;
        const bucketName = process.env.S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error("S3_BUCKET_NAME is not defined in the environment variables.");
        }
        const s3Params = {
            Bucket: bucketName,
            Key: `packages/${packageId}/v${version}/package.zip`,
        };
        const s3Object = await s3.headObject(s3Params).promise();
        const packageSize = s3Object.ContentLength || 0;

        let totalSize = packageSize;
        if (dependency && dependencies) {
            for (const depId of dependencies) {
                totalSize += await calculate(depId);
            }
        }
        return totalSize;
    }

    return calculate(packageId); // Returns the total size (standalone or including dependencies)
}*/

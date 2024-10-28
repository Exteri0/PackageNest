// services/packageService.ts
// handles the the ingestion of a package
// performs rating calculation and verifies eligibility
//import { calculateRating, PackageMetrics } from '../utils/ratingCalculator';
import { uploadPackageToS3 } from '../utils/storage.js'; // helper for AWS S3 interactions
import { PackageMetrics } from '../utils/types.js'

export interface PackageData {
    name: string;
    version: string;
    metrics: PackageMetrics;
    fileBuffer: Buffer; // zipped file data for the package
}

export async function ingestPackage(packageData: PackageData) {
    // dummy rating function for testing purposes
    function calculateRating(metrics: PackageMetrics) {
        return {
            score: 1.0,          
            isEligible: true     
        };
    }
    // Calculate rating
    const { score, isEligible } = calculateRating(packageData.metrics);

    if (!isEligible) {
        throw new Error(`Package does not meet the required rating threshold. Score: ${score}`);
    }

    // Upload the package to S3
    const s3Result = await uploadPackageToS3(packageData.name, packageData.version, packageData.fileBuffer);

    return {
        message: 'Package successfully ingested',
        score,
        s3Result,
    };
} 

// src/services/packageService.ts
import { savePackageMetadataToRDS } from '../utils/database';
import { uploadPackageToS3 } from '../utils/storage';
import axios from 'axios';

const RATING_THRESHOLD = 0.5; // Define minimum threshold for acceptable rating

export async function ingestPackage(packageData: {
    name: string;
    version: string;
    metrics: { score: number }; // Placeholder for actual rating logic
    fileUrl: string;
}) {
    try {
        // calculate rating
        const calculatedScore = calculateRating(packageData.metrics);

        //  Check if rating meets threshold
        if (calculatedScore < RATING_THRESHOLD) {
            return {
                message: 'Package ingestion failed',
                reason: `Package rating (${calculatedScore}) does not meet the minimum threshold of ${RATING_THRESHOLD}.`
            };
        }

        //  Download file from the provided URL
        const fileBuffer = await downloadFile(packageData.fileUrl);
        
        //  Upload to S3
        const s3Result = await uploadPackageToS3(packageData.name, packageData.version, fileBuffer);

        // Step 5: Save package metadata to RDS
        await savePackageMetadataToRDS({
            name: packageData.name,
            version: packageData.version,
            s3Url: s3Result.Location,
            score: calculatedScore, // Use the calculated score
            timestamp: new Date()
        });

        return {
            message: 'Package successfully ingested and metadata saved',
            downloadUrl: s3Result.Location
        };
    } catch (error) {
        throw new Error(`Failed to ingest package: ${(error as Error).message}`);
    }
}

// Dummy rating calculation function
function calculateRating(metrics: { score: number }): number {
    return metrics.score; 
}

// helper function to download file from URL
async function downloadFile(fileUrl: string): Promise<Buffer> {
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}

// utils/storage.ts
// stores the package file in S3
// src/utils/storage.ts
import AWS from 'aws-sdk';

const s3 = new AWS.S3();

export async function uploadPackageToS3(name: string, version: string, fileBuffer: Buffer) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: `${name}/${version}.zip`,
        Body: fileBuffer,
    };

    try {
        const result = await s3.upload(params).promise();
        return result;
    } catch (error: unknown) {
        const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred";
        throw new Error(errorMessage);
    }
}

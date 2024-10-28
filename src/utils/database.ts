// src/utils/database.ts
import { RDSDataService } from 'aws-sdk';

const rds = new RDSDataService();

export async function savePackageMetadataToRDS(packageMetadata: {
    name: string;
    version: string;
    s3Url: string;
    score: number;
    timestamp: Date;
}) {
    const params = {
        resourceArn: process.env.DATABASE_ARN!,
        secretArn: process.env.SECRET_ARN!,
        sql: `
            INSERT INTO Packages (name, version, s3Url, score, timestamp)
            VALUES (:name, :version, :s3Url, :score, :timestamp)
        `,
        database: process.env.DATABASE_NAME,
        parameters: [
            { name: 'name', value: { stringValue: packageMetadata.name } },
            { name: 'version', value: { stringValue: packageMetadata.version } },
            { name: 's3Url', value: { stringValue: packageMetadata.s3Url } },
            { name: 'score', value: { longValue: packageMetadata.score } },
            { name: 'timestamp', value: { stringValue: packageMetadata.timestamp.toISOString() } }
        ]
    };
    await rds.executeStatement(params).promise();
}

export async function updatePackageS3UrlInRDS(name: string, version: string, s3Url: string) {
    const params = {
        resourceArn: process.env.DATABASE_ARN!,
        secretArn: process.env.SECRET_ARN!,
        sql: `
            UPDATE Packages
            SET s3Url = :s3Url
            WHERE name = :name AND version = :version
        `,
        database: process.env.DATABASE_NAME,
        parameters: [
            { name: 'name', value: { stringValue: name } },
            { name: 'version', value: { stringValue: version } },
            { name: 's3Url', value: { stringValue: s3Url } }
        ]
    };
    await rds.executeStatement(params).promise();
}

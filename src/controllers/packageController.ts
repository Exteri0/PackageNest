// controllers/packageController.ts
// exposes an endpoint for package ingestion
// makes ingestPackage accessible through an http route
import { Request, Response } from 'express';
import { ingestPackage } from '../service/packageService.js';

export async function ingestPackageHandler(req: Request, res: Response) {
    try {
        const { name, version, metrics, fileBuffer } = req.body;

        const result = await ingestPackage({
            name,
            version,
            metrics,
            fileBuffer: Buffer.from(fileBuffer, 'base64') // file data is sent as base64
        });

        res.status(200).json(result);
    } catch (error: unknown) {
        const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred";
        res.status(400).json({ error: errorMessage });
    }
    
    
}

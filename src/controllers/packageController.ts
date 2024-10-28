import { Request, Response } from 'express';
import { ingestPackage } from '../service/packageService.js';


export async function ingestPackageHandler(req: Request, res: Response) {
    try {
        const { name, version, metrics, fileUrl } = req.body;

        if (!fileUrl) {
            return res.status(400).json({ error: 'fileUrl is missing' });
        }

        const result = await ingestPackage({
            name,
            version,
            metrics,
            fileUrl
        });

        res.status(200).json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(400).json({ error: errorMessage });
    }
}

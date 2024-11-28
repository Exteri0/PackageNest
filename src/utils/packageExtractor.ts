// packageExtractor.ts

import AdmZip from 'adm-zip';
import { CustomError } from '../utils/types.js'; // Import the CustomError class

/**
 * Interface representing the input package data
 */
interface InputPackage {
  Content: string;
  JSProgram: string | undefined;
  debloat: boolean;
  Name: string | undefined;
}

/**
 * Extracts the GitHub repository link from a package's content.
 * 
 * @param input - The input object containing the package content and metadata.
 * @returns The GitHub repository URL.
 * @throws {CustomError} If package.json or repository link is not found or parsing fails.
 */
export async function extractGithubRepoLink(input: InputPackage): Promise<string> {
  console.log(`Starting extraction for package: ${input.Name}`);

  try {
    // Validate input
    if (!input.Content) {
      throw new CustomError("Package content is missing.", 400);
    }

    // Decode the base64 content
    console.log(`Decoding base64 content...`);
    let buffer: Buffer;
    try {
      buffer = Buffer.from(input.Content, 'base64');
    } catch (decodeError) {
      console.error("Failed to decode base64 content:", decodeError);
      throw new CustomError("Invalid base64 content provided.", 400);
    }

    // Initialize the zip archive
    console.log(`Initializing zip archive...`);
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch (zipError) {
      console.error("Failed to initialize zip archive:", zipError);
      throw new CustomError("Invalid zip archive provided.", 400);
    }

    // Get the entries in the zip
    const zipEntries = zip.getEntries();
    console.log(`Found ${zipEntries.length} entries in the archive.`);

    // Find package.json (any path within the archive)
    const packageJsonEntry = zipEntries.find(entry => entry.entryName.endsWith('package.json'));

    if (!packageJsonEntry) {
      throw new CustomError('package.json not found in the archive.', 404);
    }

    console.log(`package.json found at ${packageJsonEntry.entryName}. Extracting content...`);

    // Extract and parse package.json
    const packageJsonContent = packageJsonEntry.getData().toString('utf-8');
    console.log(`Parsing package.json...`);
    let packageJson: any;
    try {
      packageJson = JSON.parse(packageJsonContent);
    } catch (parseError) {
      console.error("Failed to parse package.json:", parseError);
      throw new CustomError('Failed to parse package.json.', 400);
    }

    // Find the repository link
    let repoLink: string | null = null;

    if (typeof packageJson.repository === 'string') {
      repoLink = packageJson.repository;
    } else if (typeof packageJson.repository === 'object' && packageJson.repository !== null) {
      repoLink = packageJson.repository.url || null;
    }

    if (repoLink) {
      // Normalize the repository URL (e.g., remove prefixes like "git+", ".git" suffix)
      repoLink = normalizeRepoUrl(repoLink);
      console.log(`Repository link found and normalized: ${repoLink}`);
      return repoLink;
    } else {
      throw new CustomError('Repository link not found in package.json.', 404);
    }

  } catch (error: any) {
    if (error instanceof CustomError) {
      console.error(`CustomError: ${error.message}`);
      throw error; // Rethrow to allow upstream handling
    } else {
      console.error(`Unexpected error during extraction: ${error.message}`);
      throw new CustomError('An unexpected error occurred during extraction.', 500);
    }
  }
}

/**
 * Normalizes repository URLs by removing protocols like "git+", trimming ".git" suffixes,
 * and ensuring proper formatting.
 * 
 * @param url - The repository URL to normalize.
 * @returns The normalized repository URL.
 */
function normalizeRepoUrl(url: string): string {
  // Remove "git+" prefix if present
  if (url.startsWith('git+')) {
    url = url.slice(4);
  }

  // Remove ".git" suffix if present
  if (url.endsWith('.git')) {
    url = url.slice(0, -4);
  }

  return url;
}


// packageExtractor.ts

import AdmZip from 'adm-zip';

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
 * @returns The GitHub repository URL if found, otherwise null.
 */
export async function extractGithubRepoLink(input: InputPackage): Promise<string | null> {
  console.log(`Starting extraction for package: ${input.Name}`);

  try {
    // Decode the base64 content
    console.log(`Decoding base64 content...`);
    const buffer = Buffer.from(input.Content, 'base64');

    // Initialize the zip archive
    console.log(`Initializing zip archive...`);
    const zip = new AdmZip(buffer);

    // Get the entries in the zip
    const zipEntries = zip.getEntries();
    console.log(`Found ${zipEntries.length} entries in the archive.`);

    // Find package.json (any path within the archive)
    const packageJsonEntry = zipEntries.find(entry => entry.entryName.endsWith('package.json'));

    if (!packageJsonEntry) {
      console.log(`package.json not found in the archive.`);
      return null;
    }

    console.log(`package.json found at ${packageJsonEntry.entryName}. Extracting content...`);

    // Extract and parse package.json
    const packageJsonContent = packageJsonEntry.getData().toString('utf-8');
    console.log(`Parsing package.json...`);
    const packageJson = JSON.parse(packageJsonContent);

    // Find the repository link
    let repoLink: string | null = null;

    if (typeof packageJson.repository === 'string') {
      repoLink = packageJson.repository;
    } else if (typeof packageJson.repository === 'object' && packageJson.repository !== null) {
      repoLink = packageJson.repository.url || null;
    }

    if (repoLink) {
      console.log(`Repository link found: ${repoLink}`);
      return repoLink;
    } else {
      console.log(`Repository link not found in package.json.`);
      return null;
    }

  } catch (error: any) {
    console.error(`Error during extraction: ${error.message}`);
    return null;
  }
}

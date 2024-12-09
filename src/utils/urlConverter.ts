// utils/urlConverter.ts

import axios from 'axios';
import { CustomError } from '../utils/types.js';

export async function convertNpmUrlToGitHubUrl(npmUrl: string): Promise<string> {
  console.info('Starting conversion of npm URL to GitHub URL.', { npmUrl });

  try {
    // Extract the package name from the npmjs.com URL
    const packageNameMatch = npmUrl.match(/npmjs\.com\/package\/([^/]+)/);
    if (!packageNameMatch) {
      console.warn('Invalid npm URL format.', { npmUrl });
      throw new CustomError('Invalid npmjs.com URL format.', 400);
    }

    const packageName = packageNameMatch[1];
    console.debug('Extracted package name.', { packageName });

    // Fetch package metadata from the npm registry
    const registryUrl = `https://registry.npmjs.org/${packageName}`;
    console.info('Fetching package metadata from npm registry.', { registryUrl });

    const response = await axios.get(registryUrl);
    console.debug('Received package metadata.', { data: response.data });

    const repository = response.data.repository;

    if (!repository || !repository.url) {
      console.warn('Repository URL not found in package metadata.', { packageName });
      throw new CustomError('Repository URL not found in package metadata.', 400);
    }

    // Extract the GitHub repository URL
    let repoUrl = repository.url;
    console.debug('Repository URL found in metadata.', { repoUrl });

    // Handle different repository URL formats
    repoUrl = repoUrl.replace(/^git\+/, '').replace(/\.git$/, '');
    console.debug('Cleaned repository URL.', { cleanedRepoUrl: repoUrl });

    // Validate that the URL is a GitHub URL
    if (!repoUrl.includes('github.com')) {
      console.warn('Repository URL is not a GitHub URL.', { repoUrl });
      throw new CustomError('Repository URL is not a GitHub URL.', 400);
    }

    console.info('Successfully converted npm URL to GitHub URL.', { githubUrl: repoUrl });
    return repoUrl;
  } catch (error: any) {
    console.error('Error occurred during npm URL to GitHub URL conversion.', {
      npmUrl,
      errorMessage: error.message,
      stack: error.stack,
    });

    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError(`Failed to convert npm URL to GitHub URL: ${error.message}`, error.status || 500);
  }
}

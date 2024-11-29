// utils/urlConverter.ts

import axios from 'axios';
import { CustomError } from '../utils/types.js';

export async function convertNpmUrlToGitHubUrl(npmUrl: string): Promise<string> {
  try {
    // Extract the package name from the npmjs.com URL
    const packageNameMatch = npmUrl.match(/npmjs\.com\/package\/([^/]+)/);
    if (!packageNameMatch) {
      throw new CustomError("Invalid npmjs.com URL format.", 400);
    }

    const packageName = packageNameMatch[1];

    // Fetch package metadata from the npm registry
    const registryUrl = `https://registry.npmjs.org/${packageName}`;
    const response = await axios.get(registryUrl);

    const repository = response.data.repository;

    if (!repository || !repository.url) {
      throw new CustomError("Repository URL not found in package metadata.", 400);
    }

    // Extract the GitHub repository URL
    let repoUrl = repository.url;

    // Handle different repository URL formats
    // Examples:
    // - git+https://github.com/user/repo.git
    // - https://github.com/user/repo
    // - git://github.com/user/repo.git
    // - git@github.com:user/repo.git

    // Remove any prefixes like 'git+' or suffixes like '.git'
    repoUrl = repoUrl.replace(/^git\+/, '').replace(/\.git$/, '');

    // Validate that the URL is a GitHub URL
    if (!repoUrl.includes("github.com")) {
      throw new CustomError("Repository URL is not a GitHub URL.", 400);
    }

    return repoUrl;
  } catch (error: any) {
    console.error(`Error converting npm URL to GitHub URL: ${error.message}`);
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError(`Failed to convert npm URL to GitHub URL: ${error.message}`, 500);
  }
}

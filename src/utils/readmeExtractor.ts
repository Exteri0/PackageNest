// utils/readmeExtractor.ts

import axios from 'axios';
import { CustomError } from '../utils/types.js';

/**
 * Extracts README content from a GitHub repository URL using GitHub's API.
 * @param url - GitHub repository URL.
 * @returns README content as a string.
 */
export async function extractReadmeFromGitHub(url: string): Promise<string> {
  try {
    // Extract owner and repo from the GitHub URL
    const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/);
    if (!repoMatch) {
      throw new CustomError("Invalid GitHub URL format.", 400);
    }

    const owner = repoMatch[1];
    const repo = repoMatch[2];

    // GitHub API endpoint to fetch README metadata
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;

    // Optional: If you have a GitHub token, include it to increase rate limits and access private repos
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    // Uncomment and set your GitHub token if needed
    // const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    // if (GITHUB_TOKEN) {
    //   headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    // }

    // Fetch README metadata from GitHub API
    const apiResponse = await axios.get(apiUrl, { headers });

    // Extract download_url from the API response
    const downloadUrl: string = apiResponse.data.download_url;

    if (!downloadUrl) {
      throw new CustomError("README download URL not found.", 404);
    }

    // Fetch the actual README content using the download_url
    const readmeResponse = await axios.get(downloadUrl, { headers: { 'Accept': 'application/vnd.github.v3.raw' } });
    return readmeResponse.data;
  } catch (error: any) {
    console.error(`Error extracting README from GitHub: ${error.message}`);
    if (error.response && error.response.status === 404) {
      throw new CustomError("README not found in the repository.", 404);
    }
    throw new CustomError("Failed to extract README from GitHub.", 500);
  }
}

/**
 * Extracts README content from an npmjs.com package.
 * @param packageName - Name of the npm package.
 * @returns README content as a string.
 */
export async function extractReadmeFromNpm(packageName: string): Promise<string> {
  try {
    const registryUrl = `https://registry.npmjs.org/${packageName}`;
    const registryResponse = await axios.get(registryUrl);
    const latestVersion = registryResponse.data['dist-tags'].latest;
    const readme = registryResponse.data.versions[latestVersion].readme || '';

    return readme;
  } catch (error: any) {
    console.error(`Error extracting README from npmjs.com: ${error.message}`);
    throw new CustomError("Failed to extract README from npmjs.com.", 500);
  }
}

/**
 * Determines the source type and extracts README accordingly.
 * @param source - Source object containing a URL.
 * @returns README content as a string.
 */
export async function extractReadme(source: {
  URL: string;
}): Promise<string> {
  if (source.URL) {
    if (source.URL.includes("github.com")) {
      return await extractReadmeFromGitHub(source.URL);
    } else if (source.URL.includes("npmjs.com")) {
      const packageNameMatch = source.URL.match(/npmjs\.com\/package\/([^/]+)/);
      if (!packageNameMatch) {
        throw new CustomError("Invalid npmjs.com URL format.", 400);
      }
      const packageName = packageNameMatch[1];
      return await extractReadmeFromNpm(packageName);
    } else {
      throw new CustomError("Unsupported URL format for README extraction.", 400);
    }
  } else {
    return '';
  }
}

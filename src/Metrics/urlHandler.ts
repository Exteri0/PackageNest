/**
 * URL Handler Module
 * 
 * This file contains utility functions to process and handle URLs, 
 * particularly for npm and GitHub repositories. It provides functionality 
 * to extract repository owner and name from URLs and fetch data from npm 
 * or GitHub APIs.
 */

import axios from "axios";

/**
 * Processes an npm URL and constructs the corresponding npm registry endpoint URL.
 * 
 * @param cliUrl - The npm package URL.
 * @returns The npm registry endpoint URL for the package.
 */
function handleNpmUrl(cliUrl: string) {
  const parts = cliUrl.split("/");
  const pkgName = parts[parts.length - 1];
  return "https://registry.npmjs.org/" + pkgName;
}

/**
 * Fetches data from the given URL.
 * 
 * @param url - The URL to fetch data from.
 * @param options - Additional options for the request (default: {}).
 * @returns A promise resolving to the fetched data.
 */
export async function fetchUrl(url: string, options: any = {}): Promise<any> {
  const response = await axios.get(url);
  return response.data;
}

/**
 * Extracts the repository owner and name from a GitHub URL.
 * 
 * @param url - The GitHub repository URL.
 * @returns An object containing the repository owner and name.
 * @throws An error if the provided URL is not a valid GitHub URL.
 */
function getRepoOwnerRepoName(url: string) {
  const parts = url.split("/");
  let repoOwner;
  let repoName;
  // Find the position of github.com
  let githubPos = parts.findIndex(
    (part) => part.includes("github.com") || part.includes("git@github.com")
  );
  // Handle custom GitHub Enterprise domains
  if (githubPos === -1) {
    githubPos = parts.findIndex((part) => part.includes("github."));
  }
  if (githubPos !== -1 && parts.length > githubPos + 2) {
    repoOwner = parts[githubPos + 1];
    repoName = parts[githubPos + 2];
    repoName = repoName.replace(".git", "");
  } else {
    throw new Error("Invalid GitHub URL");
  }
  return { repoOwner, repoName };
}

/**
 * Main function to process a URL and extract repository information.
 * 
 * If the URL points to an npm package, it fetches the package's `repository.url` 
 * and extracts the repository owner and name. If the URL is a GitHub URL, it 
 * directly extracts the information.
 * 
 * @param url - The input URL to process.
 * @returns A promise resolving to an object containing the repository owner 
 * and name, or `undefined` if the information could not be extracted.
 */
export async function urlMain(url: string) {
  if (url.includes("npmjs.com")) {
    const endpointUrl = handleNpmUrl(url);
    const data = await fetchUrl(endpointUrl);
    const githubUrl = data.repository.url;
    const { repoOwner, repoName } = getRepoOwnerRepoName(githubUrl);
    return { repoOwner, repoName };
  } else if (url.includes("github.com")) {
    const { repoOwner, repoName } = getRepoOwnerRepoName(url);
    return { repoOwner, repoName };
  } else {
    return { repoOwner: undefined, repoName: undefined };
  }
}

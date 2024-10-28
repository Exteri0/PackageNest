// urlHandler.ts

import axios from "axios";

// Function to handle npm URLs
function handleNpmUrl(cliUrl: string) {
  const parts = cliUrl.split("/");
  const pkgName = parts[parts.length - 1];
  return "https://registry.npmjs.org/" + pkgName;
}

// Function to fetch data from a URL
async function fetchUrl(url: string): Promise<any> {
  const response = await axios.get(url);
  return response.data;
}

// Function to extract repository owner and name from a GitHub URL
function getRepoOwnerRepoName(url: string) {
  const parts = url.split("/");
  let repoOwner;
  let repoName;
  // Find position of github.com
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

// Main function to fetch the URL and extract repo info
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

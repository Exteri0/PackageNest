// packageUtils.ts

import * as zlib from "zlib";
import * as unzipper from "unzipper";
import { Octokit } from "@octokit/rest";
import "dotenv/config";
import { PackageJson, PackageJsonResult } from "./types.js";

// Helper function to parse package.json content
async function parsePackageJsonContent(content: string): Promise<PackageJsonResult> {
  try {
    const packageData: PackageJson = JSON.parse(content);
    const { name, version, dependencies, devDependencies, peerDependencies, optionalDependencies } = packageData;

    console.log(`Package Name: ${name}`);
    console.log(`Package Version: ${version}`);

    // Merge all dependency types
    const allDependencies: Record<string, string> = {
      ...(dependencies || {}),
      ...(devDependencies || {}),
      ...(peerDependencies || {}),
      ...(optionalDependencies || {}),
    };

    return { name, version, dependencies: allDependencies };
  } catch (error) {
    throw new Error("Failed to parse package.json content.");
  }
}

// Function to retrieve the full package.json from a GitHub repository
export async function getPackageJson(owner: string, repo: string): Promise<PackageJsonResult> {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.MY_TOKEN || "";
  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: "package.json",
    });

    // If the response is an array, it means the path is a directory
    if (Array.isArray(response.data)) {
      throw new Error("package.json is a directory or not found.");
    }

    if ("content" in response.data && response.data.content) {
      const packageJsonContent = Buffer.from(
        response.data.content,
        "base64"
      ).toString();
      return await parsePackageJsonContent(packageJsonContent);
    } else {
      throw new Error("Content is not available in package.json.");
    }
  } catch (error: any) {
    // Enhance error message based on GitHub API error status
    if (error.status === 404) {
      throw new Error("package.json not found in the repository.");
    } else if (error.status === 403) {
      throw new Error("Access forbidden. Check your GitHub token permissions.");
    } else {
      throw new Error(`GitHub API error: ${error.message}`);
    }
  }
}

// Function to retrieve package info (name and version) from a GitHub repository
export async function getPackageInfoRepo(owner: string, repo: string): Promise<{ name: string; version: string }> {
  try {
    const packageJson = await getPackageJson(owner, repo);
    return { name: packageJson.name, version: packageJson.version };
  } catch (error: any) {
    // Re-throw the error to be handled by the high-level function
    throw new Error(`Failed to retrieve package info from repository: ${error.message}`);
  }
}

// Function to retrieve package info (name and version) from a ZIP file
export async function getPackageInfoZipFile(base64String: string): Promise<{ name: string; version: string }> {
  const packageJsonPath = "package.json";
  const zipBuffer = Buffer.from(base64String, "base64");

  try {
    // Use unzipper to extract and read the package.json
    const zip = await unzipper.Open.buffer(zipBuffer);

    // Find package.json in the zip file
    const packageJsonFile = zip.files.find(
      (file: any) => file.path === packageJsonPath
    );

    if (!packageJsonFile) {
      throw new Error("package.json not found in the zip file.");
    }

    // Read and parse package.json
    const packageJsonContent = await packageJsonFile.buffer();
    const packageData = JSON.parse(packageJsonContent.toString());

    const { name, version } = packageData;

    console.log(`Package Name: ${name}`);
    console.log(`Package Version: ${version}`);

    return { name, version };
  } catch (error: any) {
    // Re-throw the error to be handled by the high-level function
    throw new Error(`Failed to retrieve package info from ZIP file: ${error.message}`);
  }
}

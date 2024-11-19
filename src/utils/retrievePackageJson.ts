import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import * as unzipper from "unzipper";
import * as types from "../utils/types.js";
import { Octokit } from "@octokit/rest";
import "dotenv/config";




// Step 2: Extract the zip file contents
export async function getPackageInfoZipFile(base64String: string) {
    const packageJsonPath = "package.json";
    const zipBuffer = Buffer.from(base64String, "base64");

    // Use unzipper to extract and read the package.json
    const zip = await unzipper.Open.buffer(zipBuffer);

    // Find package.json in the zip file
    const packageJsonFile = zip.files.find(
        (file: any) => file.path === packageJsonPath
    );

    if (!packageJsonFile) {
        throw new Error("package.json not found in the zip file.");
    }

    // Step 3: Read and parse package.json
    const packageJsonContent = await packageJsonFile.buffer();
    const packageData = JSON.parse(packageJsonContent.toString());

    // Step 4: Retrieve name and version
    const { name, version } = packageData;

    console.log(`Package Name: ${name}`);
    console.log(`Package Version: ${version}`);

    return { name, version };
}



export async function getPackageInfoRepo(owner: string, repo: string) {
  const GITHUB_TOKEN = process.env.MY_TOKEN || "";
  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: "package.json",
    });

    if (Array.isArray(response.data)) {
      throw new Error("package.json not found or is a directory.");
    }

    if ("content" in response.data) {
      const packageJsonContent = Buffer.from(
        response.data.content,
        "base64"
      ).toString();
      const packageData = JSON.parse(packageJsonContent);

      const { name, version } = packageData;
      console.log(`Package Name: ${name}`);
      console.log(`Package Version: ${version}`);

      return { name, version };
    } else {
      throw new Error("Content is not available in package.json.");
    }
  } catch (error: any) {
    // Log more details about the error
    console.error("Error fetching package.json:", error.message);

    if (error.response) {
      console.error("GitHub API response error:", error.response.status);
      console.error("GitHub API response data:", error.response.data);
    }

    throw new Error(
      `Failed to retrieve package.json from GitHub: ${error.message}`
    );
  }
}

export async function getPackageJson(owner: string, repo: string): Promise<types.PackageJsonResult | null> {
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
      console.warn("package.json is a directory or not found.");
      return null;
    }

    if ("content" in response.data && response.data.content) {
      const packageJsonContent = Buffer.from(
        response.data.content,
        "base64"
      ).toString();
      const packageData: types.PackageJson = JSON.parse(packageJsonContent);

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
    } else {
      console.warn("Content is not available in package.json.");
      return null;
    }
  } catch (error: any) {
    // Enhanced error logging
    console.error("Error fetching package.json:", error.message);

    if (error.status === 404) {
      console.error("package.json not found in the repository.");
    } else if (error.status === 403) {
      console.error("Access forbidden. Check your GitHub token permissions.");
    } else {
      console.error("GitHub API response error:", error.status);
      console.error("GitHub API response data:", error.response?.data);
    }

    return null; // Return null instead of throwing to allow graceful handling
  }
}
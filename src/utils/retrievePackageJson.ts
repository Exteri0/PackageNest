/**
 * Package JSON Retrieval Module
 * 
 * This module provides functionality to retrieve and parse `package.json` files 
 * from various sources, including GitHub repositories, ZIP files, and URLs. 
 * It also includes utility functions for downloading files and converting tarballs to ZIPs.
 */

import * as zlib from "zlib";
import * as unzipper from "unzipper";
import { Octokit } from "@octokit/rest";
import "dotenv/config";
import { PackageJson, PackageJsonResult } from "./types.js";
import tar from "tar-stream";
import AdmZip from "adm-zip";
import axios from "axios";
import { CustomError } from "./types.js"; // Ensure you have this custom error class

/**
 * Helper function to parse package.json content.
 * 
 * @param content - The content of the `package.json` file as a string.
 * @returns A promise resolving to the parsed `PackageJsonResult` object.
 * @throws An error if the content cannot be parsed.
 */
async function parsePackageJsonContent(
  content: string
): Promise<PackageJsonResult> {
  try {
    const packageData: PackageJson = JSON.parse(content);
    const {
      name,
      version,
      dependencies,
      devDependencies,
      peerDependencies,
      optionalDependencies,
    } = packageData;

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

/**
 * Retrieves the full `package.json` from a GitHub repository.
 * 
 * @param owner - The owner of the GitHub repository.
 * @param repo - The name of the GitHub repository.
 * @returns A promise resolving to the `PackageJsonResult` object.
 * @throws An error if the `package.json` cannot be retrieved.
 */
export async function getPackageJson(
  owner: string,
  repo: string
): Promise<PackageJsonResult> {
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

/**
 * Retrieves package information (name and version) from a GitHub repository.
 * 
 * @param owner - The owner of the GitHub repository.
 * @param repo - The name of the GitHub repository.
 * @returns A promise resolving to an object containing the package name and version.
 * @throws An error if the package information cannot be retrieved.
 */
export async function getPackageInfoRepo(
  owner: string,
  repo: string
): Promise<{ name: string; version: string }> {
  try {
    const packageJson = await getPackageJson(owner, repo);
    return { name: packageJson.name, version: packageJson.version };
  } catch (error: any) {
    throw new Error(
      `Failed to retrieve package info from repository: ${error.message}`
    );
  }
}

/**
 * Retrieves package information (name and version) from a ZIP file.
 * 
 * @param base64String - The ZIP file encoded as a base64 string.
 * @returns A promise resolving to an object containing the package name and version.
 * @throws An error if the `package.json` cannot be found or read in the ZIP file.
 */
export async function getPackageInfoZipFile(
  base64String: string
): Promise<{ name: string; version: string }> {
  const packageJsonPath = "package.json";
  const zipBuffer = Buffer.from(base64String, "base64");

  try {
    // Use unzipper to extract and read the package.json
    const zip = await unzipper.Open.buffer(zipBuffer);

    // Find package.json in the zip file
    const packageJsonFile = zip.files.find(
      (file: any) =>
        file.path === packageJsonPath || file.path.endsWith(`/package.json`)
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
    throw new Error(
      `Failed to retrieve package info from ZIP file: ${error.message}`
    );
  }
}

/**
 * Downloads a file from a given URL and returns its content as a Buffer.
 * 
 * @param url - The URL to download the file from.
 * @returns A promise resolving to the file content as a Buffer.
 * @throws A CustomError if the file cannot be downloaded.
 */
export async function downloadFile(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });
    return Buffer.from(response.data); // Return the binary data as a Buffer
  } catch (error: any) {
    throw new CustomError(
      `Failed to download file from URL: ${error.message}`,
      500
    );
  }
}

/**
 * Converts a tarball buffer (.tgz) to a zip buffer.
 * 
 * @param tarballBuffer - The tarball buffer.
 * @returns A promise resolving to the zip buffer.
 */
export async function convertTarballToZipBuffer(
  tarballBuffer: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const zip = new AdmZip();

    extract.on("entry", (header, stream, next) => {
      let chunks: Buffer[] = [];
      stream.on("data", (chunk) => {
        chunks.push(chunk);
      });
      stream.on("end", () => {
        const content = Buffer.concat(chunks);
        // Remove the first folder level (common in tarballs)
        const filePathParts = header.name.split("/");
        filePathParts.shift(); // Remove first directory
        const filePath = filePathParts.join("/");
        if (filePath) {
          zip.addFile(filePath, content);
        }
        next();
      });
      stream.on("error", (err) => {
        reject(err);
      });
    });

    extract.on("finish", () => {
      const zipBuffer = zip.toBuffer();
      resolve(zipBuffer);
    });

    extract.on("error", (err) => {
      reject(err);
    });

    extract.end(tarballBuffer);
  });
}

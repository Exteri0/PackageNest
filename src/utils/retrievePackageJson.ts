import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import * as unzipper from "unzipper";
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
        // Fetch the content of package.json file
        const response = await octokit.repos.getContent({
            owner,
            repo,
            path: "package.json",
        });

        // Type guard to ensure response.data is a file (not an array or directory)
        if (Array.isArray(response.data)) {
            throw new Error("package.json not found or is a directory.");
        }

        // Check if content exists
        if ("content" in response.data) {
        // The content is base64 encoded, so decode it
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
            console.error("Error fetching package.json:", error.message);
            throw error;
    }
}

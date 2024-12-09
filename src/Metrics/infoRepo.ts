/**
 * Fetch Repository Information Module
 * 
 * This file provides functionality to extract the owner and repository name 
 * from a given input. The input can be either a `.zip` file containing a `package.json` 
 * file or a URL pointing to a repository.
 */

import { urlMain } from "./urlHandler.js";
import * as fs from "fs";
import * as path from "path";
import * as unzipper from "unzipper";

const defaultOwner = "cloudinary"; // Default repository owner
const defaultName = "cloudinary_npm"; // Default repository name

/**
 * Fetches the repository owner and name from the given input.
 * 
 * The input can either be:
 * - A `.zip` file containing a `package.json` file.
 * - A URL pointing to a repository.
 * 
 * @param input - The input, either a file path or a URL.
 * @returns A promise that resolves to an object containing the repository 
 * owner and name.
 */
export async function fetchRepoInfo(
  input: string
): Promise<{ owner: string; name: string }> {
  console.log(`Fetching owner and repository name for: ${input}`);

  let owner: string = defaultOwner;
  let name: string = defaultName;

  if (fs.existsSync(input) && path.extname(input) === ".zip") {
    // Handle zip file input
    console.log(`Extracting package.json from zip file: ${input}`);
    try {
      const directory = await unzipper.Open.file(input);
      const packageJsonEntry = directory.files.find(
        (d) => d.path === "package.json"
      );

      if (packageJsonEntry) {
        const packageJsonContent = await packageJsonEntry.buffer();
        const packageJson = JSON.parse(packageJsonContent.toString());

        name = packageJson.name || defaultName;
        owner = packageJson.owner || defaultOwner;
      } else {
        console.error("package.json not found in zip file");
      }
    } catch (error: any) {
      console.error(`Error processing zip file: ${error.message}`);
    }
  } else {
    // Handle URL input
    const url = input;
    try {
      const obj = await urlMain(url);
      owner = obj?.repoOwner || defaultOwner;
      name = obj?.repoName || defaultName;
    } catch (error: any) {
      console.error(`Error fetching repository info from URL: ${error.message}`);
    }
  }

  console.log(`Fetched Owner: ${owner}, Name: ${name}`);
  return { owner, name };
}

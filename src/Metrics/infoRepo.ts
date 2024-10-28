// fetch_repo_info.ts

import { urlMain } from "./urlHandler";
import * as fs from "fs";
import * as path from "path";
import * as unzipper from "unzipper";

const defaultOwner = "cloudinary";
const defaultName = "cloudinary_npm";

export async function fetchRepoInfo(
  input: string
): Promise<{ owner: string; name: string }> {
  console.log(`Fetching owner and repository name for: ${input}`);

  let owner: string = defaultOwner;
  let name: string = defaultName;

  if (fs.existsSync(input) && path.extname(input) === ".zip") {
    // It's a zip file, extract package.json
    console.log(`Extracting package.json from zip file: ${input}`);
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
  } else {
    // Assume it's a URL
    const url = input;
    try {
      const obj = await urlMain(url);
      owner = obj?.repoOwner || defaultOwner;
      name = obj?.repoName || defaultName;
    } catch (error: any) {
      console.error(`Error fetching repository info: ${error.message}`);
    }
  }

  console.log(`Fetched Owner: ${owner}, Name: ${name}`);
  return { owner, name };
}

/**
 * License Metric Calculation Module
 * 
 * This file calculates the License metric for a given GitHub repository. 
 * The metric evaluates whether the repository's license is compatible with 
 * LGPL v2.1 based on its SPDX ID or the license information retrieved from 
 * the npm registry.
 */

import { graphql, GraphqlResponseError } from "@octokit/graphql";
import axios from "axios";
import "dotenv/config";

// Load the GitHub token from environment variables
const githubToken = process.env.MY_TOKEN || "";
if (!githubToken) {
  console.error("MY_TOKEN is not defined");
  process.exit(1);
}

// Configure GraphQL client with authentication
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

// List of SPDX IDs compatible with LGPL v2.1
const lgplCompatibleSpdxIds: string[] = [
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "MIT",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "ISC",
  "Zlib",
  "Artistic-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "MPL-2.0",
  "Unlicense",
  "CC0-1.0",
];

/**
 * Calculates the latency for an operation.
 * 
 * @param startTime - The start time of the operation in milliseconds.
 * @returns The latency in seconds, rounded to three decimal places.
 */
function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

/**
 * Calculates the License metric for a given GitHub repository.
 * 
 * The metric checks if the repository's license is compatible with LGPL v2.1. 
 * If no license information is available in the repository, it attempts to fetch 
 * the license from the npm registry based on the `package.json` name.
 * 
 * @param owner - The owner of the GitHub repository.
 * @param name - The name of the GitHub repository.
 * @returns A promise that resolves to an object containing the License score 
 * and the latency of the calculation in seconds.
 */
export async function calculateLicenseMetric(
  owner: string,
  name: string
): Promise<{ LicenseScore: number; LicenseScoreLatency: number }> {
  console.log(`Calculating license metric for ${owner}/${name}`);
  const startTime = performance.now();

  const query = `
  query {
    repository(owner: "${owner}", name: "${name}") {
      licenseInfo {
        name
        spdxId
        url
        description
      }
      mainpackage: object(expression: "main:package.json") {
        ... on Blob {
          text
        }
      }
      masterpackage: object(expression: "master:package.json") {
        ... on Blob {
          text
        }
      }
    }
  }
  `;

  console.log(`Query: ${query}`);

  try {
    const response: any = await graphqlWithAuth(query);
    console.log("License GraphQL response successful");
    const licenseInfo = response.repository.licenseInfo;
    const mainPackageJsonText = response.repository.mainpackage
      ? response.repository.mainpackage.text
      : null;
    const masterPackageJsonText = response.repository.masterpackage
      ? response.repository.masterpackage.text
      : null;

    let packageName;
    let registryLicenseName;
    if (mainPackageJsonText) {
      const mainPackageJson = JSON.parse(mainPackageJsonText);
      if (mainPackageJson.name) {
        packageName = mainPackageJson.name;
      }
    } else if (masterPackageJsonText) {
      const masterPackageJson = JSON.parse(masterPackageJsonText);
      if (masterPackageJson.name) {
        packageName = masterPackageJson.name;
      }
    }

    const licenseID = licenseInfo?.spdxId;
    const licenseName = licenseInfo?.name;

    let licenseScore = 0;
    if (licenseID && lgplCompatibleSpdxIds.includes(licenseID)) {
      console.log(`${licenseID} license is compatible with LGPL V2.1`);
      licenseScore = 1;
    } else if (
      licenseInfo == null ||
      licenseID == null ||
      licenseName == "Other"
    ) {
      if (!packageName) {
        console.log("No package.json found, unable to determine license");
        return { LicenseScore: 0, LicenseScoreLatency: getLatency(startTime) };
      }
      console.log("Checking license from registry");
      const registryLink = `https://registry.npmjs.org/${packageName}`;
      console.log(`Fetching license from registry: ${registryLink}...`);
      const registryResponse = await axios.get(registryLink);
      registryLicenseName = registryResponse.data.license;
      if (
        typeof registryLicenseName === "string" &&
        lgplCompatibleSpdxIds.includes(registryLicenseName)
      ) {
        licenseScore = 1;
        console.log(
          `${registryLicenseName} license is compatible with LGPL V2.1`
        );
      } else {
        console.log(
          `${registryLicenseName} license is not compatible with LGPL V2.1`
        );
        licenseScore = 0;
      }
    }
    return { LicenseScore: licenseScore, LicenseScoreLatency: getLatency(startTime) };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    return { LicenseScore: 0, LicenseScoreLatency: 0 };
  }
}

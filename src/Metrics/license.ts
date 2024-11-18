// license_metric.ts

import { graphql, GraphqlResponseError } from "@octokit/graphql";
import axios from "axios";
import "dotenv/config";


const githubToken = process.env.MY_TOKEN || "";
if (!githubToken) {
  console.error("MY_TOKEN is not defined");
  process.exit(1);
}

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

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

function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

export async function calculateLicenseMetric(
  owner: string,
  name: string
): Promise<{ License: number; License_Latency: number }> {
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
        return { License: 0, License_Latency: getLatency(startTime) };
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
    return { License: licenseScore, License_Latency: getLatency(startTime) };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    return { License: -1, License_Latency: 0 };
  }
}

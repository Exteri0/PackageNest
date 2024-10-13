export async function calculate_license_metric(
  owner: string | undefined,
  name: string | undefined
): Promise<{ License: number; License_Latency: number }> {
  logger?.info(`Calculating license metric for ${owner}/${name}`);
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
            json: text
          }
        }
        masterpackage: object(expression: "master:package.json") {
          ... on Blob {
            json: text
          }
        }
      }
    }
    `;
  logger?.debug(`Query: ${query}`);
  try {
    const response = await graphqlWithAuth<LicenseInfo>(query);
    logger?.info("License GraphQL response successful");
    const licenseInfo = response.repository.licenseInfo;
    const mainPackageJson = response.repository.mainpackage
      ? JSON.parse(response.repository.mainpackage.json)
      : null;
    const masterPackageJson = response.repository.masterpackage
      ? JSON.parse(response.repository.masterpackage.json)
      : null;
    let packageName;
    let registryLicenseName;
    if (mainPackageJson && mainPackageJson.name) {
      packageName = mainPackageJson.name;
    } else if (masterPackageJson && masterPackageJson.name) {
      packageName = masterPackageJson.name;
    }
    const licenseID = licenseInfo?.spdxId;
    const licenseName = licenseInfo?.name;

    let licenseScore = 0;
    if (lgplCompatibleSpdxIds.includes(licenseID)) {
      logger?.info(`${licenseID} license is compatible with LGPL V2.1`);
      licenseScore = 1;
    } else if (
      licenseInfo == null ||
      licenseID == null ||
      licenseName == "Other"
    ) {
      if (!packageName) {
        logger?.info("No package.json found, unable to determine license");
        return { License: 0, License_Latency: getLatency(startTime) };
      }
      logger?.info("Checking license from registry");
      const registry_link = `https://registry.npmjs.org/${packageName}`;
      logger?.debug(`Fetching license from registry: ${registry_link}...`);
      const registryResponse = await axios.get(registry_link);
      registryLicenseName = registryResponse.data.license;
      if (
        typeof registryLicenseName === "string" &&
        lgplCompatibleSpdxIds.includes(registryLicenseName)
      ) {
        licenseScore = 1;
        logger?.info(
          `${registryLicenseName} license is compatible with LGPL V2.1`
        );
      } else {
        logger?.info(
          `${registryLicenseName} license is not compatible with LGPL V2.1`
        );
        licenseScore = 0;
      }
    }
    return { License: licenseScore, License_Latency: getLatency(startTime) };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      logger?.error(error.message);
    } else {
      logger?.error(error);
    }
    return { License: 0, License_Latency: getLatency(startTime) };
  }
}

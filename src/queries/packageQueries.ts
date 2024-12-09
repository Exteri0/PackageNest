import { String } from "aws-sdk/clients/batch";
import { getDbPool } from "../service/databaseConnection.js";
import { PackageMetadata, PackageData, AuthenticationToken } from "../service/DefaultService.js";
import { Package, PackageQuery } from "../service/DefaultService.js";
import { CustomError } from "../utils/types.js";


/**
 * Extract a ZIP buffer to a specified directory.
 * @param conditions - where cases.
 * @param queryParams - parameters like offset and limit.
 * @param limit - the limit of the response.
 * @param offset - the number of rows to be skipped in the response.
 * @returns - the package metadata array with all matching packages.
 */
export async function getPackages(
  conditions: string[],
  queryParams: any[],
  limit: number,
  offset: number
): Promise<PackageMetadata[]> {
  const pool = getDbPool();

  // Select explicitly the columns we need
  let queryText = `SELECT package_id, name, version FROM public."packages"`;

  if (conditions.length > 0) {
    queryText += ` WHERE ${conditions.join(" AND ")}`;
  }

  queryText += ` ORDER BY package_id LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  const finalQueryParams = [...queryParams, limit, offset];

  console.log("[getPackages] Executing query:", queryText);
  console.log("[getPackages] With parameters:", JSON.stringify(finalQueryParams));

  try {
    const result = await pool.query(queryText, finalQueryParams);

    console.log("[getPackages] Query executed successfully");
    console.log(`[getPackages] Rows returned: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log("[getPackages] First returned row:", JSON.stringify(result.rows[0]));
    }

    // Map result rows to match PackageMetadata fields
    return result.rows.map((row: any) => ({
      ID: row.package_id,
      Name: row.name,
      Version: row.version
    }));
  } catch (error) {
    console.error("[getPackages] Error executing query:", error);
    throw error;
  }
}

/**
 * @param packageId 
 * @returns - the package main data for the given packageId.
 */
export const getPackageById = async (packageId: string) => {
  const query = `SELECT * FROM public."packages" WHERE pacakage_id = $1`;
  try {
    const res = await getDbPool().query(query, [packageId]);
    return res.rows[0];
  } catch (error) {
    console.error("Error fetching package by ID:", error);
    throw error;
  }
};


/**
 * 
 * @param name 
 * @returns - all matching packages whose name is equal to the given name.
 */
export const getPackageByName = async (name: string) => {
  const query = `SELECT * FROM public."packages" WHERE name = $1;`;
  try {
    const res = await getDbPool().query(query, [name]);
    return res.rows[0];
  } catch (error) {
    console.error("Error fetching package by name:", error);
    throw error;
  }
};

/**
 * 
 * @param name - name of the package whose version is changed 
 * @param version - new version of the package
 */
export const updatePackageVersion = async (name: string, version: string) => {
  const query = `UPDATE public."packages" SET version = $1, updated_at = NOW() WHERE package_id = $2;`;
  try {
    await getDbPool().query(query, [version, name]);
  } catch (error) {
    console.error("Error updating package version:", error);
    throw error;
  }
};

/**
 * LEGACY CODE FOR RATING
 * @param packageId  - ID of the package to be deleted
 * @param busFactor - bus factor of the package
 * @param correctness - correctness of the package
 * @param rampUp - ramp up of the package
 * @param licenseScore - license score of the package
 */

export const insertPackageRating = async (
  packageId: number,
  busFactor: number,
  correctness: number,
  rampUp: number,
  licenseScore: number
) => {
  const query = `INSERT INTO public."package_ratings" (package_id, bus_factor, correctness, ramp_up, license_score)
                   VALUES ($1, $2, $3, $4, $5);`;
  try {
    await getDbPool().query(query, [
      packageId,
      busFactor,
      correctness,
      rampUp,
      licenseScore,
    ]);
  } catch (error) {
    console.error("Error inserting package Rating into packages", error);
  }
};

/**
 * @param packageName - name of package to be inserted
 * @param packageVersion - version of the package to be inserted
 * @param packageId - ID of the package to be inserted
 * @param contentType - content type of the package to be inserted (true = ZIP /false = URL)
 */
export const insertPackageQuery = async (
  packageName: string | undefined,
  packageVersion: string,
  packageId: string,
  contentType: Boolean
) => {
  const query = `
      INSERT INTO public."packages" (name, version, package_id, content_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name, version) DO NOTHING
      RETURNING package_id;
    `;
  try {
    await getDbPool().query(query, [
      packageName,
      packageVersion,
      packageId,
      contentType,
    ]);
  } catch (error: any) {
    console.error(`Error inserting package query into public."packages": ${error}`);
    throw error;
  }
};

/**
 * @param packageName - name of package to be inserted
 * @param packageVersion - version of the package to be inserted
 * @param packageId - ID of the package to be inserted
 * @param readme - readme of the package to be inserted
 */

export const insertIntoMetadataQuery = async (
  packageName: string | undefined,
  packageVersion: string,
  packageId: string,
  readme: string // Added readme parameter
) => {
  const query = `
      INSERT INTO public."package_metadata" (name, version, package_id, readme)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (package_id) DO UPDATE SET
        name = EXCLUDED.name,
        version = EXCLUDED.version,
        readme = EXCLUDED.readme;
    `;
  try {
    await getDbPool().query(query, [packageName, packageVersion, packageId, readme]);
  } catch (error: any) {
    console.error(`Error inserting package metadata into package_metadata: ${error}`);
    throw error;
  }
};

/**
 * @param packageId - ID of the package to be inserted
 * @param contentType - content type of the package to be inserted (true = ZIP /false = URL)
 * @param packageURL - URL of the package to be inserted
 * @param debloat - debloat of the package to be inserted
 * @param jsProgram - js program of the package to be inserted
 */
export const insertIntoPackageDataQuery = async (
  packageId: string,
  contentType: boolean,
  packageURL: string | undefined,
  debloat: boolean,
  jsProgram: string | undefined
) => {
  const query = `
      INSERT INTO package_data (package_id, content_type, url, debloat, js_program)
      VALUES ($1, $2, $3, $4, $5);
    `;
  try {
    await getDbPool().query(query, [
      packageId,
      contentType,
      packageURL,
      debloat,
      jsProgram,
    ]);
  } catch (error: any) {
    console.error(`Error inserting package data into public."packages": ${error}`);
    throw error;
  }
};




export const getPackageDetails = async (
  packageId: string
): Promise<{ packageName: string; version: string }> => {
  const query = `SELECT name, version FROM public."packages" WHERE package_id = $1`;
  try {
    const res = await getDbPool().query(query, [packageId]);
    if (res.rows.length === 0) {
      throw new Error(`Package with ID ${packageId} not found`);
    }
    return { packageName: res.rows[0].name, version: res.rows[0].version };
  } catch (error) {
    console.error("Error fetching package details by ID:", error);
    throw error;
  }
};

/**
 * @param packageId - ID of the package to be checked
 */
export const packageExists = async (packageId: string): Promise<PackageData | boolean> => {
  console.log("Checking if package exists");
  const query = `SELECT name, version, package_id, content_type FROM public."packages" WHERE package_id = $1 LIMIT 1`;
  try {
    const res = await getDbPool().query(query, [packageId]);
    console.log("Query result:", JSON.stringify(res.rows));
    if (res.rows.length === 0) {
      return false;
    }
    else {
      return res.rows.map((row: any) => ({
        ID: row.package_id,
        Name: row.name,
        Version: row.version,
        contentType: row.content_type
        }))[0];
      }
  } catch (error:any) {
    console.error("Error checking if package exists:", error);
    throw new CustomError("Error checking if package exists", 500);
  }
};

/**
 * @param packageId - ID of the package to get the cached size for
 * @param dependency - whether to get the total cost or standalone cost
 */
export const getCachedSize = async (
  packageId: string,
  dependency: boolean
): Promise<number | undefined> => {
  const dbPool = getDbPool();
  const column = dependency ? 'total_cost' : 'standalone_cost';
  const query = `SELECT ${column} FROM package_costs WHERE package_id = $1`;
  try {
    const result = await dbPool.query(query, [packageId]);
    const size = result.rows[0]?.[column];
    return size !== null && size !== undefined ? Number(size) : undefined;
  } catch (error) {
    console.error("Error fetching cached size:", error);
    throw error;
  }
};

/**
 * 
 * @param packageId - ID of the package to set the cached size for
 * @param size - size to set
 * @param dependency - whether to set the total cost or standalone cost
 */
export const setCachedSize = async (
  packageId: string,
  size: number,
  dependency: boolean
): Promise<void> => {
  const dbPool = getDbPool();
  const column = dependency ? 'total_cost' : 'standalone_cost';
  const query = `
    INSERT INTO package_costs (package_id, ${column}, computed_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (package_id) DO UPDATE SET ${column} = $2, computed_at = NOW();
  `;
  try {
    await dbPool.query(query, [packageId, size]);
  } catch (error) {
    console.error("Error setting cached size:", error);
    throw error;
  }
};

/**
 * 
 * @param packageId - ID of the package to get the cached size for
 * @param metrics - metrics to insert
 */

export async function insertIntoPackageRatingsQuery(packageId: string, metrics: any): Promise<void> {
  console.log(`Inserting metrics into package_ratings for packageId: ${packageId}`);
  const dbPool = getDbPool();

  const query = `
    INSERT INTO public."package_ratings" (
      package_id,
      bus_factor,
      bus_factor_latency,
      correctness,
      correctness_latency,
      ramp_up,
      ramp_up_latency,
      responsive_maintainer,
      responsive_maintainer_latency,
      license_score,
      license_score_latency,
      good_pinning_practice,
      good_pinning_practice_latency,
      pull_request,
      pull_request_latency,
      net_score,
      net_score_latency
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    )
    ON CONFLICT (package_id) DO UPDATE SET
      bus_factor = EXCLUDED.bus_factor,
      bus_factor_latency = EXCLUDED.bus_factor_latency,
      correctness = EXCLUDED.correctness,
      correctness_latency = EXCLUDED.correctness_latency,
      ramp_up = EXCLUDED.ramp_up,
      ramp_up_latency = EXCLUDED.ramp_up_latency,
      responsive_maintainer = EXCLUDED.responsive_maintainer,
      responsive_maintainer_latency = EXCLUDED.responsive_maintainer_latency,
      license_score = EXCLUDED.license_score,
      license_score_latency = EXCLUDED.license_score_latency,
      good_pinning_practice = EXCLUDED.good_pinning_practice,
      good_pinning_practice_latency = EXCLUDED.good_pinning_practice_latency,
      pull_request = EXCLUDED.pull_request,
      pull_request_latency = EXCLUDED.pull_request_latency,
      net_score = EXCLUDED.net_score,
      net_score_latency = EXCLUDED.net_score_latency
  `;

  const values = [
    packageId,
    metrics.BusFactor,
    metrics.BusFactorLatency,
    metrics.Correctness,
    metrics.CorrectnessLatency,
    metrics.RampUp,
    metrics.RampUpLatency,
    metrics.ResponsiveMaintainer,
    metrics.ResponsiveMaintainerLatency,
    metrics.LicenseScore,
    metrics.LicenseScoreLatency,
    metrics.GoodPinningPractice,
    metrics.GoodPinningPracticeLatency,
    metrics.PullRequest,
    metrics.PullRequestLatency,
    metrics.NetScore,
    metrics.NetScoreLatency,
  ];

  try {
    await dbPool.query(query, values);
    console.log(`Metrics successfully inserted/updated for packageId: ${packageId}`);
  } catch (error) {
    console.error(`Error inserting metrics into package_ratings for packageId: ${packageId}`, error);
    throw error;
  }
}


// queries/packageQueries.ts

export interface PackageRatings {
  bus_factor: number;
  bus_factor_latency: number;
  correctness: number;
  correctness_latency: number;
  ramp_up: number;
  ramp_up_latency: number;
  responsive_maintainer: number;
  responsive_maintainer_latency: number;
  license_score: number;
  license_score_latency: number;
  good_pinning_practice: number;
  good_pinning_practice_latency: number;
  pull_request: number;
  pull_request_latency: number;
  net_score: number;
  net_score_latency: number;
}

/**
 * 
 * @param packageId - ID of the package to get the ratings for
 * @returns - the ratings for the given packageId
 */
export async function getPackageRatings(packageId: string): Promise<PackageRatings | null> {
  const query = `
    SELECT 
      bus_factor, bus_factor_latency,
      correctness, correctness_latency,
      ramp_up, ramp_up_latency,
      responsive_maintainer, responsive_maintainer_latency,
      license_score, license_score_latency,
      good_pinning_practice, good_pinning_practice_latency,
      pull_request, pull_request_latency,
      net_score, net_score_latency
    FROM public."package_ratings"
    WHERE package_id = $1
  `;
  const values = [packageId];
  const result = await getDbPool().query(query, values);
  console.log(`ID used: ${packageId}`);
  console.log(`Query result: ${JSON.stringify(result.rows)}`);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * 
 * @param packageId - ID of the updated package
 * @param name - name of the package to be updated
 * @param version - version of the updated package
 */
export async function updatePackageMetadata(
  packageId: string,
  name: string,
  version: string
): Promise<void> {
  try{
    const query = `
    INSERT INTO public.package_metadata (package_id, name, version) VALUES ($1, $2, $3)
    `;
    await getDbPool().query(query, [packageId, name, version]);
  }
  catch(error: any){
    console.error(`Error updating package metadata: ${error}`);
    throw new CustomError("Error updating package metadata", 500);
  }
}

/**
 * 
 * @param packageId - ID of the updated package
 * @param contentType - content type of the updated package
 * @param debloat - debloat
 * @param jsProgram - js program
 * @param url - URL if exists for the updated package
 */
export async function updatePackageData(
  packageId: string,
  contentType: boolean,
  debloat?: boolean,
  jsProgram?: string,
  url?: string
): Promise<void> {
  try {
    const query = `
    INSERT INTO public.package_data (package_id, content_type, debloat, js_program, url) VALUES ($1, $2, $3, $4, $5)
    `;
    await getDbPool().query(query, [packageId, contentType, debloat?? false, jsProgram?? null, url?? null]);
  }
  catch(error: any){
    console.error(`Error updating package data: ${error}`);
    throw new CustomError("Error updating package data", 500);
  }
}

/**
 * 
 * @param packageId - ID of the package to insert history entry for
 * @param username - username of the user who performed the action
 * @param action - action performed (e.g. UPLOAD, UPDATE, DOWNLOAD)
 */
export async function insertIntoPackageHistory(
  packageId: string,
  userName: string,
  action: string
): Promise<void> {
  try{
    const query = `
    INSERT INTO public.package_history (package_id, user_name, action)
    VALUES ($1, $2, $3);
    `;
    await getDbPool().query(query, [packageId, userName, action]);
  }
  catch (error:any){
    console.error(`Error inserting into package history: ${error}`);
    throw new CustomError("Error inserting into package history", 500);
  }
}

/**
 * 
 * @param packageId - ID of the package to get the history for
 * @returns - the history of the given packageId
 */
export async function getPackageHistory(packageId: string): Promise<{user_name: string, action: string, timestamp: string}[]> {
  try{
    const query = `
      SELECT user_name, action, action_date
      FROM public.package_history
      WHERE package_id = $1;
    `;
    const result = await getDbPool().query(query, [packageId]);
    return result.rows.map((row: any) => ({
      user_name: row.user_name,
      action: row.action,
      timestamp: row.action_date
      }));
  }
  catch (error:any){
    console.error(`Error fetching package history: ${error}`);
    throw new CustomError("Error fetching package history", 500);
  }
}

/**
 * Retrieves the uploader's username for a given package ID.
 *
 * @param packageId - The ID of the package.
 * @returns The uploader's username.
 * @throws CustomError if uploader is not found or on database errors.
 */
export async function getPackageUploader(packageId: string): Promise<string> {
  try {
    const query = `
      SELECT user_name
      FROM public.package_history
      WHERE package_id = $1 AND action = 'CREATE'
      ORDER BY action_date ASC
      LIMIT 1;
    `;
    const result = await getDbPool().query(query, [packageId]);

    if (result.rows.length === 0) {
      console.error(`Uploader not found for package ID: ${packageId}`);
      throw new CustomError("Uploader not found for the specified package.", 500);
    }

    const uploaderUsername = result.rows[0].user_name;
    console.log(`Found uploader username: ${uploaderUsername} for package ID: ${packageId}`);
    return uploaderUsername;
  } catch (error: any) {
    console.error(`Error fetching uploader for package ID ${packageId}: ${error}`);
    throw new CustomError("Error fetching uploader information.", 500);
  }
}


/**
 * 
 * @param auth - authentication token
 * @returns user name from the token
 */
export async function getUserFromToken(auth: AuthenticationToken): Promise <string> {
  const query = `SELECT name,token FROM public.authentication_tokens JOIN public.users ON public.authentication_tokens.user_id = public.users.id WHERE token = $1`;
  try{
    console.log("Getting user from token");
    const modifiedToken = auth.token.slice(7);
    console.log("Modified token:", modifiedToken);
    const result = await getDbPool().query(query, [modifiedToken]);
    console.log("Query result:", JSON.stringify(result.rows));
    if(result.rows.length === 0){
      throw new CustomError("User not found", 404);
    }
    else{
      return result.rows[0].name;
    }
  }
  catch(error: any){
    if (error instanceof CustomError){
      console.error(`Error : ${error.message}`)
      throw (error);
    }
    console.error(`Error fetching user from token: ${error}`);
    throw new CustomError("Error fetching user from token", 500);
  }
}

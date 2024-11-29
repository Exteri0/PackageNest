import { String } from "aws-sdk/clients/batch";
import { getDbPool } from "../service/databaseConnection.js";
import { Package, PackageQuery } from "../service/DefaultService.js";
import { CustomError } from "../utils/types.js";

export async function getPackages(
  conditions: string[],
  queryParams: any[],
  limit: number,
  offset: number
): Promise<Package[]> {
  const pool = getDbPool();
  let queryText = `SELECT * FROM public."packages"`;

  if (conditions.length > 0) {
    queryText += ` WHERE ${conditions.join(" AND ")}`;
  }

  queryText += ` ORDER BY package_id LIMIT $${queryParams.length + 1} OFFSET $${
    queryParams.length + 2
  }`;
  const finalQueryParams = [...queryParams, limit, offset];

  console.log("Executing query:", queryText);
  console.log("With parameters:", finalQueryParams);

  const result = await pool.query(queryText, finalQueryParams);
  return result.rows;
}

// Retrieve a package by ID
// needs to be updated to retrieve dependencies as well (a list of dependency package ids)
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

// Insert a package into RDS
export const insertPackage = async (
  packageName: string,
  packageVersion: string,
  score: number = 0.25
) => {
  const query = `INSERT INTO public."packages" (name, version, score) VALUES ($1, $2, $3) RETURNING package_id;`; // Change public."packages". to the tables you will insert into
  try {
    const res = await getDbPool().query(query, [
      packageName,
      packageVersion,
      score,
    ]);
    return res.rows[0].id;
  } catch (error) {
    console.error("Error inserting package:", error);
    throw error;
  }
};

// Retrieve a package by name
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

// Package version update
export const updatePackageVersion = async (name: string, version: string) => {
  const query = `UPDATE public."packages" SET version = $1, updated_at = NOW() WHERE package_id = $2;`;
  try {
    await getDbPool().query(query, [version, name]);
  } catch (error) {
    console.error("Error updating package version:", error);
    throw error;
  }
};

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

export const packageExistsQuery = async (
  packageId: string
): Promise<boolean> => {
  const query = `SELECT EXISTS(SELECT 1 FROM public."packages" WHERE package_id = $1);`;
  try {
    const queryRes = await getDbPool().query(query, [packageId]);
    return queryRes.rows[0].exists;
  } catch (error) {
    console.error("Error checking if package exists:", error);
    throw error;
  }
};

// Retrieve package details by packageId
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

// Check if package exists by packageId
export const packageExists = async (packageId: string): Promise<boolean> => {
  const query = `SELECT 1 FROM public."packages" WHERE package_id = $1 LIMIT 1`;
  try {
    const res = await getDbPool().query(query, [packageId]);
    return res.rowCount > 0;
  } catch (error) {
    console.error("Error checking if package exists:", error);
    throw error;
  }
};

// Get cached size
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

// Set cached size
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

import * as fs from 'fs';
import * as semver from 'semver';
import { performance } from 'perf_hooks';
import { getPackageJson } from '../utils/retrievePackageJson.js';

/**
 * Interface for the pinning score result.
 */
interface PinningResult {
  GoodPinningPractice: number;
  GoodPinningPracticeLatency: number; // in milliseconds
}

/**
 * Calculates the "Good Pinning Practice" score for a given GitHub repository.
 * @param owner - The GitHub repository owner.
 * @param name - The GitHub repository name.
 * @returns A Promise that resolves to an object containing the pinning score and latency.
 */

function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

export async function calculatePinningMetric(
  owner: string,
  name: string
): Promise<PinningResult> {
  console.log(`Calculating Good Pinning Practice for repository: ${owner}/${name}`);
  const startTime = performance.now();

  try {
    // Fetch package.json using the existing function
    console.log(`Fetching package.json for ${owner}/${name}`);
    const packageInfo = await getPackageJson(owner, name);

    if (!packageInfo) {
      console.warn(`package.json not found for ${owner}/${name}. Assigning score of 1.0`);
      return { GoodPinningPractice: 1.0, GoodPinningPracticeLatency: 0 };
    }

    const { name: packageName, version, dependencies } = packageInfo;

    const dependencyNames = Object.keys(dependencies || {});
    const totalDependencies = dependencyNames.length;

    console.log(`Total dependencies: ${totalDependencies}`);

    let score = 1.0; // Default score if no dependencies

    if (totalDependencies > 0) {
      let pinnedCount = 0;
      for (const dep of dependencyNames) {
        const versionSpec = dependencies[dep];
        console.log(`Checking dependency "${dep}" with version specifier "${versionSpec}"`);

        if (isPinnedToMajorMinor(versionSpec)) {
          console.log(`Dependency "${dep}" is properly pinned.`);
          pinnedCount++;
        } else {
          console.log(`Dependency "${dep}" is NOT properly pinned.`);
        }
      }

      score = pinnedCount / totalDependencies;
      console.log(`Pinned dependencies: ${pinnedCount} out of ${totalDependencies}`);
      console.log(`Good Pinning Practice Score: ${score.toFixed(2)}`);
    } else {
      console.log('Package has zero dependencies. Good Pinning Practice score is 1.0');
    }
    let latency:number = getLatency(startTime);
    console.log(`Good Pinning Practice calculation completed in ${latency.toFixed(2)} ms.`);

    return { GoodPinningPractice: score, GoodPinningPracticeLatency: latency };
  } catch (error) {
    console.error(`Error calculating Good Pinning Practice for ${owner}/${name}:`, error);
    return { GoodPinningPractice: -1, GoodPinningPracticeLatency: 0 };
  }
}

/**
 * Determines if a version specifier is pinned to at least a specific major and minor version.
 * @param versionSpec - The version specifier string from package.json.
 * @returns True if pinned to major.minor, false otherwise.
 */
function isPinnedToMajorMinor(versionSpec: string): boolean {
  const cleanedVersion = versionSpec.trim();

  // Check for exact version (e.g., "2.3.4")
  if (semver.valid(cleanedVersion)) {
    return true;
  }

  // Check for major.minor (e.g., "2.3"), major.minor.x (e.g., "2.3.x"), or major.minor.* (e.g., "2.3.*")
  const majorMinorRegex = /^(\d+)\.(\d+)(\.(x|\*))?$/;
  if (majorMinorRegex.test(cleanedVersion)) {
    return true;
  }

  // Not pinned to a specific major.minor version
  return false;
}
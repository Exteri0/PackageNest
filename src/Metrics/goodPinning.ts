/**
 * Good Pinning Practice Metric Calculation Module
 * 
 * This file provides functionality to calculate the "Good Pinning Practice" metric 
 * for a given GitHub repository. This metric evaluates the extent to which the 
 * dependencies in a `package.json` file are pinned to specific major and minor versions.
 * Proper pinning of dependencies helps ensure stability and reduces the risk of 
 * unexpected behavior caused by unbounded version updates.
 */

import * as fs from 'fs';
import * as semver from 'semver';
import { performance } from 'perf_hooks';
import { getPackageJson } from '../utils/retrievePackageJson.js';

/**
 * Interface for the pinning score result.
 */
interface PinningResult {
  GoodPinningPractice: number; // Metric score between 0 and 1
  GoodPinningPracticeLatency: number; // Calculation latency in seconds
}

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
 * Calculates the "Good Pinning Practice" score for a given GitHub repository.
 * 
 * The metric evaluates the ratio of dependencies in `package.json` that are 
 * properly pinned to specific major and minor versions.
 * 
 * @param owner - The owner of the GitHub repository.
 * @param name - The name of the GitHub repository.
 * @returns A promise that resolves to an object containing the pinning score 
 * and the latency of the calculation in seconds.
 */
export async function calculatePinningMetric(
  owner: string,
  name: string
): Promise<PinningResult> {
  console.log(`\n=== Calculating Good Pinning Practice for repository: ${owner}/${name} ===`);
  const startTime = performance.now();

  try {
    console.log(`Fetching package.json for ${owner}/${name}...`);
    const packageInfo = await getPackageJson(owner, name);

    if (!packageInfo) {
      console.warn(`package.json not found for ${owner}/${name}. Assigning score of 1.0`);
      return { GoodPinningPractice: 1.0, GoodPinningPracticeLatency: getLatency(startTime) };
    }

    const { name: packageName, version, dependencies } = packageInfo;

    const dependencyNames = Object.keys(dependencies || {});
    const totalDependencies = dependencyNames.length;

    console.log(`Total dependencies found: ${totalDependencies}`);

    let score = 1.0; // Default score for repositories with no dependencies

    if (totalDependencies > 0) {
      let pinnedCount = 0;
      for (const dep of dependencyNames) {
        const versionSpec = dependencies[dep];
        console.log(`Checking dependency "${dep}" with version specifier "${versionSpec}"`);

        if (isPinnedToMajorMinor(versionSpec)) {
          console.log(`"${dep}" is properly pinned to major.minor.`);
          pinnedCount++;
        } else {
          console.log(`"${dep}" is NOT properly pinned to major.minor.`);
        }
      }

      score = pinnedCount / totalDependencies;
      console.log(`Pinned dependencies: ${pinnedCount} out of ${totalDependencies}`);
      console.log(`Good Pinning Practice Score: ${score.toFixed(2)}`);
    } else {
      console.log('Package has zero dependencies. Good Pinning Practice score is 1.0');
    }

    const latency: number = getLatency(startTime);
    console.log(`Calculation completed in ${latency} seconds.\n`);

    return { GoodPinningPractice: score, GoodPinningPracticeLatency: latency };
  } catch (error) {
    console.error(`Error calculating Good Pinning Practice for ${owner}/${name}:`, error);
    const latency = getLatency(startTime);
    return { GoodPinningPractice: -1, GoodPinningPracticeLatency: latency };
  }
}

/**
 * Determines if a version specifier is pinned to at least a specific major and minor version.
 * 
 * This function handles exact versions, tilde (`~`), caret (`^`), and pre-release versions.
 * 
 * @param versionSpec - The version specifier string from the `package.json` file.
 * @returns True if the version is pinned to a specific major and minor version, false otherwise.
 */
function isPinnedToMajorMinor(versionSpec: string): boolean {
  const trimmed = versionSpec.trim();

  // Exact version (e.g., "2.3.4" or "2.3.4-beta.1")
  if (semver.valid(trimmed)) {
    return true;
  }

  // Create a semver Range object with pre-releases included
  let range: semver.Range;
  try {
    range = new semver.Range(trimmed, { includePrerelease: true });
  } catch (err) {
    console.warn(`Invalid semver range "${trimmed}". Considering as not pinned.`);
    return false;
  }

  // Extract all comparators from the range
  const comparators: semver.Comparator[] = range.set.flatMap(compSet => compSet);

  // Initialize variables to track the minimum and maximum bounds
  let minVersion: semver.SemVer | null = null;
  let maxVersion: semver.SemVer | null = null;

  // Iterate through comparators to determine min and max versions
  for (const comp of comparators) {
    const operator = comp.operator;
    const semverVersion = comp.semver;

    if (operator === '>=' || operator === '>') {
      if (!minVersion || semver.gt(semverVersion, minVersion)) {
        minVersion = semverVersion;
      }
    }

    if (operator === '<=' || operator === '<') {
      if (!maxVersion || semver.lt(semverVersion, maxVersion)) {
        maxVersion = semverVersion;
      }
    }
  }

  // If the range is unbounded on either side, it's not pinned
  if (!minVersion || !maxVersion) {
    return false;
  }

  // Check if the range is within the same major.minor version
  if (minVersion.major !== maxVersion.major || minVersion.minor + 1 !== maxVersion.minor) {
    return false;
  }

  // Ensure that the maxVersion is the start of the next minor version
  if (maxVersion.patch !== 0 || maxVersion.prerelease.length > 0) {
    return false;
  }

  // All checks passed; the range is pinned to major.minor
  return true;
}

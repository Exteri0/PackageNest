// rampup_metric.ts

import axios from "axios";
import AdmZip from "adm-zip";
import * as fs from "fs/promises";
import os from "os";
import * as path from "path";
import { performance } from "perf_hooks";

/**
 * Utility function to calculate latency in seconds.
 * @param startTime - The start time in milliseconds.
 * @returns Latency in seconds, rounded to three decimal places.
 */
function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

/**
 * Downloads the repository as a zip archive from GitHub.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @returns The path to the downloaded zip file.
 */
async function downloadRepoZip(owner: string, repo: string): Promise<string> {
  const zipPath = path.join(os.tmpdir(), `${owner}-${repo}.zip`);
  const downloadUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;

  console.log(`Downloading repository zip from ${downloadUrl}`);

  const response = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `token ${process.env.MY_TOKEN}`, // Ensure you have a valid token
      "User-Agent": "ramp-up-metric-calculator",
    },
  });

  await fs.writeFile(zipPath, response.data);
  console.log(`Repository zip downloaded to ${zipPath}`);
  return zipPath;
}

/**
 * Extracts the downloaded zip archive to a temporary directory.
 * @param zipPath - Path to the zip archive.
 * @returns The path to the extracted repository directory.
 */
async function extractRepoZip(zipPath: string): Promise<string> {
  const extractDir = path.join(os.tmpdir(), `repo-${Date.now()}`);
  await fs.mkdir(extractDir, { recursive: true });

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractDir, true);
  console.log(`Repository extracted to ${extractDir}`);

  // GitHub adds a prefix to the extracted directory; find it
  const extractedContents = await fs.readdir(extractDir);
  if (extractedContents.length !== 1) {
    throw new Error("Unexpected zip archive structure.");
  }

  const repoDir = path.join(extractDir, extractedContents[0]);
  return repoDir;
}

/**
 * Calculates the ramp-up metric for a given repository.
 * @param owner - Repository owner.
 * @param name - Repository name.
 * @returns An object containing the ramp-up score and latency.
 */

export async function calculateRampUpMetric(
  owner: string,
  name: string
): Promise<{ RampUp: number; RampUpLatency: number }> {
  console.log(`Calculating ramp-up metric for ${owner}/${name}`);
  const startTime = performance.now();

  let zipPath = "";
  let repoDir = "";

  try {
    // Step 1: Download the repository as a zip archive
    zipPath = await downloadRepoZip(owner, name);

    // Step 2: Extract the zip archive
    repoDir = await extractRepoZip(zipPath);

    // Step 3: Perform analysis
    const rampUpScore = await analyzeRepoStatic(repoDir);
    console.log(`Ramp-up score calculated: ${rampUpScore}`);

    return {
      RampUp: Number(rampUpScore.toFixed(3)),
      RampUpLatency: getLatency(startTime),
    };
  } catch (error) {
    console.error(`Error calculating ramp-up metric:`, error);
    return { RampUp: -1, RampUpLatency: 0 };
  } finally {
    // Step 5: Clean up temporary files
    try {
      if (zipPath) {
        await fs.unlink(zipPath);
        console.log(`Deleted zip file at ${zipPath}`);
      }
      if (repoDir) {
        await fs.rm(repoDir, { recursive: true, force: true });
        console.log(`Deleted repository directory at ${repoDir}`);
      }
    } catch (cleanupError) {
      console.error(`Error during cleanup:`, cleanupError);
    }
  }
}

/**
 * Analyzes the repository to calculate the ramp-up score.
 * @param repoDir - Path to the extracted repository directory.
 * @returns The ramp-up score.
 */
async function analyzeRepoStatic(repoDir: string): Promise<number> {
  const weights = {
    documentation: 0.4,
    examples: 0.3,
    complexity: 0.3,
  };
  try {
    // Get all files in the repository
    const allFiles = await getAllFilesStatic(repoDir);
    console.log(`Total files found: ${allFiles.length}`);

    // Analyze documentation files
    const docFiles = allFiles.filter((file) => isDocumentationFile(file.path));
    const docScore = weights.documentation * Math.min(docFiles.length / 5, 1);
    console.log(`Documentation files found: ${docFiles.length}`);

    // Analyze example files
    const exampleFiles = allFiles.filter((file) => isExampleFile(file.path));
    const exScore = weights.examples * Math.min(exampleFiles.length / 5, 1);
    console.log(`Example files found: ${exampleFiles.length}`);

    // Analyze code complexity
    const complexityScore =
      weights.complexity * (await analyzeComplexityStatic(allFiles));
    console.log(`Complexity score: ${complexityScore}`);

    // Check for good project structure
    const structureBonus = (await hasGoodStructure(allFiles)) ? 0.1 : 0;
    console.log(`Structure bonus: ${structureBonus}`);

    const totalScore = docScore + exScore + complexityScore + structureBonus;
    console.log(
      `Total ramp-up score: ${totalScore} (Documentation: ${docScore}, Examples: ${exScore}, Complexity: ${complexityScore}, Structure Bonus: ${structureBonus})`
    );

    return Math.max(0, Math.min(1, totalScore));
  } catch (error) {
    console.error(`Error in analyzeRepoStatic:`, error);
    return 0;
  }
}

/**
 * Recursively retrieves all file paths in the repository.
 * @param dir - Directory path.
 * @returns An array of file objects with their paths.
 */
async function getAllFilesStatic(dir: string): Promise<Array<{ path: string }>> {
  let allFiles: Array<{ path: string }> = [];
  try {
    const dirEntries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of dirEntries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await getAllFilesStatic(fullPath);
        allFiles = allFiles.concat(subFiles);
      } else {
        allFiles.push({ path: fullPath });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  return allFiles;
}

/**
 * Determines if a file is a documentation file.
 * @param filePath - File path.
 * @returns True if it's a documentation file, false otherwise.
 */
function isDocumentationFile(filePath: string): boolean {
  const docFilePatterns = [
    /README/i,
    /CHANGELOG/i,
    /CONTRIBUTING/i,
    /LICENSE/i,
    /doc/i,
    /guide/i,
    /\.(md|markdown|txt|rst|adoc|wiki)$/i,
  ];
  return docFilePatterns.some((pattern) => pattern.test(filePath));
}

/**
 * Determines if a file is an example file.
 * @param filePath - File path.
 * @returns True if it's an example file, false otherwise.
 */
function isExampleFile(filePath: string): boolean {
  const exampleFilePatterns = [
    /example/i,
    /demo/i,
    /sample/i,
    /tutorial/i,
    /quickstart/i,
    /getting-started/i,
    /usage/i,
    /test.*\.js/i,
  ];
  return exampleFilePatterns.some((pattern) => pattern.test(filePath));
}

/**
 * Analyzes code complexity based on the number of code files.
 * @param allFiles - Array of all file objects.
 * @returns A complexity score between 0 and 1.
 */
async function analyzeComplexityStatic(
  allFiles: Array<{ path: string }>
): Promise<number> {
  const codeFiles = allFiles.filter((entry) =>
    /\.(ts|js|jsx|tsx|py|java|c|cpp|cs)$/i.test(entry.path)
  );
  console.log(`Code files found: ${codeFiles.length}`);
  // A lot of files means high code complexity
  return 1 - Math.min(codeFiles.length / 1000, 1);
}

/**
 * Checks if the repository has a good project structure.
 * @param allFiles - Array of all file objects.
 * @returns True if the structure is good, false otherwise.
 */
async function hasGoodStructure(
  allFiles: Array<{ path: string }>
): Promise<boolean> {
  const importantDirs = ["src", "lib", "test", "docs", "examples"];
  const filePaths = allFiles.map((file) => file.path.toLowerCase());
  return importantDirs.every((dir) =>
    filePaths.some((filePath) => filePath.includes(`/${dir}/`))
  );
}

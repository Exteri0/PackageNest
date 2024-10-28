// rampup_metric.ts

import * as git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import * as path from "path";
import { s3fs } from "./customS3Fs"; // Import the s3fs instance
import { promisify } from "util";

const defaultOwner = "cloudinary";
const defaultName = "cloudinary_npm";

function getLatency(startTime: number): number {
  return Number(((Date.now() - startTime) / 1000).toFixed(3));
}

export async function calculateRampUpMetric(
  owner: string = defaultOwner,
  name: string = defaultName
): Promise<{ RampUp: number; RampUp_Latency: number }> {
  console.log(`Calculating ramp-up metric for ${owner}/${name}`);
  const startTime = Date.now();

  const repoDir = `/${owner}/${name}`;

  try {
    // Clone the repository using isomorphic-git with custom fs
    console.log(`Cloning repository https://github.com/${owner}/${name}.git`);
    await git.clone({
      fs: s3fs,
      http,
      dir: repoDir,
      url: `https://github.com/${owner}/${name}.git`,
      singleBranch: true,
      depth: 1,
    });
    console.log(`Successfully cloned ${owner}/${name}`);

    // Proceed with analysis using s3fs
    const rampUpScore = await analyzeRepoStatic(repoDir, s3fs);
    console.log(`Ramp-up score calculated: ${rampUpScore}`);

    // Clean up the repository from S3
    await s3fs.rmdir(repoDir);
    console.log(`Cleaned up repository ${repoDir} from S3`);

    return {
      RampUp: Number(rampUpScore.toFixed(3)),
      RampUp_Latency: getLatency(startTime),
    };
  } catch (error) {
    console.error(`Error calculating ramp-up metric:`, error);
    return { RampUp: 0, RampUp_Latency: getLatency(startTime) };
  }
}

async function analyzeRepoStatic(repoDir: string, fs: any): Promise<number> {
  const weights = {
    documentation: 0.4,
    examples: 0.3,
    complexity: 0.3,
  };
  try {
    // List branches
    const branches = await git.listBranches({
      fs,
      dir: repoDir,
      remote: "origin",
    });
    console.log(`Remote branches found: ${branches.join(", ")}`);

    // Use the default branch ('main' or 'master') or the first branch
    const defaultBranch =
      branches.find((b: string) => ["main", "master"].includes(b)) ||
      branches[0];
    if (!defaultBranch) {
      throw new Error("No branches found");
    }
    console.log(`Using branch: ${defaultBranch}`);

    // Checkout the default branch
    await git.checkout({
      fs,
      dir: repoDir,
      ref: defaultBranch,
    });

    // Get all files in the repository
    const allFiles = await getAllFilesStatic(repoDir, fs);
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

async function getAllFilesStatic(
  dir: string,
  fs: any
): Promise<Array<{ path: string }>> {
  let allFiles: Array<{ path: string }> = [];
  try {
    const dirEntries = await fs.readdir(dir);
    for (const entry of dirEntries) {
      const fullPath = path.posix.join(dir, entry);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        const subFiles = await getAllFilesStatic(fullPath, fs);
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

async function hasGoodStructure(
  allFiles: Array<{ path: string }>
): Promise<boolean> {
  const importantDirs = ["src", "lib", "test", "docs", "examples"];
  const filePaths = allFiles.map((file) => file.path.toLowerCase());
  return importantDirs.every((dir) =>
    filePaths.some((filePath) => filePath.startsWith(`/${dir}/`))
  );
}

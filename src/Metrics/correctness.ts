/**
 * Correctness Metric Calculation Module
 * 
 * This file calculates the Correctness metric for a given GitHub repository. 
 * The Correctness metric is a measure of the repository's reliability and 
 * maintenance activity, determined based on issue handling, pull requests, 
 * release frequency, and recent commit history.
 */

import { graphql, GraphqlResponseError } from "@octokit/graphql";
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
 * Calculates the Correctness metric for a GitHub repository.
 * 
 * The metric is derived based on the ratio of closed to total issues, 
 * the ratio of releases to total pull requests, and the frequency of recent 
 * commits (over the past 30 days). It represents the repository's level of 
 * activity and maintenance quality.
 * 
 * @param owner - The owner of the GitHub repository.
 * @param name - The name of the GitHub repository.
 * @returns A promise that resolves to an object containing the Correctness score 
 * (ranging from 0 to 1) and the latency of the calculation in seconds.
 */
export async function calculateCorrectnessMetric(
  owner: string,
  name: string
): Promise<{ Correctness: number; CorrectnessLatency: number }> {
  console.log(`Calculating correctness metric for ${owner}/${name}`);
  const startTime = performance.now();

  // GraphQL query to fetch repository data
  const query = `
  query {
    repository(owner: "${owner}", name: "${name}") {
      issues(states: OPEN) {
        totalCount
      }
      closedIssues: issues(states: CLOSED) {
        totalCount
      }
      pullRequests(states: OPEN) {
        totalCount
      }
      releases {
        totalCount
      }
      defaultBranchRef {
        target {
          ... on Commit {
            history(since: "${new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000
            ).toISOString()}") {
              totalCount
            }
          }
        }
      }
    }
  }
  `;

  console.log(`Query: ${query}`);
  
  try {
    const response: any = await graphqlWithAuth(query);
    console.log("Correctness GraphQL response successful");

    const repo = response.repository;
    const openIssues = repo.issues.totalCount;
    const closedIssues = repo.closedIssues.totalCount;
    const openPullRequests = repo.pullRequests.totalCount;
    const releases = repo.releases.totalCount;
    const recentCommits = repo.defaultBranchRef.target.history.totalCount;

    // Calculate issue ratio
    const issueRatio = closedIssues / (openIssues + closedIssues) || 0;
    // Calculate PR ratio
    const prRatio = releases / (openPullRequests + releases) || 0;
    // Calculate recent commit ratio (past 30 days and max at 1)
    const recentCommitRatio = Math.min(recentCommits / 30, 1);

    // Calculate correctness score (ensuring it's between 0 and 1)
    const correctnessScore = Number(
      Math.max(
        0,
        Math.min((issueRatio + prRatio + recentCommitRatio) / 3, 1)
      ).toFixed(3)
    );

    console.log(`Correctness score calculated: ${correctnessScore}`);

    return {
      Correctness: correctnessScore,
      CorrectnessLatency: getLatency(startTime),
    };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    return { Correctness: 0, CorrectnessLatency: getLatency(startTime) };
  }
}

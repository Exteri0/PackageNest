// correctness_metric.ts

import { graphql, GraphqlResponseError } from "@octokit/graphql";
import "dotenv/config";

const defaultOwner = "cloudinary";
const defaultName = "cloudinary_npm";

const githubToken = process.env.MY_GITHUB_TOKEN || "";
if (!githubToken) {
  console.error("GITHUB_TOKEN is not defined");
  process.exit(1);
}

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

export async function calculateCorrectnessMetric(
  owner: string = defaultOwner,
  name: string = defaultName
): Promise<{ Correctness: number; Correctness_Latency: number }> {
  console.log(`Calculating correctness metric for ${owner}/${name}`);
  const startTime = performance.now();

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
      Correctness_Latency: getLatency(startTime),
    };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    return { Correctness: 0, Correctness_Latency: getLatency(startTime) };
  }
}

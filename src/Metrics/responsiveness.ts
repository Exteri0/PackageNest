// responsiveness_metric.ts

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

export async function calculateResponsivenessMetric(
  owner: string = defaultOwner,
  name: string = defaultName
): Promise<{
  ResponsiveMaintainer: number;
  ResponsiveMaintainer_Latency: number;
}> {
  console.log(`Calculating responsiveness metric for ${owner}/${name}`);
  const startTime = performance.now();

  const query = `
  query {
    repository(owner: "${owner}", name: "${name}") {
      pullRequests(first: 100, states: [OPEN, MERGED, CLOSED]) {
        totalCount
        edges {
          node {
            createdAt
            closedAt
            mergedAt
            state
          }
        }
      }
      issues(first: 100, states: [OPEN, CLOSED]) {
        totalCount
        edges {
          node {
            createdAt
            closedAt
            state
          }
        }
      }
    }
  }
  `;
  console.log(`Query: ${query}`);
  try {
    const response: any = await graphqlWithAuth(query);
    console.log("Responsiveness GraphQL response successful");
    const pullRequests = response.repository.pullRequests.edges;
    const issues = response.repository.issues.edges;

    // Base case: if there are no pull requests and no issues
    if (
      response.repository.pullRequests.totalCount === 0 &&
      response.repository.issues.totalCount === 0
    ) {
      console.log(
        `Responsiveness score is 0: No pull requests or issues found`
      );
      return {
        ResponsiveMaintainer: 0,
        ResponsiveMaintainer_Latency: getLatency(startTime),
      };
    }
    // Pull Requests
    let totalPrResponseTime = 0;
    let resolvedPrs = 0;

    pullRequests.forEach((pr: any) => {
      if (pr.node.closedAt || pr.node.mergedAt) {
        const createdAt = pr.node.createdAt
          ? new Date(pr.node.createdAt).getTime()
          : 0;
        const closedOrMergedAt =
          pr.node.closedAt || pr.node.mergedAt
            ? new Date(pr.node.closedAt || pr.node.mergedAt).getTime()
            : 0;

        totalPrResponseTime += closedOrMergedAt - createdAt;
        resolvedPrs++;
      }
    });

    const avgPrResponseTime =
      resolvedPrs > 0 ? totalPrResponseTime / resolvedPrs : Infinity;

    // Issues
    let totalIssueResponseTime = 0;
    let resolvedIssues = 0;

    issues.forEach((issue: any) => {
      if (issue.node.closedAt) {
        const createdAt = new Date(issue.node.createdAt).getTime();
        const closedAt = new Date(issue.node.closedAt).getTime();
        totalIssueResponseTime += closedAt - createdAt;
        resolvedIssues++;
      }
    });

    // Base case: if all pull requests and issues are open
    if (resolvedPrs === 0 && resolvedIssues === 0) {
      console.log(
        `Responsiveness score is 0: No closed pull requests or issues`
      );
      return {
        ResponsiveMaintainer: 0,
        ResponsiveMaintainer_Latency: getLatency(startTime),
      };
    }

    const avgIssueResponseTime =
      resolvedIssues > 0 ? totalIssueResponseTime / resolvedIssues : Infinity;

    console.log(`Average PR response time: ${avgPrResponseTime} ms`);
    console.log(`Average Issue response time: ${avgIssueResponseTime} ms`);
    // Responsiveness score
    let responsivenessScore = 0;

    const maxAcceptableResponseTime = 86400000 * 7; // 7 days
    if (
      avgPrResponseTime < maxAcceptableResponseTime &&
      avgIssueResponseTime < maxAcceptableResponseTime
    ) {
      responsivenessScore = 1;
    } else if (
      avgPrResponseTime < maxAcceptableResponseTime ||
      avgIssueResponseTime < maxAcceptableResponseTime
    ) {
      responsivenessScore = 0.7;
    } else {
      responsivenessScore = 0.3;
    }
    console.log(`Responsiveness score calculated: ${responsivenessScore}`);

    return {
      ResponsiveMaintainer: responsivenessScore,
      ResponsiveMaintainer_Latency: getLatency(startTime),
    };
  } catch (error) {
    console.error(error);
    return {
      ResponsiveMaintainer: 0,
      ResponsiveMaintainer_Latency: getLatency(startTime),
    };
  }
}

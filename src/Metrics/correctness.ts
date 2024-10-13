import { graphql, GraphqlResponseError } from "@octokit/graphql";



export interface CorrectnessInterface {
  repository: {
    issues: {
      totalCount: number;
    };
    closedIssues: {
      totalCount: number;
    };
    pullRequests: {
      totalCount: number;
    };
    releases: {
      totalCount: number;
    };
    defaultBranchRef: {
      target: {
        history: {
          totalCount: number;
        };
      };
    };
  };
}

function getLatency(startTime: number): number {
  return performance.now() - startTime;
}

export async function getCorrectnessJSON(
  owner: string = "cloudinary",
  name: string = "cloudinary_npm",
  token: string | undefined = process.env.GITHUB_TOKEN
): Promise<{ Correctness: number; Correctness_Latency: number }> {
  const startTime = performance.now();
  if (!token) {
    console.log("GITHUB_TOKEN is not defined");
    process.exit(1);
  } else if (!token.includes("ghp_")) {
    console.log("Invalid GITHUB_TOKEN");
    process.exit(1);
  }

  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
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
  }`;

  try {
    const response = await graphqlWithAuth<CorrectnessInterface>(query);
    const repo = response.repository;

    const openIssues = repo.issues.totalCount;
    const closedIssues = repo.closedIssues.totalCount;
    const openPullRequests = repo.pullRequests.totalCount;
    const releases = repo.releases.totalCount;
    const recentCommits = repo.defaultBranchRef.target.history.totalCount;

    const issueRatio = closedIssues / (openIssues + closedIssues) || 0;
    const prRatio = releases / (openPullRequests + releases) || 0;
    const recentCommitRatio = Math.min(recentCommits / 30, 1);

    const correctnessScore = Number(
      Math.max(
        0,
        Math.min((issueRatio + prRatio + recentCommitRatio) / 3)
      ).toFixed(3)
    );

    return {
      Correctness: correctnessScore,
      Correctness_Latency: getLatency(startTime),
    };
  } catch (error) {
    console.error("Error fetching correctness data:", error);
    return {
      Correctness: 0,
      Correctness_Latency: getLatency(startTime),
    };
  }
}

import { graphql, GraphqlResponseError } from '@octokit/graphql';
import { performance } from 'perf_hooks';
import 'dotenv/config';

const githubToken = process.env.MY_TOKEN || "";
if (!githubToken) {
  console.error("MY_TOKEN is not defined");
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

export async function calculatePullRequestMetric(
  owner: string,
  name: string
): Promise<{ PullRequest: number; PullRequestLatency: number }> {
  console.log(`Calculating Pull Request metric for ${owner}/${name}`);
  const startTime = performance.now();

  try {
    let totalAdditions = 0;
    let reviewedAdditions = 0;
    let hasNextPage = true;
    let afterCursor = null;
    let pageCount = 0; // Track the number of pages processed
    const maxPages = 5; // Limit to the most recent 1000 pull requests

    while (hasNextPage && pageCount < maxPages) {
      const query = `
        query($owner: String!, $name: String!, $afterCursor: String) {
          repository(owner: $owner, name: $name) {
            pullRequests(first: 100, states: MERGED, after: $afterCursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  additions
                  reviews(first: 1) {
                    totalCount
                  }
                }
              }
            }
          }
        }
      `;

      const variables = {
        owner,
        name,
        afterCursor,
      };

      console.log(`Fetching page ${pageCount + 1} of pull requests...`);

      const response: any = await graphqlWithAuth(query, variables);

      const pullRequests = response.repository.pullRequests.edges;
      console.log(`Fetched ${pullRequests.length} pull requests in this batch.`);

      for (const prEdge of pullRequests) {
        const pr = prEdge.node;
        const additions = pr.additions || 0;
        totalAdditions += additions;
        if (pr.reviews.totalCount > 0) {
          reviewedAdditions += additions;
        }
      }

      hasNextPage = response.repository.pullRequests.pageInfo.hasNextPage;
      afterCursor = response.repository.pullRequests.pageInfo.endCursor;
      pageCount++;

      console.log(`Total additions so far: ${totalAdditions}`);
      console.log(`Reviewed additions so far: ${reviewedAdditions}`);
    }

    if (totalAdditions === 0) {
      console.log("No additions found in PRs.");
      return { PullRequest: 0, PullRequestLatency: getLatency(startTime) };
    }

    const pullRequestScore = Number((reviewedAdditions / totalAdditions).toFixed(3));

    console.log(`Pull Request score calculated: ${pullRequestScore}`);

    return { PullRequest: pullRequestScore, PullRequestLatency: getLatency(startTime) };

  } catch (error) {
    console.error(`Error calculating Pull Request metric:`, error);
    return { PullRequest: -1, PullRequestLatency: getLatency(startTime) };
  }
}

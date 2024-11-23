// busFactor.ts

import { graphql, GraphqlResponseError } from '@octokit/graphql';
import { performance } from 'perf_hooks';
import 'dotenv/config';

const githubToken = process.env.MY_TOKEN || '';
if (!githubToken) {
  console.error('MY_TOKEN is not defined');
  process.exit(1);
}

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

interface BusFactorResult {
  BusFactor: number;
  BusFactor_Latency: number; // in seconds
}

function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

export async function calculateBusFactorMetric(
  owner: string,
  repo: string
): Promise<BusFactorResult> {
  console.log(`Calculating Bus Factor for repository: ${owner}/${repo}`);
  const startTime = performance.now();

  try {
    const contributors = await fetchContributors(owner, repo);
    if (contributors.length === 0) {
      console.warn('No contributors found. Assigning Bus Factor score of 0.');
      return { BusFactor: 0, BusFactor_Latency: getLatency(startTime) };
    }

    // Calculate total contributions
    const totalContributions = contributors.reduce(
      (sum, contributor) => sum + contributor.contributions,
      0
    );

    // Sort contributors by contributions in descending order
    contributors.sort((a, b) => b.contributions - a.contributions);

    // Determine the minimal number of contributors responsible for at least 50% of the contributions
    let cumulativeContributions = 0;
    let keyContributors = 0;
    for (const contributor of contributors) {
      cumulativeContributions += contributor.contributions;
      keyContributors++;
      if (cumulativeContributions >= totalContributions / 2) {
        break;
      }
    }

    const busFactorScore = 1 - keyContributors / contributors.length;
    console.log(`Bus Factor score calculated: ${busFactorScore.toFixed(3)}`);

    return {
      BusFactor: Number(busFactorScore.toFixed(3)),
      BusFactor_Latency: getLatency(startTime),
    };
  } catch (error) {
    console.error(
      `Error calculating Bus Factor for ${owner}/${repo}:`,
      error instanceof Error ? error.message : error
    );
    return { BusFactor: -1, BusFactor_Latency: getLatency(startTime) };
  }
}

/**
 * Fetches the list of contributors from the GitHub GraphQL API.
 * @param owner - Repository owner.
 * @param repo - Repository name.
 * @returns An array of contributors with their contribution counts.
 */
async function fetchContributors(
  owner: string,
  repo: string
): Promise<Array<{ login: string; contributions: number }>> {
  const contributorsMap: { [login: string]: number } = {};
  let hasNextPage = true;
  let cursor: string | null = null;
  const maxIterations = 10; // To prevent excessive API calls

  console.log('Fetching contributors from GitHub GraphQL API...');

  for (let i = 0; hasNextPage && i < maxIterations; i++) {
    const query = `
      query($owner: String!, $repo: String!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100, after: $cursor) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    author {
                      user {
                        login
                      }
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      owner,
      repo,
      cursor,
    };

    try {
      const response: any = await graphqlWithAuth(query, variables);

      const history = response.repository.defaultBranchRef.target.history;
      const nodes = history.nodes;

      for (const node of nodes) {
        let login = 'unknown';
        if (node.author.user && node.author.user.login) {
          login = node.author.user.login;
        } else if (node.author.name) {
          login = node.author.name;
        }

        if (contributorsMap[login]) {
          contributorsMap[login] += 1;
        } else {
          contributorsMap[login] = 1;
        }
      }

      hasNextPage = history.pageInfo.hasNextPage;
      cursor = history.pageInfo.endCursor;
    } catch (error) {
      console.error('Error fetching contributors:', error);
      throw error;
    }
  }

  const contributors = Object.entries(contributorsMap).map(([login, contributions]) => ({
    login,
    contributions,
  }));

  console.log(`Total contributors fetched: ${contributors.length}`);
  return contributors;
}

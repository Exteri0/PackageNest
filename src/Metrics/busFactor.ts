/**
 * Bus Factor Metric Calculation Module
 * 
 * This file provides functionality to calculate the Bus Factor metric for a 
 * given GitHub repository. The Bus Factor is a measure of risk associated with 
 * knowledge concentration in a small number of contributors to a codebase.
 * 
 * The calculation involves fetching contributors' commit data using the GitHub 
 * GraphQL API, determining the proportion of contributions made by key contributors, 
 * and computing a metric score based on their relative contribution.
 */

import { graphql, GraphqlResponseError } from '@octokit/graphql';
import { performance } from 'perf_hooks';
import 'dotenv/config';

// Load the GitHub token from environment variables
const githubToken = process.env.MY_TOKEN || '';
if (!githubToken) {
  console.error('MY_TOKEN is not defined');
  process.exit(1);
}

// Configure GraphQL client with authentication
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

// Interface to store the Bus Factor result and latency information
interface BusFactorResult {
  BusFactor: number;
  BusFactorLatency: number; // Latency in seconds
}

/**
 * Calculates the latency for an operation.
 * @param startTime - The start time of the operation in milliseconds.
 * @returns The latency in seconds, rounded to three decimal places.
 */
function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

/**
 * Calculates the Bus Factor metric for a GitHub repository.
 * 
 * @param owner - The owner of the GitHub repository.
 * @param repo - The name of the GitHub repository.
 * @returns A promise that resolves to a BusFactorResult object containing 
 * the Bus Factor score and the latency of the calculation.
 */
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
      return { BusFactor: 0, BusFactorLatency: getLatency(startTime) };
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
      BusFactorLatency: getLatency(startTime),
    };
  } catch (error) {
    console.error(
      `Error calculating Bus Factor for ${owner}/${repo}:`,
      error instanceof Error ? error.message : error
    );
    return { BusFactor: -1, BusFactorLatency: getLatency(startTime) };
  }
}

/**
 * Fetches the list of contributors for a GitHub repository using the GitHub GraphQL API.
 * 
 * @param owner - The owner of the GitHub repository.
 * @param repo - The name of the GitHub repository.
 * @returns A promise that resolves to an array of contributors, each with their 
 * username and contribution count.
 */
async function fetchContributors(
  owner: string,
  repo: string
): Promise<Array<{ login: string; contributions: number }>> {
  const contributorsMap: { [login: string]: number } = {};
  let hasNextPage = true;
  let cursor: string | null = null;
  const maxIterations = 10; // To limit excessive API calls

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

    const variables = { owner, repo, cursor };

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

        contributorsMap[login] = (contributorsMap[login] || 0) + 1;
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

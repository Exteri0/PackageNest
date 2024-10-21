import { graphql, GraphqlResponseError } from "@octokit/graphql";
import logger from "../logger.js";

// define interface
export interface BusFactorInterface {
  repository: {
    collaborators: {
      edges: Array<{
        node: {
          login: string;
          contributionsCollection: {
            totalCommitContributions: number;
          };
        };
      }>;
    };
  };
}

// calculates latency
function getLatency(startTime: number): number {
  return performance.now() - startTime;
}

// calculates the bus factor 
export async function getBusFactorJSON(
  owner: string = "cloudinary",
  name: string = "cloudinary_npm",
  token: string | undefined = process.env.GITHUB_TOKEN
): Promise<{ BusFactor: number; BusFactor_Latency: number }> {
  const startTime = performance.now();
  logger.info(`Calculating bus factor for ${owner}/${name}`);

  // Validate the token
  if (!token) {
    logger.error("GITHUB_TOKEN is not defined");
    process.exit(1);
  } else if (!token.includes("ghp_")) {
    logger.error("Invalid GITHUB_TOKEN");
    process.exit(1);
  }

  // Set up GraphQL with authentication
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  // define the GraphQL query
  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        collaborators(first: 100) {
          edges {
            node {
              login
              contributionsCollection {
                totalCommitContributions
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    owner: owner,
    repo: name,
  };

  try {
    // execute the GraphQL query
    const response = await graphqlWithAuth<BusFactorInterface>(query, variables);
    logger.info("GraphQL query executed successfully");

    const collaborators = response.repository.collaborators.edges.map((edge) => ({
      login: edge.node.login,
      contributions: edge.node.contributionsCollection.totalCommitContributions,
    }));

    // check if no contributors were found
    if (collaborators.length === 0) {
      logger.warn("No contributors found.");
      return {
        BusFactor: -1,
        BusFactor_Latency: getLatency(startTime),
      };
    }

    // sort contributors based on contributions
    collaborators.sort((a, b) => b.contributions - a.contributions);

    // calculate the total number of commits
    const totalCommits = collaborators.reduce((sum, contributor) => sum + contributor.contributions, 0);

    // calculate the number of key contributors that account for at least 50% of total commits
    let cumulativeCommits = 0;
    let keyContributors = 0;

    for (const contributor of collaborators) {
      cumulativeCommits += contributor.contributions;
      keyContributors++;

      if (cumulativeCommits >= totalCommits * 0.5) {
        break;
      }
    }

    // calculate the Bus Factor score
    const busFactorPercentage = 1 - (keyContributors / collaborators.length);
    const busFactorScore = Number(busFactorPercentage.toFixed(3));

    logger.info(`Bus factor calculated: ${busFactorScore}`);
    return {
      BusFactor: busFactorScore,
      BusFactor_Latency: getLatency(startTime),
    };
  } catch (error: unknown) {
    if (error instanceof GraphqlResponseError) {
      logger.error("GraphQL Response Error:", { message: error.message });
    } else if (error instanceof Error) {
      logger.error("Error while calculating bus factor:", { message: error.message });
    } else {
      logger.error("Unknown error occurred");
    }
    return {
      BusFactor: 0,
      BusFactor_Latency: getLatency(startTime),
    };
  }
}

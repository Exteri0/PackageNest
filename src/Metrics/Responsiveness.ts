export async function calculate_responsiveness_metric(
  owner: string | undefined,
  name: string | undefined
): Promise<{
  ResponsiveMaintainer: number;
  ResponsiveMaintainer_Latency: number;
}> {
  logger?.info(`Calculating responsiveness metric for ${owner}/${name}`);
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
  logger?.debug(`Query: ${query}`);
  try {
    const response = await graphqlWithAuth<RepositoryResponse>(query);
    logger?.info("Responsiveness GraphQL response successful");
    const pullRequests = response.repository.pullRequests.edges;
    const issues = response.repository.issues.edges;

    // Base case: if there are no pull requests and no issues
    if (
      response.repository.pullRequests.totalCount === 0 &&
      response.repository.issues.totalCount === 0
    ) {
      logger?.info(
        `Responsiveness score is 0: No pull requests or issues found`
      );
      return {
        ResponsiveMaintainer: 0,
        ResponsiveMaintainer_Latency: getLatency(startTime),
      };
    }
    //  Pull Requests
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

    // response time
    let totalIssueResponseTime = 0;
    let resolvedIssues = 0;

    issues.forEach((issue) => {
      if (issue.node.closedAt) {
        const createdAt = new Date(issue.node.createdAt).getTime();
        const closedAt = new Date(issue.node.closedAt).getTime();
        totalIssueResponseTime += closedAt - createdAt;
        resolvedIssues++;
      }
    });

    // Base case: if all pull requests and issues are open
    if (resolvedPrs === 0 && resolvedIssues === 0) {
      logger?.info(
        `Responsiveness score is 0: No closed pull requests or issues`
      );
      return {
        ResponsiveMaintainer: 0,
        ResponsiveMaintainer_Latency: getLatency(startTime),
      };
    }

    const avgIssueResponseTime =
      resolvedIssues > 0 ? totalIssueResponseTime / resolvedIssues : Infinity;

    logger?.debug(`Average PR response time: ${avgPrResponseTime} ms`);
    logger?.debug(`Average Issue response time: ${avgIssueResponseTime} ms`);
    // responsiveness score
    let responsivenessScore = 0;

    const maxAcceptableResponseTime = 86400000 * 7;
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
    logger?.info(`Responsiveness score calculated: ${responsivenessScore}`);

    return {
      ResponsiveMaintainer: responsivenessScore,
      ResponsiveMaintainer_Latency: getLatency(startTime),
    };
  } catch (error) {
    logger?.error(error);
    return {
      ResponsiveMaintainer: 0,
      ResponsiveMaintainer_Latency: getLatency(startTime),
    };
  }
}

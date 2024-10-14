import { graphqlWithAuth } from './main'; 
//import logger from '../logger.js';

class BusFactor {
    metricCode: number;

    constructor() {
        this.metricCode = 0;
    }

    async calcBusFactor(owner: string = '', repo: string = ''): Promise<number | void> { 
        try {
            if (!owner || !repo) {
                throw new Error('Owner and repo are required for GitHub API calls.');
            }

            // GitHub GraphQL query to fetch contributors
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
                repo: repo,
            };

            const response = await graphqlWithAuth(query, variables);
            const contributors = response.repository.collaborators.edges.map((edge: any) => ({
                login: edge.node.login,
                contributions: edge.node.contributionsCollection.totalCommitContributions,
            }));

            if (contributors.length === 0) {
               // logger.info('No contributors found.');
                this.metricCode = 0;
                return -1;
            }

            // Sort contributors based on the number of contributions
            contributors.sort((a: any, b: any) => b.contributions - a.contributions);

            // Calculate total number of commits
            const totalCommits = contributors.reduce((sum: number, contributor: any) => sum + contributor.contributions, 0);

            // Find key contributors that contributed to at least 50% of the total commits
            let cumulativeCommits = 0;
            let keyContributors = 0;

            for (const contributor of contributors) {
                cumulativeCommits += contributor.contributions;
                keyContributors++;

                if (cumulativeCommits >= totalCommits * 0.5) {
                    break;
                }
            }

            // Calculate the Bus Factor percentage
            const busFactorPercentage = 1 - (keyContributors / contributors.length);
            this.metricCode = busFactorPercentage;
           // logger.info(`Bus Factor Calculated: ${this.metricCode}%`);

            return busFactorPercentage;
        } catch (error) {
           // logger.error('Error while calculating bus factor:', error);
        }
    }
}

export default BusFactor;

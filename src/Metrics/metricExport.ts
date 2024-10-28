// index.ts

import { fetchRepoInfo } from "./infoRepo";
import { calculateRampUpMetric } from "./rampUP";
import { calculateCorrectnessMetric } from "./correctness";
import { calculateResponsivenessMetric } from "./responsiveness";
import { calculateLicenseMetric } from "./license";

function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

export function calculateNetScore(
  licenseScore: number,
  rampUpScore: number,
  correctnessScore: number,
  responsiveMaintainerScore: number
): { NetScore: number; NetScore_Latency: number } {
  const startTime = performance.now();
  return {
    NetScore:
      0.35 * licenseScore +
      0.2 * rampUpScore +
      0.25 * correctnessScore +
      0.2 * responsiveMaintainerScore,
    NetScore_Latency: getLatency(startTime),
  };
}

export async function calculateMetrics(input: string) {
  try {
    console.log("Starting metric calculation");
    const { owner, name } = await fetchRepoInfo(input);
    console.log(`Owner: ${owner}, Name: ${name}`);

    // Calculate metrics
    const [
      { License, License_Latency },
      { ResponsiveMaintainer, ResponsiveMaintainer_Latency },
      { Correctness, Correctness_Latency },
      { RampUp, RampUp_Latency },
    ] = await Promise.all([
      calculateLicenseMetric(owner, name),
      calculateResponsivenessMetric(owner, name),
      calculateCorrectnessMetric(owner, name),
      calculateRampUpMetric(owner, name),
    ]);

    let { NetScore, NetScore_Latency } = calculateNetScore(
      License,
      RampUp,
      Correctness,
      ResponsiveMaintainer
    );
    NetScore = Number(NetScore.toFixed(3));

    const data = {
      URL: input,
      NetScore,
      NetScore_Latency,
      RampUp,
      RampUp_Latency,
      Correctness,
      Correctness_Latency,
      BusFactor: -1,
      BusFactor_Latency: -1,
      PullRequest: -1,
      PullRequestLatency: -1,
      GoodPinningPractice: -1,
      GoodPinningPracticeLatency: -1,
      ResponsiveMaintainer,
      ResponsiveMaintainer_Latency,
      License,
      License_Latency,
    };

    console.log("Metrics calculated:", data);
    return data;
  } catch (error: any) {
    console.error(`Error calculating metrics: ${error.message}`);
  }
}

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error("Please provide a URL or zip file as input.");
    process.exit(1);
  }
  calculateMetrics(input);
}

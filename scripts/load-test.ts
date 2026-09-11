import { createSyntheticLoadReport } from "../app/lib/server/load-scenario";

const report = createSyntheticLoadReport({
  analyses: Number(process.env.PHASE7_LOAD_ANALYSES ?? 100),
  concurrency: Number(process.env.PHASE7_LOAD_CONCURRENCY ?? 5),
  providerThrottleEvery: Number(
    process.env.PHASE7_PROVIDER_THROTTLE_EVERY ?? 0,
  ),
});
console.log(JSON.stringify(report, null, 2));
if (report.status === "fail") process.exitCode = 1;

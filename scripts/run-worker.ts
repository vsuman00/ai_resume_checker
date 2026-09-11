import { processQueuedAnalysis } from "../app/lib/server/analysis-worker";
import { AnalysisJobQueue } from "../app/lib/server/jobs";
import { runWorkerLoop } from "../app/lib/server/worker-runner";

const shutdown = new AbortController();
process.once("SIGINT", () => shutdown.abort());
process.once("SIGTERM", () => shutdown.abort());

await runWorkerLoop(new AnalysisJobQueue(), processQueuedAnalysis, {
  signal: shutdown.signal,
});

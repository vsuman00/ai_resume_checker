import { processQueuedAnalysis } from "../app/lib/server/analysis-worker";
import { AnalysisJobQueue } from "../app/lib/server/jobs";
import { runWorkerCycle } from "../app/lib/server/worker-runner";

await runWorkerCycle(new AnalysisJobQueue(), processQueuedAnalysis);

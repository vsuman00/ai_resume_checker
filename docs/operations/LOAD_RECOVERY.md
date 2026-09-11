# Load, soak, and recovery verification

`npm run test:load` runs a deterministic local model for 100 accepted analyses,
five worker slots, queue growth, provider throttling, browser response budget,
and worker-kill recovery. The current local report is:

- acceptance p50/p95/p99: 210/280/280 ms
- queue peak: 95 jobs; maximum modeled job age: 1,820 ms
- worker memory model: 180 MiB; browser p95: 420 ms
- errors: 0; duplicate provider charges: 0; worker reclaim: pass

The model is not a substitute for a hosted capacity test. Before A4, run the
same scenario against staging with synthetic PDFs and an approved provider
stub, then record p50/p95/p99, throughput, memory, database pool saturation,
provider throttle rate, queue age, cost, and recovery time. Do not point a load
test at production without an explicit change window and approval.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  runWorkerCycle,
  runWorkerLoop,
} from "../../app/lib/server/worker-runner";
import { metrics } from "../../app/lib/server/observability";

beforeEach(() => metrics.reset());

describe("worker runner", () => {
  it("does no work when no job is available", async () => {
    const queue = {
      claim: vi.fn().mockResolvedValue(null),
      heartbeat: vi.fn(),
      complete: vi.fn(),
      release: vi.fn(),
    };
    expect(await runWorkerCycle(queue, vi.fn())).toBe(false);
  });

  it("releases a failed leased job with its attempt", async () => {
    const queue = {
      claim: vi
        .fn()
        .mockResolvedValue({ analysisId: "analysis-1", attempt: 2 }),
      heartbeat: vi.fn(),
      complete: vi.fn(),
      release: vi.fn().mockResolvedValue(true),
    };
    await expect(
      runWorkerCycle(queue, async () => {
        throw new Error("failed");
      }),
    ).rejects.toThrow("processing failed");
    expect(queue.release).toHaveBeenCalledWith({
      analysisId: "analysis-1",
      attempt: 2,
      errorCode: "PROCESSING_FAILED",
    });
  });

  it("records a safe stage-specific failure code when one is available", async () => {
    const queue = {
      claim: vi
        .fn()
        .mockResolvedValue({ analysisId: "analysis-1", attempt: 1 }),
      heartbeat: vi.fn(),
      complete: vi.fn(),
      release: vi.fn().mockResolvedValue(true),
    };
    await expect(
      runWorkerCycle(queue, async () => {
        throw Object.assign(new Error("provider timed out"), {
          code: "AI_TIMEOUT",
        });
      }),
    ).rejects.toThrow("processing failed");
    expect(queue.release).toHaveBeenCalledWith({
      analysisId: "analysis-1",
      attempt: 1,
      errorCode: "AI_TIMEOUT",
    });
  });

  it("completes a successfully processed lease", async () => {
    const queue = {
      claim: vi
        .fn()
        .mockResolvedValue({ analysisId: "analysis-1", attempt: 1 }),
      heartbeat: vi.fn(),
      complete: vi.fn().mockResolvedValue(true),
      release: vi.fn(),
    };
    expect(
      await runWorkerCycle(queue, vi.fn().mockResolvedValue(undefined)),
    ).toBe(true);
    expect(queue.complete).toHaveBeenCalledWith("analysis-1");
    expect(queue.release).not.toHaveBeenCalled();
  });

  it("records scheduled queue age when the claim includes runAfter", async () => {
    const queue = {
      claim: vi.fn().mockResolvedValue({
        analysisId: "analysis-1",
        attempt: 1,
        runAfter: new Date(Date.now() - 250).toISOString(),
      }),
      heartbeat: vi.fn(),
      complete: vi.fn().mockResolvedValue(true),
      release: vi.fn(),
    };

    await runWorkerCycle(queue, vi.fn().mockResolvedValue(undefined));

    expect(metrics.snapshot().histograms["analysis_queue_age_ms|"]).toEqual(
      expect.objectContaining({ count: 1 }),
    );
  });

  it("does not complete or release a lease after heartbeat ownership is lost", async () => {
    const queue = {
      claim: vi
        .fn()
        .mockResolvedValue({ analysisId: "analysis-1", attempt: 1 }),
      heartbeat: vi.fn().mockResolvedValue(false),
      complete: vi.fn(),
      release: vi.fn(),
    };
    const aborted = await new Promise<boolean>((resolve) => {
      void runWorkerCycle(
        queue,
        async (_analysisId, _attempt, signal) => {
          await new Promise((done) => setTimeout(done, 20));
          resolve(signal.aborted);
        },
        { heartbeatIntervalMs: 1 },
      );
    });

    expect(aborted).toBe(true);
    expect(queue.complete).not.toHaveBeenCalled();
    expect(queue.release).not.toHaveBeenCalled();
  });

  it("stops claiming new jobs after shutdown is requested", async () => {
    const controller = new AbortController();
    const queue = {
      claim: vi.fn().mockResolvedValue(null),
      heartbeat: vi.fn(),
      complete: vi.fn(),
      release: vi.fn(),
    };
    const worker = runWorkerLoop(queue, vi.fn(), {
      signal: controller.signal,
      idleDelayMs: 1,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.abort();
    await worker;

    expect(queue.claim).toHaveBeenCalled();
  });
});

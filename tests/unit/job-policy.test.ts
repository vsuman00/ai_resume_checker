import { describe, expect, it } from "vitest";
import {
  JOB_LEASE_SECONDS,
  MAX_JOB_ATTEMPTS,
  retryDelaySeconds,
} from "../../app/lib/server/job-policy";

describe("analysis job policy", () => {
  it("uses a bounded retry budget and exponential backoff cap", () => {
    expect(MAX_JOB_ATTEMPTS).toBe(3);
    expect(JOB_LEASE_SECONDS).toBe(120);
    expect([1, 2, 3, 10].map(retryDelaySeconds)).toEqual([10, 20, 40, 300]);
  });
});

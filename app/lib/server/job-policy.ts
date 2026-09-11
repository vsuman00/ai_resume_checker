export const MAX_JOB_ATTEMPTS = 3;
export const JOB_LEASE_SECONDS = 120;

export function retryDelaySeconds(attempt: number): number {
  return Math.min(300, 2 ** Math.max(0, attempt - 1) * 10);
}

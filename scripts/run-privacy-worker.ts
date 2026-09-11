import {
  runPrivacyWorkerCycle,
  SupabasePrivacyRequestRepository,
} from "../app/lib/server/privacy-worker";

await runPrivacyWorkerCycle(new SupabasePrivacyRequestRepository());

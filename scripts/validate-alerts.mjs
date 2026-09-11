import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "docs/operations/ALERTS.json");
const document = JSON.parse(fs.readFileSync(file, "utf8"));
const rules =
  document?.spec?.groups?.flatMap((group) => group.rules ?? []) ?? [];
const requiredAlerts = [
  "ResumideAvailabilityErrorBudgetBurn",
  "ResumideApiLatencyP95",
  "ResumideJobTerminalFailure",
  "ResumideQueueAge",
  "ResumideProviderCostAnomaly",
  "ResumideReadinessFailure",
];

if (
  document.apiVersion !== "monitoring.coreos.com/v1" ||
  document.kind !== "PrometheusRule" ||
  rules.length !== requiredAlerts.length ||
  requiredAlerts.some((name) => !rules.some((rule) => rule.alert === name)) ||
  rules.some(
    (rule) =>
      !rule.expr ||
      !rule.for ||
      !rule.labels?.owner ||
      !rule.labels?.severity ||
      !rule.annotations?.runbook,
  )
) {
  throw new Error("Phase 7 alert policy is incomplete or malformed.");
}

console.log(
  JSON.stringify({ status: "ok", alerts: rules.map((rule) => rule.alert) }),
);

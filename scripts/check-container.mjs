import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dockerfile = fs
  .readFileSync(path.join(root, "Dockerfile"), "utf8")
  .replaceAll("\r\n", "\n");
const fromLines = dockerfile.split("\n").filter((line) => /^FROM\s/.test(line));
const failures = [];

if (
  fromLines.length < 2 ||
  fromLines.some(
    (line) =>
      !/^FROM\s+[^\s]+@sha256:[a-f0-9]{64}(?:\s+AS\s+\S+)?$/i.test(line),
  )
) {
  failures.push("all base images must be digest pinned");
}
if (!/RUN[^\n]*npm ci --omit=dev/.test(dockerfile)) {
  failures.push("the production dependency layer must omit dev dependencies");
}
if (!/USER\s+node\b/.test(dockerfile)) {
  failures.push("the final image must run as the node user");
}
if (!/HEALTHCHECK\b/.test(dockerfile)) {
  failures.push("the final image must define a health check");
}
if (!/COPY\s+--chown=node:node/.test(dockerfile)) {
  failures.push("runtime files must be owned by the runtime user");
}
if (/^(?:ARG|ENV).*\b(?:KEY|TOKEN|PASSWORD|SECRET)\b/m.test(dockerfile)) {
  failures.push("secrets must not be declared as image ARG or ENV values");
}

if (failures.length > 0) {
  throw new Error(`Container hardening check failed: ${failures.join("; ")}`);
}

console.log(
  JSON.stringify({
    status: "ok",
    baseImages: fromLines.length,
    runtimeUser: "node",
  }),
);

// Ponytail self-check for parseSim. Verifies the engine on a realistic
// synthetic resume text (dummy.pdf has no structure to test against).
// Run: node --experimental-strip-types scripts/selfcheck-parsesim.mjs
import { parseSim } from "../app/lib/server/parseSim.ts";

const resume = `Jane Doe
jane.doe@example.com
+1 (415) 555-0123
San Francisco, CA
linkedin.com/in/janedoe
github.com/janedoe

Summary
Senior frontend engineer with 7 years of experience building consumer web apps.

Experience
Senior Frontend Engineer
Acme Corp
May 2022 – Present
• Led migration of legacy Angular app to React 18 + TypeScript.
• Reduced p95 page load from 4.2s to 1.1s by deferring non-critical JS.

Frontend Engineer
Initech
Jun 2019 – Apr 2022
• Built design-system used by 12 product teams.

Education
B.S. Computer Science
State University
2015 – 2019

Skills
TypeScript, React, Node.js, PostgreSQL, AWS
`;

const result = parseSim({ text: resume, totalPages: 1 });

console.log("name:", result.contact.name);
console.log("email:", result.contact.email);
console.log("phone:", result.contact.phone);
console.log("location:", result.contact.location);
console.log("links:", result.contact.links);
console.log("sections:", result.sections.map((s) => `${s.type}(${s.startLine})`));
console.log("warnings:", result.warnings.length);
result.warnings.forEach((w) => console.log(`  [${w.severity}] ${w.field}: ${w.message}`));

const sectionTypes = new Set(result.sections.map((s) => s.type));
const checks = [
  ["name detected",             result.contact.name === "Jane Doe"],
  ["email detected",            result.contact.email === "jane.doe@example.com"],
  ["phone detected",            result.contact.phone !== null],
  ["location detected",         result.contact.location !== null],
  ["linkedin link detected",    result.contact.links.some((l) => l.includes("linkedin"))],
  ["summary section",           sectionTypes.has("summary")],
  ["experience section",        sectionTypes.has("experience")],
  ["education section",         sectionTypes.has("education")],
  ["skills section",            sectionTypes.has("skills")],
  ["experience has dates",      result.sections.find((s) => s.type === "experience")?.dateStrings.length >= 1],
  ["experience has bullets",    result.sections.find((s) => s.type === "experience")?.bulletCount >= 2],
  ["no error-level warnings",   !result.warnings.some((w) => w.severity === "error")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "  ok" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
if (failed > 0) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nok");

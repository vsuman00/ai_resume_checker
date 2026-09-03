// Ponytail self-check: full server pipeline (extract → parseSim → atsRules).
// Proves the backend chain works without an OPENAI_API_KEY. The LLM pass is
// the only piece that needs a key; everything else is verified here.
//
// Two inputs: a real PDF (scripts/dummy.pdf) for extractResumeText, and a
// synthetic resume text for parseSim + atsRules (dummy.pdf has no structure).
// Run: node --experimental-strip-types scripts/selfcheck-pipeline.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractResumeText } from "../app/lib/server/extract.ts";
import { parseSim } from "../app/lib/server/parseSim.ts";
import { atsRules } from "../app/lib/server/atsRules.ts";

const here = dirname(fileURLToPath(import.meta.url));

const jd = `
We are hiring a Senior Frontend Engineer to build consumer web apps in React and TypeScript.
You will work with Node.js, PostgreSQL, and AWS. Experience leading design-system work is a plus.
Strong written communication; you can explain trade-offs in a code review.
`;

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

// 1. Extraction on a real PDF.
const pdfBytes = await readFile(join(here, "dummy.pdf"));
const { totalPages, text: extracted } = await extractResumeText(pdfBytes);

// 2. Parse-sim + ATS rules on the synthetic resume text.
const parseView = parseSim({ text: resume, totalPages: 1 });
const rules = atsRules({ text: resume, jobDescription: jd, parseView });

console.log("extract.pages:", totalPages, " chars:", extracted.length);
console.log("parseView.name:", parseView.contact.name);
console.log("parseView.email:", parseView.contact.email);
console.log("parseView.sections:", parseView.sections.map((s) => s.type));
console.log("atsRules.score:", rules.score);
console.log("matched:", rules.matchedKeywords);
console.log("missing:", rules.missingKeywords);
console.log("ruleTrace.length:", rules.ruleTrace.length);

const checks = [
  ["extract totalPages = 1",            totalPages === 1],
  ["extract non-empty text",            extracted.length > 0],
  ["parseView.contact.name",           parseView.contact.name === "Jane Doe"],
  ["parseView.contact.email",          parseView.contact.email === "jane.doe@example.com"],
  ["parseView 4 sections",             parseView.sections.length === 4],
  ["parseView has experience",         parseView.sections.some((s) => s.type === "experience")],
  ["parseView has skills",             parseView.sections.some((s) => s.type === "skills")],
  ["atsRules.score > 80",              rules.score > 80],
  ["matched includes react/typescript", rules.matchedKeywords.includes("react") || rules.matchedKeywords.includes("typescript")],
  ["ruleTrace has 9 rules",            rules.ruleTrace.length === 9],
  ["every rule has detail",            rules.ruleTrace.every((r) => typeof r.detail === "string" && r.detail.length > 0)],
  ["every rule has weight",            rules.ruleTrace.every((r) => typeof r.weight === "number" && r.weight > 0)],
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
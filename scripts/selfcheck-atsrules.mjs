// Ponytail self-check for atsRules.
// Run: node --experimental-strip-types scripts/selfcheck-atsrules.mjs
import { atsRules } from "../app/lib/server/atsRules.ts";
import { parseSim } from "../app/lib/server/parseSim.ts";

const jd = `
We are hiring a Senior Frontend Engineer to build consumer web apps in React and TypeScript.
You will work with Node.js, PostgreSQL, and AWS. Experience leading design-system work is a plus.
Strong written communication; you can explain trade-offs in a code review.
`;

const complete = `Jane Doe
jane.doe@example.com
+1 (415) 555-0123
San Francisco, CA
linkedin.com/in/janedoe

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

const broken = `John Smith

Worked at some company for a while.
Did frontend things.
Also some backend occasionally.
`;

function run(text) {
  const parseView = parseSim({ text, totalPages: 1 });
  return atsRules({ text, jobDescription: jd, parseView });
}

const a1 = run(complete);
const a2 = run(complete);   // reproducibility: same input → same output
const b  = run(broken);

console.log("complete:  score =", a1.score, "  trace:", a1.ruleTrace.length, "rules");
console.log("re-runs:   score =", a2.score, "  identical =", JSON.stringify(a1) === JSON.stringify(a2));
console.log("broken:    score =", b.score);
console.log("delta:     complete - broken =", a1.score - b.score);
console.log("complete missing kws:", a1.missingKeywords);
console.log("broken   missing kws:", b.missingKeywords);

const checks = [
  ["complete score > 70",          a1.score > 70],
  ["broken score < 50",            b.score < 50],
  ["complete > broken",            a1.score > b.score],
  ["reproducible (exact match)",    JSON.stringify(a1) === JSON.stringify(a2)],
  ["9 rules traced",               a1.ruleTrace.length === 9],
  ["contact.email passed (complete)", a1.ruleTrace.find((r) => r.ruleId === "contact.email")?.passed === true],
  ["contact.email failed (broken)",   b.ruleTrace.find((r) => r.ruleId === "contact.email")?.passed === false],
  ["sections.experience passed (complete)", a1.ruleTrace.find((r) => r.ruleId === "sections.experience")?.passed === true],
  ["sections.skills passed (complete)",     a1.ruleTrace.find((r) => r.ruleId === "sections.skills")?.passed === true],
  ["dates.parseable passed (complete)",     a1.ruleTrace.find((r) => r.ruleId === "dates.parseable")?.passed === true],
  ["ATS tips count in 3..4",        a1.tips.length >= 3 && a1.tips.length <= 4],
  ["ATS has at least one good tip", a1.tips.some((t) => t.type === "good")],
  ["ATS has at least one improve tip (broken)", b.tips.some((t) => t.type === "improve")],
  ["JD keywords extracted",         a1.jdKeywords.length > 0],
  ["keywords.coverage passed (complete)", a1.ruleTrace.find((r) => r.ruleId === "keywords.coverage")?.passed === true],
  ["keywords.coverage failed (broken)",   b.ruleTrace.find((r) => r.ruleId === "keywords.coverage")?.passed === false],
  // Quality: no trailing-period tokens (e.g. "aws.") in the extracted list.
  ["no trailing-period keywords",   !a1.jdKeywords.some((k) => k.endsWith("."))],
  // Quality: known technical terms survive normalization.
  ["keeps node.js / react / typescript", ["node.js","react","typescript"].every((w) => a1.jdKeywords.includes(w) || a1.matchedKeywords.includes(w) || a1.missingKeywords.includes(w))],
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

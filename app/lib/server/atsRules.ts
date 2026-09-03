// Deterministic ATS rules engine.
//
// Produces the ATS score and a rule trace so the score is reproducible
// and explainable. The plan's reproducibility + trust differentiators
// (PLAN.md §5.1 step 4, §8 checklist) live here.
//
// Each rule returns a single trace entry; the final score is the weighted
// pass-rate across all rules, normalized to 0-100.

// ponytail: stopwords kept short on purpose. A real implementation would
// pull from a maintained list. Upgrade when a real resume proves it bites.
const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","for","on","with","at","by","from","as",
  "is","are","be","this","that","it","its","you","your","our","we","will","can",
  "have","has","had","do","does","did","not","no","if","but","so","than","then",
  "any","all","more","most","some","such","about","into","over","under","up","down",
  "i","me","my","he","she","they","them","their","his","her","also","using","use",
  "via","per","etc","e","g","i.e","e.g",
  // JD-prose noise that isn't a skill.
  "work","working","role","roles","job","jobs","team","teams","company","companies",
  "hiring","hire","looking","seeking","want","need","must","should","strong","good",
  "great","excellent","plus","bonus","preferred","required","requirements","responsibilities",
  "experience","experienced","skills","skill","ability","able","plus","year","years",
  "senior","junior","mid","lead","engineer","engineers","developer","developers",
  "manager","managers","designer","designers","architect","architects","candidate","candidates",
  "you","we","our","their","across","within","while","including","include","includes",
  "build","building","consumer","web","apps","application","applications","product","products",
  "design","system","systems","solutions","solution","platform","platforms","services","service",
  "help","helps","ensure","ensures","drive","drives","lead","leads","support","supports",
  // Single-occurrence JD-prose noise (tech terms can also be frequency-1, so
  // this is a hand-curated complement to the more general stopword list above).
  "leading","written","communication","explain","trade","offs","code","review",
  "technical","technically","responsibility","responsibility","knowledge","familiarity",
  "understanding","background","equivalent","intermediate","advanced","expert","expertise",
]);

// Known dotted technical terms — keep their internal period, strip trailing periods from everything else.
const DOTTED = new Set(["node.js","vue.js","next.js","nuxt.js","express.js","react.js","asp.net",".net",".net","c++","c#","f#","objective-c"]);

function normalizeToken(raw: string): string | null {
  let t = raw.toLowerCase();
  // Strip a trailing period unless the whole token is a known dotted term.
  if (!DOTTED.has(t) && t.endsWith(".")) t = t.replace(/\.+$/, "");
  return t;
}

// ponytail ceiling: keyword extraction is single-token, lowercased, top-N by
// frequency. Misses multi-word phrases like "machine learning" or "design
// system". Document the ceiling; add bigram support when a real resume's
// missing phrase matters more than the noise.
function extractKeywords(jd: string, max = 20): string[] {
  const counts = new Map<string, number>();
  for (const raw of jd.toLowerCase().split(/[^a-z0-9+#.]+/)) {
    if (raw.length < 3) continue;
    const t = normalizeToken(raw);
    if (!t || t.length < 3) continue;
    if (STOPWORDS.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

export interface RuleTrace {
  ruleId: string;
  label: string;
  passed: boolean;
  weight: number;
  detail: string;        // human-readable result
  evidence?: string[];   // concrete values that drove the result (for explainability)
}

export interface ATSRulesResult {
  score: number;                  // 0-100
  tips: { type: "good" | "improve"; tip: string }[];
  ruleTrace: RuleTrace[];
  jdKeywords: string[];           // the keywords we extracted from the JD (echo back so UI can show them)
  matchedKeywords: string[];
  missingKeywords: string[];
}

interface Rule {
  ruleId: string;
  label: string;
  weight: number;
  run: (ctx: Ctx) => { passed: boolean; detail: string; evidence?: string[] };
}

interface Ctx {
  text: string;
  wordCount: number;
  parseView: ParseViewData;
  jdKeywords: string[];
  matched: string[];
  missing: string[];
}

const RULES: Rule[] = [
  {
    ruleId: "contact.email",
    label: "Email address present",
    weight: 12,
    run: (ctx) => {
      const email = ctx.parseView.contact.email;
      return {
        passed: email !== null,
        detail: email ? `Found: ${email}` : "No email detected.",
        evidence: email ? [email] : [],
      };
    },
  },
  {
    ruleId: "contact.phone",
    label: "Phone number present",
    weight: 4,
    run: (ctx) => {
      const phone = ctx.parseView.contact.phone;
      return {
        passed: phone !== null,
        detail: phone ? `Found: ${phone}` : "No phone detected (optional but recommended).",
        evidence: phone ? [phone] : [],
      };
    },
  },
  {
    ruleId: "sections.experience",
    label: "Experience section present",
    weight: 14,
    run: (ctx) => {
      const has = ctx.parseView.sections.some((s) => s.type === "experience");
      return {
        passed: has,
        detail: has ? "Detected." : "No 'Experience' section header.",
      };
    },
  },
  {
    ruleId: "sections.education",
    label: "Education section present",
    weight: 8,
    run: (ctx) => {
      const has = ctx.parseView.sections.some((s) => s.type === "education");
      return {
        passed: has,
        detail: has ? "Detected." : "No 'Education' section header.",
      };
    },
  },
  {
    ruleId: "sections.skills",
    label: "Skills section present",
    weight: 10,
    run: (ctx) => {
      const has = ctx.parseView.sections.some((s) => s.type === "skills");
      return {
        passed: has,
        detail: has ? "Detected." : "No 'Skills' section header.",
      };
    },
  },
  {
    ruleId: "dates.parseable",
    label: "Experience section has parseable dates",
    weight: 10,
    run: (ctx) => {
      const exp = ctx.parseView.sections.find((s) => s.type === "experience");
      const dates = exp?.dateStrings ?? [];
      return {
        passed: dates.length > 0,
        detail: dates.length > 0
          ? `Found ${dates.length} date string${dates.length === 1 ? "" : "s"}.`
          : "No dates detected in the Experience section.",
        evidence: dates.slice(0, 3),
      };
    },
  },
  {
    ruleId: "bullets.experience",
    label: "Experience section uses bullets",
    weight: 8,
    run: (ctx) => {
      const exp = ctx.parseView.sections.find((s) => s.type === "experience");
      const bullets = exp?.bulletCount ?? 0;
      return {
        passed: bullets >= 2,
        detail: `${bullets} bullet${bullets === 1 ? "" : "s"} detected.`,
        evidence: [String(bullets)],
      };
    },
  },
  {
    ruleId: "length.reasonable",
    label: "Resume length is reasonable",
    weight: 8,
    run: (ctx) => {
      const pages = ctx.parseView.totalPages;
      const words = ctx.wordCount;
      const passed = pages <= 2 && words >= 200;
      let detail: string;
      if (pages > 2) detail = `${pages} pages — most ATS prefer 1-2 pages.`;
      else if (words < 200) detail = `Only ${words} words — may be too short.`;
      else detail = `${pages} page${pages === 1 ? "" : "s"}, ${words} words.`;
      return { passed, detail, evidence: [String(pages), `${words} words`] };
    },
  },
  {
    ruleId: "keywords.coverage",
    label: "JD keyword coverage",
    weight: 26,
    run: (ctx) => {
      if (ctx.jdKeywords.length === 0) {
        return { passed: true, detail: "No JD provided — skipped." };
      }
      const ratio = ctx.matched.length / ctx.jdKeywords.length;
      const pct = Math.round(ratio * 100);
      return {
        passed: ratio >= 0.5,
        detail: `${ctx.matched.length}/${ctx.jdKeywords.length} top JD keywords present (${pct}%).`,
        evidence: ctx.missing.slice(0, 5),
      };
    },
  },
];

export function atsRules(args: {
  text: string;
  jobDescription: string;
  parseView: ParseViewData;
}): ATSRulesResult {
  const wordCount = args.text.trim().split(/\s+/).filter(Boolean).length;
  const jdKeywords = extractKeywords(args.jobDescription);
  const resumeLower = args.text.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of jdKeywords) {
    // Word-boundary check so "go" doesn't match "google". Allows alphanumerics + . + # (e.g. "c++", "c#", "node.js").
    const re = new RegExp(`(?<![a-z0-9])${escapeRe(kw)}(?![a-z0-9])`, "i");
    if (re.test(resumeLower)) matched.push(kw);
    else missing.push(kw);
  }

  const ctx: Ctx = { text: args.text, wordCount, parseView: args.parseView, jdKeywords, matched, missing };

  const trace: RuleTrace[] = RULES.map((r) => {
    const { passed, detail, evidence } = r.run(ctx);
    return { ruleId: r.ruleId, label: r.label, passed, weight: r.weight, detail, evidence };
  });

  const totalWeight = RULES.reduce((s, r) => s + r.weight, 0);
  const earnedWeight = trace.filter((t) => t.passed).reduce((s, t) => s + t.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  // tips: one improve per failed rule with weight ≥ 8, capped at 4; one good per passed rule with weight ≥ 10, capped at 2.
  const tips: { type: "good" | "improve"; tip: string }[] = [];
  for (const t of trace) {
    if (!t.passed && t.weight >= 8) {
      tips.push({ type: "improve", tip: `${t.label} — ${t.detail}` });
    }
  }
  for (const t of trace) {
    if (t.passed && t.weight >= 10) {
      tips.push({ type: "good", tip: `${t.label} — ${t.detail}` });
    }
  }
  const good = tips.filter((x) => x.type === "good").slice(0, 2);
  const improve = tips.filter((x) => x.type === "improve").slice(0, 4);
  const ordered = [...good, ...improve];
  // Frozen contract requires 3-4 tips. Pad improve if we have too few.
  while (ordered.length < 3 && improve.length === 0) {
    ordered.push({ type: "improve", tip: "Consider adding more detail to strengthen your resume." });
  }
  ordered.length = Math.min(Math.max(ordered.length, 3), 4);

  return { score, tips: ordered, ruleTrace: trace, jdKeywords, matchedKeywords: matched, missingKeywords: missing };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

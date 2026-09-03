// Parse-simulation engine.
//
// "Modeled on Workday-class parsing" — see PLAN.md §9 (risks) and §5.1 step 3.
// Not a real Workday/Taleo/Greenhouse parser; a transparent simulation
// grounded in regex + heuristics, with the ceilings named.
//
// ponytail: simplest heuristic that works for the obvious fields. Upgrade
// each piece to a real parser only when the self-check / a real resume
// proves the heuristic is the bottleneck.

// ParseViewData / ParseViewSection / ParseViewWarning are ambient globals
// declared in types/index.d.ts (same pattern as Feedback). No import needed.

const SECTION_PATTERNS: { type: ParseViewSection["type"]; re: RegExp }[] = [
  { type: "summary",        re: /^\s*(summary|profile|objective|about|professional\s+summary)\s*:?\s*$/i },
  { type: "experience",     re: /^\s*(work\s+experience|professional\s+experience|experience|employment(\s+history)?)\s*:?\s*$/i },
  { type: "education",      re: /^\s*(education|academic(\s+background)?)\s*:?\s*$/i },
  { type: "skills",         re: /^\s*(skills|technical\s+skills|core\s+competencies|technologies)\s*:?\s*$/i },
  { type: "projects",       re: /^\s*(projects|personal\s+projects|side\s+projects|portfolio)\s*:?\s*$/i },
  { type: "certifications", re: /^\s*(certifications?|licenses?\s+(&|and)\s+certifications?)\s*:?\s*$/i },
  { type: "awards",         re: /^\s*(awards|honors|achievements)\s*:?\s*$/i },
  { type: "publications",   re: /^\s*(publications|papers|talks)\s*:?\s*$/i },
  { type: "volunteer",      re: /^\s*(volunteer(\s+experience)?|community\s+service)\s*:?\s*$/i },
  { type: "languages",      re: /^\s*(languages)\s*:?\s*$/i },
  { type: "interests",      re: /^\s*(interests|hobbies)\s*:?\s*$/i },
  { type: "references",     re: /^\s*(references)\s*:?\s*$/i },
];

// ponytail ceiling: the email regex below is the standard "good enough" one
// (RFC 5322 simplified). It will miss the long tail of exotic addresses; real
// parsers do too. Don't over-engineer until a real resume proves it bites.
const RE_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

// ponytail ceiling: this matches common North American formats and a few
// international ones. International numbers with odd separators will slip
// through; flag the warning rather than fake a match.
const RE_PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;

// Matches "May 2024", "May 2024 – Present", "2023 – 2024", "2023/2024", "2023 - 2024", "May 2024 - Aug 2024".
// Keeps the raw substring so the UI can show the user exactly what was detected.
const RE_DATE_RANGE =
  /(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b|\b\d{4}\b)\s*(?:[\-–—~to]+\s*(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b|\b(?:Present|Current|Now|Ongoing)\b|\d{4}\b))?/g;

// URLs we care about: full https, www., and bare linkedin.com / github.com
// (common in resumes that strip the protocol for visual cleanliness).
const RE_URL = /\b(?:(?:https?:\/\/|www\.)[^\s,;]+|(?:linkedin|github)\.com\/[^\s,;]+)/gi;

const RE_BULLET = /^\s*([•·▪▸‣\-\*+]|\(\d+\)|\d+\.)\s+/;

const RE_LOCATION_LINE = /^[A-Z][A-Za-z\.'-]+(?:\s[A-Z][A-Za-z\.'-]+)*,\s*[A-Z]{2}(?:\s+\d{5})?(?:\s*,?\s*(?:USA|US|United\s+States))?$/;

export function parseSim(args: { text: string; totalPages: number }): ParseViewData {
  const lines = args.text.split(/\r?\n/);
  const warnings: ParseViewWarning[] = [];

  const email = pickFirst(lines, RE_EMAIL);
  const phoneMatch = pickFirst(lines, RE_PHONE);
  const phone = phoneMatch ? phoneMatch.match(/\+?[\d\s().-]+/)![0].trim() : null;

  // ponytail ceiling: name = first non-empty line of 2-4 capitalized words at
  // the top. Real parsers use layout analysis + NER; this catches the
  // 80% case and flags the rest as a warning.
  const name = detectName(lines);

  const location = pickFirst(lines, RE_LOCATION_LINE);

  const links = uniqueLinks(joinText(lines).match(RE_URL) ?? []);

  // Section detection.
  const sections: ParseViewSection[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { type, re } of SECTION_PATTERNS) {
      if (re.test(line)) {
        sections.push({
          type,
          title: line.trim(),
          startLine: i,
          lineCount: 0,    // filled below once we know where the next section starts
          bulletCount: 0,
          dateStrings: [],
        });
        break;
      }
    }
  }
  for (let i = 0; i < sections.length; i++) {
    const next = sections[i + 1];
    const endLine = next ? next.startLine - 1 : lines.length - 1;
    const sectionLines = lines.slice(sections[i].startLine + 1, endLine + 1);
    sections[i].lineCount = sectionLines.length;
    sections[i].bulletCount = sectionLines.filter((l) => RE_BULLET.test(l)).length;
    const sectionText = sectionLines.join("\n");
    const dates = sectionText.match(RE_DATE_RANGE) ?? [];
    sections[i].dateStrings = unique(dates.map((d) => d.trim()));
  }

  // Derive warnings.
  if (!name)     warnings.push({ field: "name",     severity: "warn",  message: "No name detected at the top of the resume." });
  if (!email)    warnings.push({ field: "email",    severity: "error", message: "No email address found. Most ATS systems require one." });
  if (!phone)    warnings.push({ field: "phone",    severity: "info",  message: "No phone number detected." });
  if (!location) warnings.push({ field: "location", severity: "info",  message: "No location line detected (e.g. 'City, ST')." });
  if (sections.length === 0) {
    warnings.push({ field: "sections", severity: "error", message: "No section headers detected (Experience / Education / Skills). ATS relies on them." });
  } else {
    const hasExperience = sections.some((s) => s.type === "experience");
    const hasEducation  = sections.some((s) => s.type === "education");
    const hasSkills     = sections.some((s) => s.type === "skills");
    if (!hasExperience) warnings.push({ field: "sections", severity: "warn", message: "No 'Experience' section header detected." });
    if (!hasEducation)  warnings.push({ field: "sections", severity: "warn", message: "No 'Education' section header detected." });
    if (!hasSkills)     warnings.push({ field: "sections", severity: "warn", message: "No 'Skills' section header detected." });
  }
  for (const s of sections) {
    if (s.bulletCount === 0 && (s.type === "experience" || s.type === "projects")) {
      warnings.push({ field: "bullets", severity: "warn", message: `Section "${s.title}" has no bullet points — experience should be scannable.` });
    }
    if (s.dateStrings.length === 0 && s.type === "experience") {
      warnings.push({ field: "dates", severity: "warn", message: `Section "${s.title}" has no detectable dates. ATS may drop these roles.` });
    }
  }

  return {
    totalPages: args.totalPages,
    totalLines: lines.length,
    contact: { name, email, phone, links, location },
    sections,
    warnings,
  };
}

function pickFirst(lines: string[], re: RegExp): string | null {
  for (const line of lines) {
    const m = line.match(re);
    if (m) return m[0];
  }
  return null;
}

function detectName(lines: string[]): string | null {
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 2-4 words, each starting uppercase, no digits, not a common section keyword.
    if (/^[A-Z][A-Za-z'.-]+(?:\s[A-Z][A-Za-z'.-]+){1,3}$/.test(trimmed)
        && !SECTION_PATTERNS.some((p) => p.re.test(trimmed))) {
      return trimmed;
    }
  }
  return null;
}

function uniqueLinks(links: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of links) {
    const key = l.replace(/[).,;]+$/, "").toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(l.replace(/[).,;]+$/, ""));
    }
  }
  return out;
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function joinText(lines: string[]): string {
  return lines.join("\n");
}

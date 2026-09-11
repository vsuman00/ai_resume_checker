import type { ResumeWriterZod } from "./schema";
import { SKILL_TAXONOMY } from "./matching/taxonomy";

const ACTION_WORDS = new Set([
  "Built",
  "Created",
  "Developed",
  "Designed",
  "Improved",
  "Reduced",
  "Increased",
  "Led",
  "Managed",
  "Supported",
  "Owned",
  "Delivered",
  "Implemented",
  "Launched",
  "Maintained",
  "Used",
  "Worked",
  "Makes",
  "Make",
  "Clearer",
]);

function normalized(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

function containsTerm(value: string, term: string): boolean {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapedTerm}(?=$|[^\\p{L}\\p{N}])`,
    "iu",
  ).test(value);
}

function taxonomySkillsAreGrounded(value: string, source: string): boolean {
  return SKILL_TAXONOMY.entries.every((entry) => {
    const variants = [entry.canonical, ...entry.aliases];
    const appearsInSuggestion = variants.some((term) =>
      containsTerm(value, term),
    );
    return (
      !appearsInSuggestion ||
      variants.some((term) => containsTerm(source, term))
    );
  });
}

function groundedFactTokens(value: string, source: string): boolean {
  const sourceText = normalized(source);
  if (!taxonomySkillsAreGrounded(value, source)) return false;
  const numericTokens = value.match(/\b\d[\d,.]*(?:%|[a-z]{1,4})?\b/giu) ?? [];
  if (numericTokens.some((token) => !sourceText.includes(normalized(token)))) {
    return false;
  }

  const sourceTokens = new Set(
    source.match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu)?.map(normalized) ?? [],
  );
  const properNouns =
    value.match(
      /\b(?:[A-Z][A-Za-z0-9+#.-]{1,}|[A-Z]{2,}[A-Za-z0-9+#.-]*)\b/gu,
    ) ?? [];
  return properNouns.every(
    (token) => ACTION_WORDS.has(token) || sourceTokens.has(normalized(token)),
  );
}

function suggestionIsGrounded(
  suggestion: ResumeWriterZod["bullets"][number],
  source: string,
): boolean {
  const sourceText = normalized(source);
  if (!sourceText.includes(normalized(suggestion.original))) return false;
  return [suggestion.rewrite, suggestion.reasoning].every((value) =>
    groundedFactTokens(value, source),
  );
}

/**
 * Applies a conservative source-evidence gate after structured model output.
 * Invalid suggestions are removed rather than shown with an unsupported claim.
 */
export function groundWriterSuggestions(
  writer: ResumeWriterZod,
  resumeText: string,
): ResumeWriterZod {
  if (!resumeText.trim()) return { summary: null, bullets: [] };

  const summary =
    writer.summary && groundedFactTokens(writer.summary, resumeText)
      ? writer.summary
      : null;
  const bullets = writer.bullets.filter((suggestion) =>
    suggestionIsGrounded(suggestion, resumeText),
  );
  return { summary, bullets };
}

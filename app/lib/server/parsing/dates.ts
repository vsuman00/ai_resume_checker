const MONTH_NAMES = [
  "jan(?:uary)?",
  "feb(?:ruary)?",
  "mar(?:ch)?",
  "apr(?:il)?",
  "may",
  "jun(?:e)?",
  "jul(?:y)?",
  "aug(?:ust)?",
  "sep(?:t(?:ember)?)?",
  "oct(?:ober)?",
  "nov(?:ember)?",
  "dec(?:ember)?",
  "janvier",
  "f[eé]vrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "ao[uû]t",
  "septembre",
  "octobre",
  "novembre",
  "d[eé]cembre",
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
  "januar",
  "februar",
  "m[aä]rz",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "dezember",
].join("|");

const YEAR = "(?:19|20)\\d{2}";
const WORD_MONTH_YEAR = `(?:${MONTH_NAMES})\\.?\\s+${YEAR}`;
const MONTH_YEAR = `(?:0?[1-9]|1[0-2])[./-]${YEAR}`;
const YEAR_MONTH = `${YEAR}[./-](?:0?[1-9]|1[0-2])`;
const DATE_TOKEN = `(?:${WORD_MONTH_YEAR}|${MONTH_YEAR}|${YEAR_MONTH}|${YEAR})`;
const PRESENT_TOKEN =
  "(?:present|current|now|ongoing|today|aujourd['’]hui|actualidad|actual|heute|gegenwart)";
const RANGE_CONNECTOR = "(?:[-‐‑‒–—−~]|to|through|until|a|à|bis|hasta)";

function dateRangePattern(): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${DATE_TOKEN}(?:\\s*${RANGE_CONNECTOR}\\s*(?:${DATE_TOKEN}|${PRESENT_TOKEN}))?(?![\\p{L}\\p{N}])`,
    "giu",
  );
}

export function extractDateStrings(text: string): string[] {
  const dates = Array.from(text.matchAll(dateRangePattern()), (match) =>
    match[0].trim(),
  );
  return Array.from(new Set(dates));
}

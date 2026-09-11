import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  QualitativeAnalysisSchema,
  type AnalysisResultZod,
  type FeedbackZod,
  type ParseViewZod,
} from "./schema";
import { parseSim } from "./parseSim";
import { atsRules } from "./atsRules";
import { extractResumeText, ResumeExtractionError } from "./extract";
import { PublicApiError } from "./errors";
import { prepareInstructions } from "../../../constants";
import { getAnalysisConfig } from "./config";

function getClient(): OpenAI {
  const config = getAnalysisConfig();
  return new OpenAI({
    apiKey: config.OPENAI_API_KEY,
    baseURL: config.OPENAI_BASE_URL,
    timeout: config.OPENAI_TIMEOUT_MS,
  });
}

function getModel(): string {
  return getAnalysisConfig().OPENAI_MODEL;
}

let activeAnalyses = 0;

// Run the analysis pipeline: extract text, parse-sim, deterministic ATS
// rules, then the LLM pass for the 4 qualitative dimensions. Assembles
// the full AnalysisResult envelope so the LLM no longer scores ATS.
export async function analyzeResume(args: {
  pdf: Buffer | Uint8Array;
  jobTitle: string;
  jobDescription: string;
}): Promise<AnalysisResultZod> {
  const config = getAnalysisConfig();
  if (activeAnalyses >= config.ANALYSIS_CONCURRENCY) {
    throw new PublicApiError(
      "SERVICE_UNAVAILABLE",
      "The analysis service is busy. Please try again.",
      503,
      true,
    );
  }

  activeAnalyses += 1;
  try {
    return await runAnalysis(args, config);
  } finally {
    activeAnalyses -= 1;
  }
}

async function runAnalysis(
  args: { pdf: Buffer | Uint8Array; jobTitle: string; jobDescription: string },
  config: ReturnType<typeof getAnalysisConfig>,
): Promise<AnalysisResultZod> {
  let extracted: Awaited<ReturnType<typeof extractResumeText>>;
  try {
    extracted = await extractResumeText(args.pdf, {
      maxPages: config.MAX_PDF_PAGES,
      maxCharacters: config.MAX_EXTRACTED_CHARACTERS,
    });
  } catch (error) {
    if (error instanceof ResumeExtractionError) {
      const message =
        error.code === "PAGE_LIMIT"
          ? "The PDF has too many pages."
          : error.code === "EMPTY_TEXT"
            ? "The PDF contains no extractable text and may require OCR."
            : error.code === "TEXT_LIMIT"
              ? "The PDF contains too much text."
              : "The PDF could not be processed and may be malformed or encrypted.";
      throw new PublicApiError("UNPROCESSABLE_INPUT", message, 422);
    }
    throw error;
  }
  const { totalPages, text, pageTexts } = extracted;

  const instructions = prepareInstructions({
    jobTitle: args.jobTitle,
    jobDescription: args.jobDescription,
  });
  const userMessage = `Resume text (${totalPages} page${totalPages === 1 ? "" : "s"}):\n\n${text}`;

  // Parse-simulation + deterministic ATS run first — they're pure, no LLM,
  // no API key, and they don't depend on the LLM's output. Failures here
  // are bugs in our code, not in the model.
  const parseView: ParseViewZod = parseSim({ text, totalPages, pageTexts });
  const rules = atsRules({
    text,
    jobDescription: args.jobDescription,
    parseView,
  });

  // ponytail: gpt-5.6 reasoning family rejects non-default temperature
  // ("Only the default (1) value is supported"), which surfaced as the 500
  // on /api/analyze. Omit it so the SDK uses the model's default.
  const completion = await getClient().chat.completions.parse({
    model: getModel(),
    max_completion_tokens: config.OPENAI_MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: userMessage },
    ],
    response_format: zodResponseFormat(
      QualitativeAnalysisSchema,
      "qualitative_analysis",
    ),
  });

  const qualitative = completion.choices[0]?.message?.parsed;
  if (!qualitative) {
    throw new Error("OpenAI returned no parsed qualitative feedback.");
  }

  // Assemble the frozen Feedback contract from the deterministic ATS block
  // + the LLM's 4 qualitative categories. overallScore is a weighted average
  // so it stays reproducible too.
  const feedback: FeedbackZod = {
    overallScore: computeOverallScore(rules.score, qualitative),
    ATS: { score: rules.score, tips: rules.tips },
    toneAndStyle: qualitative.toneAndStyle,
    content: qualitative.content,
    structure: qualitative.structure,
    skills: qualitative.skills,
  };

  return {
    feedback,
    parseView,
    ruleTrace: rules.ruleTrace,
    jdKeywords: rules.jdKeywords,
    matchedKeywords: rules.matchedKeywords,
    missingKeywords: rules.missingKeywords,
    uncertainKeywords: rules.uncertainKeywords,
    keywordEvidence: rules.matchingEvidence,
    writer: qualitative.writer,
  };
}

// Weights: ATS 30% (deterministic + reproducible), the 4 qualitative 17.5% each.
function computeOverallScore(
  ats: number,
  q: {
    toneAndStyle: { score: number };
    content: { score: number };
    structure: { score: number };
    skills: { score: number };
  },
): number {
  return Math.round(
    ats * 0.3 +
      q.toneAndStyle.score * 0.175 +
      q.content.score * 0.175 +
      q.structure.score * 0.175 +
      q.skills.score * 0.175,
  );
}

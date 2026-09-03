import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { QualitativeFeedbackSchema, type AnalysisResultZod, type FeedbackZod, type ParseViewZod } from "./schema";
import { parseSim } from "./parseSim";
import { atsRules } from "./atsRules";
import { extractResumeText } from "./extract";
import { prepareInstructions } from "../../../constants";

const DEFAULT_MODEL = "gpt-5.6-luna";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env to run the LLM pass.");
  }
  return new OpenAI({ apiKey });
}

function getModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

// Run the analysis pipeline: extract text, parse-sim, deterministic ATS
// rules, then the LLM pass for the 4 qualitative dimensions. Assembles
// the full AnalysisResult envelope so the LLM no longer scores ATS.
export async function analyzeResume(args: {
  pdf: Buffer | Uint8Array;
  jobTitle: string;
  jobDescription: string;
}): Promise<AnalysisResultZod> {
  const { totalPages, text } = await extractResumeText(args.pdf);

  const instructions = prepareInstructions({
    jobTitle: args.jobTitle,
    jobDescription: args.jobDescription,
  });
  const userMessage = `Resume text (${totalPages} page${totalPages === 1 ? "" : "s"}):\n\n${text}`;

  // Parse-simulation + deterministic ATS run first — they're pure, no LLM,
  // no API key, and they don't depend on the LLM's output. Failures here
  // are bugs in our code, not in the model.
  const parseView: ParseViewZod = parseSim({ text, totalPages });
  const rules = atsRules({ text, jobDescription: args.jobDescription, parseView });

  // ponytail: gpt-5.6 reasoning family rejects non-default temperature
  // ("Only the default (1) value is supported"), which surfaced as the 500
  // on /api/analyze. Omit it so the SDK uses the model's default.
  const completion = await getClient().chat.completions.parse({
    model: getModel(),
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: userMessage },
    ],
    response_format: zodResponseFormat(QualitativeFeedbackSchema, "qualitative_feedback"),
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
  };
}

// Weights: ATS 30% (deterministic + reproducible), the 4 qualitative 17.5% each.
function computeOverallScore(ats: number, q: { toneAndStyle: { score: number }; content: { score: number }; structure: { score: number }; skills: { score: number } }): number {
  return Math.round(ats * 0.30 + q.toneAndStyle.score * 0.175 + q.content.score * 0.175 + q.structure.score * 0.175 + q.skills.score * 0.175);
}

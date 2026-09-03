import { z } from "zod";

// Frozen output contract — mirrors Feedback in types/index.d.ts exactly.
// The LLM (OpenAI Structured Outputs) and the server action both return
// this shape. The existing UI (Summary, Details, ATS, ScoreGauge, etc.)
// consumes it with zero changes.

const TipCategory = z.enum(["good", "improve"]);

const ATSDimensionalTips = z.object({
  type: TipCategory,
  tip: z.string().min(1),
});

const QualitativeTips = z.object({
  type: TipCategory,
  tip: z.string().min(1),
  explanation: z.string().min(1),
});

const Score = z.number().int().min(0).max(100);

const CategoryWithExplanation = z.object({
  score: Score,
  tips: z.array(QualitativeTips).min(3).max(4),
});

const ATSCategory = z.object({
  score: Score,
  tips: z.array(ATSDimensionalTips).min(3).max(4),
});

// What the LLM is asked to produce. The deterministic ATS block is
// computed server-side from rules, so it's not in the LLM's responsibility.
export const QualitativeFeedbackSchema = z.object({
  toneAndStyle: CategoryWithExplanation,
  content: CategoryWithExplanation,
  structure: CategoryWithExplanation,
  skills: CategoryWithExplanation,
});

export type QualitativeFeedbackZod = z.infer<typeof QualitativeFeedbackSchema>;

// The full Feedback contract returned to the client. The LLM fills
// the 4 qualitative categories; the server fills ATS + overallScore
// deterministically. The shape is identical to the frozen Feedback
// in types/index.d.ts.
export const FeedbackSchema = z.object({
  overallScore: Score,
  ATS: ATSCategory,
  toneAndStyle: CategoryWithExplanation,
  content: CategoryWithExplanation,
  structure: CategoryWithExplanation,
  skills: CategoryWithExplanation,
});

export type FeedbackZod = z.infer<typeof FeedbackSchema>;

// Additive: parseView feeds the new Parse View screen. Does not alter
// the frozen Feedback contract.
const SectionType = z.enum([
  "summary", "experience", "education", "skills", "projects",
  "certifications", "awards", "publications", "volunteer",
  "languages", "interests", "references", "other",
]);

export const ParseViewSchema = z.object({
  totalPages: z.number().int().min(1),
  totalLines: z.number().int().min(0),
  contact: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    links: z.array(z.string()),
    location: z.string().nullable(),
  }),
  sections: z.array(z.object({
    type: SectionType,
    title: z.string(),
    startLine: z.number().int().min(0),
    lineCount: z.number().int().min(0),
    bulletCount: z.number().int().min(0),
    dateStrings: z.array(z.string()),
  })),
  warnings: z.array(z.object({
    field: z.enum(["name", "email", "phone", "location", "links", "sections", "dates", "bullets", "overall"]),
    severity: z.enum(["info", "warn", "error"]),
    message: z.string(),
  })),
});

export type ParseViewZod = z.infer<typeof ParseViewSchema>;

export const AnalysisResultSchema = z.object({
  feedback: FeedbackSchema,
  parseView: ParseViewSchema,
  ruleTrace: z.array(z.object({
    ruleId: z.string(),
    label: z.string(),
    passed: z.boolean(),
    weight: z.number().int().min(0),
    detail: z.string(),
    evidence: z.array(z.string()).optional(),
  })),
  jdKeywords: z.array(z.string()),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
});

export type AnalysisResultZod = z.infer<typeof AnalysisResultSchema>;

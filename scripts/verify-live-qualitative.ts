import { getAnalysisConfig } from "../app/lib/server/config";
import {
  OpenAIQualitativeTransport,
  runQualitativeAi,
} from "../app/lib/server/qualitative-ai";

const config = getAnalysisConfig();
const result = await runQualitativeAi(
  {
    enabled: config.AI_ENABLED,
    remainingTokenBudget: config.AI_MONTHLY_TOKEN_LIMIT,
    model: config.OPENAI_MODEL,
    maxOutputTokens: Math.min(config.OPENAI_MAX_OUTPUT_TOKENS, 1_000),
    timeoutMs: config.OPENAI_TIMEOUT_MS,
    idempotencyKey: "resumide-live-provider-smoke-v1",
    resumeText:
      "Avery Candidate\nSoftware Engineer\navery@example.test\n\nExperience\n- Built a TypeScript service that reduced test execution time.\n\nSkills\nTypeScript, PostgreSQL, testing",
    jobTitle: "Software Engineer",
    jobDescription:
      "Build reliable TypeScript services with PostgreSQL and automated tests.",
  },
  new OpenAIQualitativeTransport(
    config.OPENAI_API_KEY,
    config.OPENAI_TIMEOUT_MS,
  ),
);

console.log(
  JSON.stringify({
    status: "ok",
    model: config.OPENAI_MODEL,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  }),
);

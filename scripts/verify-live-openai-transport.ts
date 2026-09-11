import { getAnalysisConfig } from "../app/lib/server/config";
import { OpenAIQualitativeTransport } from "../app/lib/server/qualitative-ai";

const config = getAnalysisConfig();
try {
  const result = await new OpenAIQualitativeTransport(
    config.OPENAI_API_KEY,
    config.OPENAI_TIMEOUT_MS,
  ).execute({
    model: config.OPENAI_MODEL,
    system: "Return structured resume feedback for this synthetic test only.",
    user: "Synthetic candidate: TypeScript engineer with PostgreSQL experience.",
    maxOutputTokens: Math.min(config.OPENAI_MAX_OUTPUT_TOKENS, 1_000),
    idempotencyKey: "resumide-live-transport-smoke-v1",
  });
  console.log(
    JSON.stringify({
      status: "ok",
      model: config.OPENAI_MODEL,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    }),
  );
} catch (error) {
  const status =
    typeof error === "object" && error && "status" in error
      ? Number(error.status)
      : null;
  console.log(
    JSON.stringify({
      status: "failed",
      model: config.OPENAI_MODEL,
      httpStatus: status,
    }),
  );
  process.exitCode = 1;
}

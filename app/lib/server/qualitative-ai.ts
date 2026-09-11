import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { QualitativeAnalysisSchema } from "./schema";
import { prepareInstructions } from "../../../constants";
import { groundWriterSuggestions } from "./writer-grounding";
import { DEFAULT_OPENAI_BASE_URL } from "./egress-policy";

export type QualitativeAiFailureCode =
  | "AI_DISABLED"
  | "AI_BUDGET_EXHAUSTED"
  | "AI_REFUSED"
  | "AI_RATE_LIMITED"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_OUTPUT_INVALID";

export class QualitativeAiFailure extends Error {
  readonly code: QualitativeAiFailureCode;
  readonly retryable: boolean;

  constructor(code: QualitativeAiFailureCode, retryable = false) {
    super("Qualitative analysis is unavailable.");
    this.name = "QualitativeAiFailure";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface QualitativeAiTransport {
  execute(request: {
    model: string;
    system: string;
    user: string;
    maxOutputTokens: number;
    idempotencyKey: string;
  }): Promise<{
    output: unknown;
    refused?: boolean;
    usage: { inputTokens: number; outputTokens: number };
  }>;
}

export class OpenAIQualitativeTransport implements QualitativeAiTransport {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    timeoutMs: number,
    baseUrl = DEFAULT_OPENAI_BASE_URL,
  ) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      timeout: timeoutMs,
    });
  }

  async execute(request: {
    model: string;
    system: string;
    user: string;
    maxOutputTokens: number;
    idempotencyKey: string;
  }) {
    const completion = await this.client.chat.completions.parse(
      {
        model: request.model,
        max_completion_tokens: request.maxOutputTokens,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: zodResponseFormat(
          QualitativeAnalysisSchema,
          "qualitative_analysis",
        ),
      },
      { headers: { "Idempotency-Key": request.idempotencyKey } },
    );
    const message = completion.choices[0]?.message;
    return {
      output: message?.parsed,
      refused: Boolean(message?.refusal),
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
    };
  }
}

export function classifyProviderError(error: unknown): QualitativeAiFailure {
  if (error instanceof QualitativeAiFailure) return error;
  const status =
    typeof error === "object" && error && "status" in error
      ? Number(error.status)
      : 0;
  if (status === 429) return new QualitativeAiFailure("AI_RATE_LIMITED", true);
  if (status >= 500) {
    return new QualitativeAiFailure("AI_PROVIDER_UNAVAILABLE", true);
  }
  return new QualitativeAiFailure("AI_PROVIDER_UNAVAILABLE", false);
}

export async function runQualitativeAi(
  args: {
    enabled: boolean;
    remainingTokenBudget: number;
    model: string;
    maxOutputTokens: number;
    timeoutMs: number;
    idempotencyKey: string;
    resumeText: string;
    jobTitle: string;
    jobDescription: string;
  },
  transport: QualitativeAiTransport,
) {
  if (!args.enabled) throw new QualitativeAiFailure("AI_DISABLED");
  if (args.remainingTokenBudget < args.maxOutputTokens) {
    throw new QualitativeAiFailure("AI_BUDGET_EXHAUSTED");
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      transport.execute({
        model: args.model,
        system: prepareInstructions({
          jobTitle: args.jobTitle,
          jobDescription: args.jobDescription,
        }),
        user: `Resume text:\n\n${args.resumeText}`,
        maxOutputTokens: args.maxOutputTokens,
        idempotencyKey: args.idempotencyKey,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new QualitativeAiFailure("AI_TIMEOUT", true)),
          args.timeoutMs,
        );
        timeout.unref?.();
      }),
    ]);
    if (response.refused) throw new QualitativeAiFailure("AI_REFUSED");
    const parsed = QualitativeAnalysisSchema.safeParse(response.output);
    if (!parsed.success) throw new QualitativeAiFailure("AI_OUTPUT_INVALID");
    return {
      output: {
        ...parsed.data,
        writer: groundWriterSuggestions(parsed.data.writer, args.resumeText),
      },
      usage: response.usage,
    };
  } catch (error) {
    throw classifyProviderError(error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

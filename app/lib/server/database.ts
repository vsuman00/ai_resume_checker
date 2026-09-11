import type { z } from "zod";
import { createSupabaseAdminClient } from "./supabase";

export class PersistenceError extends Error {
  readonly code: string;

  constructor(code: string, options?: ErrorOptions) {
    super("The persistence operation failed.", options);
    this.name = "PersistenceError";
    this.code = code;
  }
}

export interface Repository<TRecord> {
  findById(id: string): Promise<TRecord | null>;
}

export interface AtomicRpcResult {
  data: unknown;
  error: { code?: string; message: string } | null;
}

export type AtomicRpcExecutor = (
  operation: string,
  parameters: Record<string, unknown>,
) => Promise<AtomicRpcResult>;

export class DatabaseTransactionBoundary {
  constructor(private readonly executeRpc: AtomicRpcExecutor) {}

  async run<TResult>(
    operation: string,
    parameters: Record<string, unknown>,
    resultSchema: z.ZodType<TResult>,
  ): Promise<TResult> {
    const { data, error } = await this.executeRpc(operation, parameters);

    if (error) {
      throw new PersistenceError(error.code ?? "DATABASE_OPERATION_FAILED", {
        cause: error,
      });
    }

    const parsed = resultSchema.safeParse(data);
    if (!parsed.success) {
      throw new PersistenceError("DATABASE_RESULT_INVALID", {
        cause: parsed.error,
      });
    }

    return parsed.data;
  }
}

export function createDatabaseTransactionBoundary() {
  const client = createSupabaseAdminClient();

  return new DatabaseTransactionBoundary(async (operation, parameters) => {
    const { data, error } = await client.rpc(operation, parameters);
    return { data, error };
  });
}

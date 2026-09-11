import assert from "node:assert/strict";
import {
  parseServerConfig,
  ServerConfigError,
} from "../app/lib/server/config.ts";

const validEnvironment = {
  NODE_ENV: "production",
  APP_ORIGIN: "https://resumide.example",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "publishable-test-value",
  SUPABASE_SECRET_KEY: "secret-test-value",
  SUPABASE_RESUME_BUCKET: "resumes",
  OPENAI_API_KEY: "openai-test-value",
  OPENAI_MODEL: "test-model",
  OPENAI_TIMEOUT_MS: "30000",
  MAX_UPLOAD_BYTES: "10485760",
};

const parsed = parseServerConfig(validEnvironment);
assert.equal(parsed.NODE_ENV, "production");
assert.equal(parsed.OPENAI_TIMEOUT_MS, 30_000);
assert.equal(parsed.MAX_UPLOAD_BYTES, 10_485_760);
assert.equal(parsed.SUPABASE_RESUME_BUCKET, "resumes");

assert.throws(
  () =>
    parseServerConfig({
      ...validEnvironment,
      SUPABASE_SECRET_KEY: undefined,
    }),
  (error: unknown) => {
    assert.ok(error instanceof ServerConfigError);
    assert.match(error.message, /SUPABASE_SECRET_KEY/);
    assert.doesNotMatch(error.message, /secret-test-value|openai-test-value/);
    return true;
  },
);

assert.throws(
  () =>
    parseServerConfig({
      ...validEnvironment,
      APP_ORIGIN: "not-a-url",
    }),
  (error: unknown) => {
    assert.ok(error instanceof ServerConfigError);
    assert.match(error.message, /APP_ORIGIN/);
    assert.doesNotMatch(error.message, /not-a-url/);
    return true;
  },
);

assert.throws(
  () =>
    parseServerConfig({
      ...validEnvironment,
      MAX_UPLOAD_BYTES: "10485761",
    }),
  ServerConfigError,
);

console.log("Configuration self-check passed.");

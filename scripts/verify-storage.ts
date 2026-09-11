import { randomUUID } from "node:crypto";
import { createResumeStorage } from "../app/lib/server/storage";

const organizationId = randomUUID();
const storage = createResumeStorage();
const uploaded = await storage.upload({
  organizationId,
  resumeId: randomUUID(),
  versionId: randomUUID(),
  bytes: new TextEncoder().encode("%PDF-1.4 local storage fixture"),
});

const publicResponse = await fetch(
  `${process.env.SUPABASE_URL}/storage/v1/object/public/resumes/${uploaded.storageKey}`,
);
if (publicResponse.ok) throw new Error("Private object was publicly readable.");

const signedUrl = await storage.createSignedUrl({
  organizationId,
  storageKey: uploaded.storageKey,
  expiresInSeconds: 30,
});
const signedResponse = await fetch(signedUrl);
if (!signedResponse.ok) throw new Error("Signed object could not be read.");

await storage.remove(uploaded.storageKey);
// eslint-disable-next-line no-console -- This CLI reports verification evidence.
console.log(
  "Configured Supabase private upload, public denial, signed read, and delete passed.",
);

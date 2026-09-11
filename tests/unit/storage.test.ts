import { describe, expect, it, vi } from "vitest";
import {
  createResumeStorageKey,
  ResumeStorage,
  type PrivateStorageBucket,
} from "../../app/lib/server/storage";

function createBucket(): PrivateStorageBucket {
  return {
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    download: vi.fn().mockResolvedValue({
      data: new Blob([new Uint8Array([37, 80, 68, 70])]),
      error: null,
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example/signed" },
      error: null,
    }),
  };
}

describe("private resume storage", () => {
  it("generates tenant-scoped keys and a checksum", async () => {
    const bucket = createBucket();
    const storage = new ResumeStorage(bucket);
    const result = await storage.upload({
      organizationId: "organization-1",
      resumeId: "resume-1",
      versionId: "version-1",
      bytes: new TextEncoder().encode("%PDF-1.4"),
    });

    expect(result.storageKey).toBe(
      createResumeStorageKey({
        organizationId: "organization-1",
        resumeId: "resume-1",
        versionId: "version-1",
      }),
    );
    expect(result.checksum).toHaveLength(64);
  });

  it("cleans a possibly partial object after upload failure", async () => {
    const bucket = createBucket();
    vi.mocked(bucket.upload).mockResolvedValue({ error: new Error("failed") });
    const storage = new ResumeStorage(bucket);

    await expect(
      storage.upload({
        organizationId: "organization-1",
        resumeId: "resume-1",
        versionId: "version-1",
        bytes: new Uint8Array([1]),
      }),
    ).rejects.toMatchObject({ code: "STORAGE_UPLOAD_FAILED" });
    expect(bucket.remove).toHaveBeenCalledOnce();
  });

  it("downloads private object bytes", async () => {
    const storage = new ResumeStorage(createBucket());
    await expect(storage.download("private.pdf")).resolves.toEqual(
      new Uint8Array([37, 80, 68, 70]),
    );
  });

  it("denies guessed cross-tenant keys and excessive expiry", async () => {
    const bucket = createBucket();
    const storage = new ResumeStorage(bucket);

    await expect(
      storage.createSignedUrl({
        organizationId: "organization-1",
        storageKey: "organizations/organization-2/resumes/resume.pdf",
      }),
    ).rejects.toMatchObject({ code: "STORAGE_OBJECT_NOT_FOUND" });
    await expect(
      storage.createSignedUrl({
        organizationId: "organization-1",
        storageKey: "organizations/organization-1/resumes/resume.pdf",
        expiresInSeconds: 301,
      }),
    ).rejects.toMatchObject({ code: "SIGNED_URL_EXPIRY_INVALID" });
    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
  });
});

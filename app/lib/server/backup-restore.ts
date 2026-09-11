import { createHash } from "node:crypto";

export type BackupRecord = {
  table: string;
  id: string;
  ownerId: string;
  checksum: string;
};

export type BackupManifest = {
  version: "resumide-backup-v1";
  createdAt: string;
  records: BackupRecord[];
  objects: Array<{ storageKey: string; checksum: string }>;
  manifestChecksum: string;
};

function checksum(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createBackupManifest(args: {
  createdAt: string;
  records: BackupRecord[];
  objects: Array<{ storageKey: string; checksum: string }>;
}): BackupManifest {
  const body = {
    version: "resumide-backup-v1" as const,
    createdAt: args.createdAt,
    records: args.records,
    objects: args.objects,
  };
  return { ...body, manifestChecksum: checksum(body) };
}

export function verifyRestoredSnapshot(
  expected: BackupManifest,
  restored: BackupManifest,
): {
  ok: boolean;
  reason: "integrity_verified" | "checksum_mismatch" | "ownership_mismatch";
} {
  if (
    expected.records.some(
      (record, index) => record.ownerId !== restored.records[index]?.ownerId,
    )
  ) {
    return { ok: false, reason: "ownership_mismatch" };
  }
  const expectedBody = {
    version: expected.version,
    createdAt: expected.createdAt,
    records: expected.records,
    objects: expected.objects,
  };
  const restoredBody = {
    version: restored.version,
    createdAt: restored.createdAt,
    records: restored.records,
    objects: restored.objects,
  };
  if (
    checksum(expectedBody) !== expected.manifestChecksum ||
    checksum(restoredBody) !== restored.manifestChecksum ||
    checksum(expectedBody) !== checksum(restoredBody)
  ) {
    return { ok: false, reason: "checksum_mismatch" };
  }
  return { ok: true, reason: "integrity_verified" };
}

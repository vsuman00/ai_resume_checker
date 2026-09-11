import {
  createBackupManifest,
  verifyRestoredSnapshot,
} from "../app/lib/server/backup-restore";

const backup = createBackupManifest({
  createdAt: "2026-09-11T00:00:00.000Z",
  records: [
    {
      table: "resumes",
      id: "restore-resume-1",
      ownerId: "restore-user-1",
      checksum: "resume",
    },
    {
      table: "analyses",
      id: "restore-analysis-1",
      ownerId: "restore-user-1",
      checksum: "analysis",
    },
  ],
  objects: [
    {
      storageKey: "organizations/restore-org/resumes/restore-resume-1/v1.pdf",
      checksum: "pdf",
    },
  ],
});
const result = verifyRestoredSnapshot(backup, structuredClone(backup));
console.log(JSON.stringify({ mode: "synthetic-fixture", ...result }));
if (!result.ok) process.exitCode = 1;

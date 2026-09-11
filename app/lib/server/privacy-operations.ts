export type ExportManifest = {
  version: "resumide-export-v1";
  generatedAt: string;
  account: { id: string };
  records: Record<string, unknown[]>;
  files: Array<{ storageKey: string; bytes?: number; checksum?: string }>;
};

export function buildExportManifest(args: {
  generatedAt: string;
  account: { id: string };
  records: Record<string, unknown[]>;
  files: Array<{ storageKey: string; bytes?: number; checksum?: string }>;
}): ExportManifest {
  return {
    version: "resumide-export-v1",
    generatedAt: args.generatedAt,
    account: { id: args.account.id },
    records: args.records,
    files: args.files.map((file) => ({ ...file })),
  };
}

export function retentionCutoff(now: Date, retentionDays: number): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  return cutoff;
}

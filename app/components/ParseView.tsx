import { cn } from "~/lib/utils";

// Parse View — the hero differentiator (PLAN.md §2 pillar 1, §5.2).
// Shows what an ATS actually extracts from the resume, next to the original,
// flagging every field the parser mangles or misses. Pure presentation.

type Severity = "info" | "warn" | "error";

const severityStyles: Record<Severity, string> = {
    info: "bg-gray-100 text-gray-600",
    warn: "bg-badge-yellow text-badge-yellow-text",
    error: "bg-badge-red text-badge-red-text",
};

const severityIcon: Record<Severity, string> = {
    info: "/icons/warning.svg",
    warn: "/icons/warning.svg",
    error: "/icons/warning.svg",
};

const Field = ({ label, value, ok }: { label: string; value: string | null; ok: boolean }) => (
    <div className="flex flex-row items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="flex flex-row items-center gap-2">
            <span className={cn("text-sm font-medium", value ? "text-gray-800" : "text-gray-400")}>
                {value || "— not detected —"}
            </span>
            <img
                src={ok ? "/icons/check.svg" : "/icons/warning.svg"}
                alt={ok ? "found" : "missing"}
                className="size-4"
            />
        </div>
    </div>
);

const ParseView = ({ parseView, imageUrl }: { parseView: ParseViewData; imageUrl: string }) => {
    const { contact, sections, warnings, totalPages, totalLines } = parseView;

    return (
        <div className="bg-white rounded-2xl shadow-md w-full p-6 flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold">Parse View</h2>
                <p className="text-sm text-gray-500 mt-1">
                    What an ATS actually extracts from your resume. Modeled on Workday-class parsing —
                    a simulation, not the exact ATS. {totalPages} page{totalPages === 1 ? "" : "s"}, {totalLines} lines.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: original */}
                <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Original</h3>
                    <div className="gradient-border">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="resume"
                                className="w-full h-full object-contain rounded-2xl"
                            />
                        ) : (
                            <div className="w-full h-[300px] flex items-center justify-center text-gray-400">
                                Preview unavailable
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: what the ATS sees */}
                <div className="flex-1 flex flex-col gap-4">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">What the ATS extracts</h3>
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <Field label="Name" value={contact.name} ok={contact.name !== null} />
                            <Field label="Email" value={contact.email} ok={contact.email !== null} />
                            <Field label="Phone" value={contact.phone} ok={contact.phone !== null} />
                            <Field label="Location" value={contact.location} ok={contact.location !== null} />
                            <Field
                                label="Links"
                                value={contact.links.length > 0 ? contact.links.join(", ") : null}
                                ok={contact.links.length > 0}
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">
                            Sections detected ({sections.length})
                        </h3>
                        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                            {sections.length === 0 ? (
                                <p className="text-sm text-gray-400">No section headers detected.</p>
                            ) : (
                                sections.map((s, i) => (
                                    <div
                                        key={`${s.type}-${s.startLine}-${i}`}
                                        className="flex flex-row items-center justify-between gap-2 py-1"
                                    >
                                        <span className="text-sm font-medium capitalize text-gray-800">
                                            {s.type}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {s.lineCount} lines · {s.bulletCount} bullets
                                            {s.dateStrings.length > 0 && ` · ${s.dateStrings.length} dates`}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Parsing warnings</h3>
                    <div className="flex flex-col gap-2">
                        {warnings.map((w, i) => (
                            <div
                                key={`${w.field}-${i}`}
                                className={cn(
                                    "flex flex-row items-center gap-2 rounded-lg px-3 py-2 text-sm",
                                    severityStyles[w.severity]
                                )}
                            >
                                <img src={severityIcon[w.severity]} alt={w.severity} className="size-4" />
                                <span>{w.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParseView;
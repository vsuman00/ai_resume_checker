import { cn } from "~/lib/utils";

// Heatmap — the shareable visual differentiator (PLAN.md §2 pillar 2, §5.2).
// Three parts: overall match %, per-keyword chips, and the rule trace.
// Pure presentation — consumes only the deterministic pipeline's outputs.

const Heatmap = ({
    jdKeywords,
    matchedKeywords,
    missingKeywords,
    ruleTrace,
}: {
    jdKeywords: string[];
    matchedKeywords: string[];
    missingKeywords: string[];
    ruleTrace: RuleTrace[];
}) => {
    const matched = new Set(matchedKeywords);
    const total = jdKeywords.length;
    const ratio = total > 0 ? matchedKeywords.length / total : 0;
    const pct = Math.round(ratio * 100);

    return (
        <div className="bg-white rounded-2xl shadow-md w-full p-6 flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold">Keyword Heatmap</h2>
                <p className="text-sm text-gray-500 mt-1">
                    The top {total} skills/terms from the job description, and whether your resume mentions them.
                </p>
            </div>

            {/* Overall match bar */}
            <div>
                <div className="flex flex-row items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">JD keyword coverage</span>
                    <span className="text-sm font-bold text-gray-800">
                        {matchedKeywords.length}/{total} ({pct}%)
                    </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full transition-all",
                            pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            {/* Keyword chips */}
            <div>
                <h3 className="text-lg font-semibold mb-2">By keyword</h3>
                {total === 0 ? (
                    <p className="text-sm text-gray-400">
                        No keywords extracted (add a job description to see matches).
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {jdKeywords.map((kw) => {
                            const isMatch = matched.has(kw);
                            return (
                                <span
                                    key={kw}
                                    className={cn(
                                        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                                        isMatch
                                            ? "bg-badge-green text-badge-green-text"
                                            : "bg-badge-red text-badge-red-text"
                                    )}
                                >
                                    <img
                                        src={isMatch ? "/icons/check.svg" : "/icons/warning.svg"}
                                        alt={isMatch ? "found" : "missing"}
                                        className="size-3.5"
                                    />
                                    {kw}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Rule trace */}
            <div>
                <h3 className="text-lg font-semibold mb-2">How the score was computed</h3>
                <p className="text-xs text-gray-500 mb-3">
                    Deterministic rules — every score links to the rule that produced it.
                </p>
                <div className="flex flex-col gap-2">
                    {ruleTrace.map((r) => (
                        <div
                            key={r.ruleId}
                            className={cn(
                                "flex flex-row items-start gap-3 rounded-lg px-3 py-2 border",
                                r.passed
                                    ? "bg-green-50 border-green-200"
                                    : "bg-yellow-50 border-yellow-200"
                            )}
                        >
                            <img
                                src={r.passed ? "/icons/check.svg" : "/icons/warning.svg"}
                                alt={r.passed ? "passed" : "failed"}
                                className="size-4 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-row items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-gray-800">{r.label}</span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        weight {r.weight}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{r.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Heatmap;
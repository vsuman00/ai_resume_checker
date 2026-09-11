import { scoreBand } from "~/lib/score-band";

interface Suggestion {
  type: "good" | "improve";
  tip: string;
}

interface ATSProps {
  score: number;
  suggestions: Suggestion[];
}

const scoreLabels = {
  needs_work: "Needs attention",
  good_start: "Good start",
  strong: "Strong",
} as const;

const ATS = ({ score, suggestions }: ATSProps) => {
  const band = scoreBand(score);

  return (
    <section
      className="ats-evidence-overview"
      aria-labelledby="ats-evidence-heading"
    >
      <div className="ats-evidence-heading">
        <div>
          <p className="workspace-eyebrow">Compatibility guidance</p>
          <h2 id="ats-evidence-heading">ATS evidence</h2>
          <p>
            This score reflects the deterministic checks and parse simulation
            available for this resume.
          </p>
        </div>
        <div className={`ats-score-status is-${band}`}>
          <strong>{score}/100</strong>
          <span>{scoreLabels[band]}</span>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <ul className="ats-suggestion-list">
          {suggestions.map((suggestion) => (
            <li
              key={`${suggestion.type}-${suggestion.tip}`}
              className={suggestion.type === "good" ? "is-good" : "is-improve"}
            >
              <span className="ats-suggestion-indicator" aria-hidden="true" />
              <div>
                <small>
                  {suggestion.type === "good" ? "Strength" : "Needs attention"}
                </small>
                <p>{suggestion.tip}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="result-empty-copy">
          No ATS guidance is available for this analysis.
        </p>
      )}
    </section>
  );
};

export default ATS;

import { useState } from "react";

type Severity = "info" | "warn" | "error";

const Field = ({
  label,
  value,
  ok,
}: {
  label: string;
  value: string | null;
  ok: boolean;
}) => (
  <div className="parse-field-row">
    <span>{label}</span>
    <div>
      <strong className={value ? "" : "is-missing"}>
        {value || "Not detected"}
      </strong>
      <span className={`parse-field-state${ok ? " is-detected" : ""}`}>
        {ok ? "Detected" : "Missing"}
      </span>
    </div>
  </div>
);

const ParseView = ({
  parseView,
  imageUrl,
  imageUrls = [],
}: {
  parseView: ParseViewData;
  imageUrl: string;
  imageUrls?: string[];
}) => {
  const { contact, sections, warnings, totalPages, totalLines } = parseView;
  const pages = parseView.pages.length
    ? parseView.pages
    : Array.from({ length: Math.max(1, totalPages) }, (_, index) => ({
        pageNumber: index + 1,
        text: "",
        lineCount: index === 0 ? totalLines : 0,
        confidence: "low" as const,
        warnings: [
          "Per-page extraction evidence is unavailable for this saved result.",
        ],
      }));
  const [selectedPage, setSelectedPage] = useState(1);
  const page =
    pages.find((item) => item.pageNumber === selectedPage) ?? pages[0];
  const previewUrl =
    imageUrls[page.pageNumber - 1] ?? (page.pageNumber === 1 ? imageUrl : "");

  return (
    <section className="parse-view" aria-labelledby="parse-view-heading">
      <div className="result-section-heading">
        <div>
          <p className="workspace-eyebrow">Parse simulation</p>
          <h2 id="parse-view-heading">What Resumide extracted</h2>
        </div>
        <span>
          {totalPages} page{totalPages === 1 ? "" : "s"} · {page.confidence}{" "}
          confidence
        </span>
      </div>
      <p className="parse-view-intro">
        This is an ATS-like parse simulation, not an exact proprietary ATS
        parser. {totalLines} lines were extracted for review.
      </p>

      <div className="parse-comparison">
        <section
          className="parse-source-region"
          aria-labelledby="parse-source-heading"
        >
          <div className="parse-region-heading">
            <h3 id="parse-source-heading">Source document</h3>
            <span>Original PDF</span>
          </div>
          <div className="parse-source-preview">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Resume source preview, page ${page.pageNumber}`}
              />
            ) : (
              <div className="parse-preview-unavailable">
                Preview unavailable
              </div>
            )}
          </div>
        </section>

        <section
          className="parse-extraction-region"
          aria-labelledby="parse-extraction-heading"
        >
          <div className="parse-region-heading">
            <h3 id="parse-extraction-heading">Extracted structure</h3>
            <span>Evidence layer</span>
          </div>
          <div className="parse-page-control">
            <label htmlFor="parse-page-select">Review page</label>
            <select
              id="parse-page-select"
              aria-label="Parse page"
              value={selectedPage}
              onChange={(event) => setSelectedPage(Number(event.target.value))}
            >
              {pages.map((item) => (
                <option key={item.pageNumber} value={item.pageNumber}>
                  Page {item.pageNumber}
                </option>
              ))}
            </select>
            <span className={`parse-confidence is-${page.confidence}`}>
              {page.confidence[0].toUpperCase() + page.confidence.slice(1)}{" "}
              confidence
            </span>
          </div>
          <div className="parse-page-evidence" aria-live="polite">
            <h4>Page {page.pageNumber} extracted evidence</h4>
            <pre>{page.text || "No text extracted from this page."}</pre>
            {page.warnings.length > 0 ? (
              <ul>
                {page.warnings.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : (
              <p>No page-specific limitations detected.</p>
            )}
          </div>
          <div className="parse-extracted-block">
            <h4>Contact details</h4>
            <div>
              <Field
                label="Name"
                value={contact.name}
                ok={contact.name !== null}
              />
              <Field
                label="Email"
                value={contact.email}
                ok={contact.email !== null}
              />
              <Field
                label="Phone"
                value={contact.phone}
                ok={contact.phone !== null}
              />
              <Field
                label="Location"
                value={contact.location}
                ok={contact.location !== null}
              />
              <Field
                label="Links"
                value={
                  contact.links.length > 0 ? contact.links.join(", ") : null
                }
                ok={contact.links.length > 0}
              />
            </div>
          </div>

          <div className="parse-extracted-block">
            <h4>Sections detected ({sections.length})</h4>
            <div className="parse-section-list">
              {sections.length === 0 ? (
                <p>No section headers detected.</p>
              ) : (
                sections.map((section, index) => (
                  <div
                    key={`${section.type}-${section.startLine}-${index}`}
                    className="parse-section-row"
                  >
                    <strong>{section.type}</strong>
                    <span>
                      {section.lineCount} lines, {section.bulletCount} bullets
                      {section.dateStrings.length > 0
                        ? `, ${section.dateStrings.length} dates`
                        : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {warnings.length > 0 ? (
        <section
          className="parse-warnings"
          aria-labelledby="parse-warning-heading"
        >
          <h3 id="parse-warning-heading">Parsing warnings</h3>
          <div>
            {warnings.map((warning, index) => (
              <article
                key={`${warning.field}-${index}`}
                className={`parse-warning-row is-${warning.severity as Severity}`}
              >
                <span>{warning.severity}</span>
                <p>{warning.message}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default ParseView;

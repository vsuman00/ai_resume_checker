import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const tabDefinitions = [
  { id: "overview", label: "Overview" },
  { id: "evidence", label: "ATS evidence" },
  { id: "parse", label: "Parse view" },
  { id: "keywords", label: "Keywords" },
  { id: "rewrite", label: "Rewrite" },
] as const;

export type ResultTabId = (typeof tabDefinitions)[number]["id"];

function isResultTabId(value: string): value is ResultTabId {
  return tabDefinitions.some((tab) => tab.id === value);
}

function readTabFromHash(): ResultTabId | null {
  const tabId = window.location.hash.slice(1);
  return isResultTabId(tabId) ? tabId : null;
}

const ResultTabs = ({
  content,
}: {
  content: Record<ResultTabId, ReactNode>;
}) => {
  const [activeTab, setActiveTab] = useState<ResultTabId>("overview");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const updateFromHash = () => {
      const tabId = readTabFromHash();
      if (tabId) setActiveTab(tabId);
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, []);

  const selectTab = (tabId: ResultTabId, focus = false) => {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `#${tabId}`);
    if (focus) {
      const index = tabDefinitions.findIndex((tab) => tab.id === tabId);
      tabRefs.current[index]?.focus();
    }
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index;
    if (event.key === "ArrowRight")
      nextIndex = (index + 1) % tabDefinitions.length;
    if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + tabDefinitions.length) % tabDefinitions.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabDefinitions.length - 1;
    if (nextIndex === index) return;

    event.preventDefault();
    selectTab(tabDefinitions[nextIndex].id, true);
  };

  return (
    <div className="result-tabs">
      <div
        className="result-tab-list"
        role="tablist"
        aria-label="Resume analysis sections"
      >
        {tabDefinitions.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`result-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section
        id={`${activeTab}-panel`}
        className="result-tab-panel"
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
        tabIndex={0}
      >
        {content[activeTab]}
      </section>
    </div>
  );
};

export default ResultTabs;

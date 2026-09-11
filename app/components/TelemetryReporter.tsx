import { useEffect } from "react";

type TelemetryPayload =
  | {
      type: "client_error";
      code: "window_error" | "unhandled_rejection";
      path: string;
    }
  | {
      type: "web_vital";
      name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
      value: number;
      path: string;
    };

function send(payload: TelemetryPayload): void {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/telemetry",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }
  void fetch("/api/telemetry", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
  }).catch(() => undefined);
}

export default function TelemetryReporter() {
  useEffect(() => {
    const path = () => window.location.pathname.slice(0, 200);
    const onError = () =>
      send({ type: "client_error", code: "window_error", path: path() });
    const onRejection = () =>
      send({
        type: "client_error",
        code: "unhandled_rejection",
        path: path(),
      });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    const observers: PerformanceObserver[] = [];
    const observe = (
      entryType: string,
      name: Extract<TelemetryPayload, { type: "web_vital" }>["name"],
      value: (entry: PerformanceEntry) => number,
    ) => {
      if (!("PerformanceObserver" in window)) return;
      if (!PerformanceObserver.supportedEntryTypes?.includes(entryType)) return;
      try {
        const observer = new PerformanceObserver((list) => {
          const entry = list.getEntries().at(-1);
          if (entry)
            send({
              type: "web_vital",
              name,
              value: value(entry),
              path: path(),
            });
        });
        observer.observe({ type: entryType, buffered: true });
        observers.push(observer);
      } catch {
        // Browser support is optional; page functionality does not depend on telemetry.
      }
    };
    observe("largest-contentful-paint", "LCP", (entry) => entry.startTime);
    observe("first-contentful-paint", "FCP", (entry) => entry.startTime);
    observe(
      "layout-shift",
      "CLS",
      (entry) => (entry as PerformanceEntry & { value?: number }).value ?? 0,
    );
    observe(
      "event",
      "INP",
      (entry) => (entry as PerformanceEventTiming).duration,
    );
    observe("navigation", "TTFB", (entry) => {
      const navigation = entry as PerformanceNavigationTiming;
      return navigation.responseStart - navigation.requestStart;
    });

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);
  return null;
}

import { getServerConfig } from "~/lib/server/config";
import { createRequestId } from "~/lib/server/request-context";
import { metrics } from "~/lib/server/observability";

export function loader({ request }: { request: Request }) {
  const requestId = createRequestId();
  const token = getServerConfig().METRICS_TOKEN;
  if (!token || request.headers.get("X-Metrics-Token") !== token) {
    return new Response(null, {
      status: 404,
      headers: { "X-Request-Id": requestId },
    });
  }
  return new Response(metrics.toPrometheus(), {
    headers: {
      "Content-Type": "text/plain; version=0.0.4",
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    },
  });
}

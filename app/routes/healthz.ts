import { createRequestId } from "~/lib/server/request-context";

export function loader() {
  const requestId = createRequestId();
  return Response.json(
    { status: "ok" },
    { headers: { "X-Request-Id": requestId } },
  );
}

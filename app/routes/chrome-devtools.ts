// Chrome DevTools probes this optional endpoint. A 204 prevents the request
// from being treated as an application route miss during local development.
export function loader() {
  return new Response(null, { status: 204 });
}

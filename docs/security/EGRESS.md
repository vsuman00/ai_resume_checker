# Phase 7 egress policy

Status: **IMPLEMENTED LOCALLY, DEPLOYMENT NETWORK POLICY REQUIRED FOR A4**

The application accepts only `https://api.openai.com/v1` as its OpenAI base URL.
The URL cannot contain credentials, query parameters, or a fragment. The
qualitative worker and the legacy direct analysis client use this same validated
endpoint, and the default is safe when `OPENAI_BASE_URL` is omitted.

Supabase remains the only other application service boundary. The deployment
must enforce outbound network policy to the configured Supabase origin and the
approved OpenAI origin, and deny all other egress. DNS, firewall, proxy, and
provider-region evidence is deployment-owned and remains an A4 attachment.

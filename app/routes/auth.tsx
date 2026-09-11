import { z } from "zod";
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/auth";
import PublicShell from "~/components/PublicShell";
import EvidenceScene3D from "~/components/EvidenceScene3D";
import { safeReturnTo } from "~/lib/server/auth";
import { getServerConfig } from "~/lib/server/config";
import { assertSameOrigin } from "~/lib/server/security";
import { createSupabaseServerClient } from "~/lib/server/supabase";

const EmailSchema = z.string().trim().email();

interface AuthActionData {
  error?: string;
  success?: string;
}

export function meta() {
  return [{ title: "Resumide | Sign in" }];
}

export async function action({
  request,
}: Route.ActionArgs): Promise<AuthActionData | Response> {
  assertSameOrigin(request, getServerConfig().APP_ORIGIN);
  const form = await request.formData();
  const email = EmailSchema.safeParse(form.get("email"));
  const next = form.get("next");
  const returnTo = safeReturnTo(typeof next === "string" ? next : null);

  if (!email.success) {
    return { error: "Enter a valid email address." };
  }

  const responseHeaders = new Headers();
  const client = createSupabaseServerClient(request, responseHeaders);
  const callbackUrl = new URL("/auth/callback", getServerConfig().APP_ORIGIN);
  callbackUrl.searchParams.set("next", returnTo);
  const { error } = await client.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    return { error: "We could not send a sign-in link. Try again shortly." };
  }

  return Response.json(
    { success: "Check your email for a secure sign-in link." },
    { headers: responseHeaders },
  );
}

export default function Auth() {
  const actionData = useActionData<typeof action>() as
    AuthActionData | undefined;
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const next = safeReturnTo(searchParams.get("next"));
  const invalidLink = searchParams.get("error") === "invalid_link";
  const isSubmitting = navigation.state === "submitting";

  return (
    <PublicShell>
      <main className="auth-page">
        <section className="auth-layout" aria-labelledby="sign-in-title">
          <aside
            className="auth-trust-panel"
            aria-labelledby="auth-trust-heading"
          >
            <p className="workspace-eyebrow">Private by design</p>
            <h2 id="auth-trust-heading">Keep every review private.</h2>
            <p>
              Sign in once to keep your results durable, private, and available
              across devices.
            </p>
            <EvidenceScene3D
              variant="auth"
              compact
              label="Private three dimensional resume workspace"
            />
            <div className="auth-privacy-signal">
              <span className="auth-privacy-mark" aria-hidden="true" />
              <div>
                <strong>Private workspace</strong>
                <small>Only you can open your saved analyses.</small>
              </div>
            </div>
            <ul>
              <li>Private analysis history</li>
              <li>Durable results and source evidence</li>
              <li>No password to remember</li>
            </ul>
          </aside>

          <section className="auth-form-panel">
            {actionData?.success ? (
              <div className="auth-success-state">
                <p className="workspace-eyebrow">Secure link sent</p>
                <h1 id="sign-in-title">Check your email</h1>
                <p role="status" aria-live="polite">
                  {actionData.success}
                </p>
                <p>
                  Open the link from the same browser to return safely to your
                  analysis.
                </p>
                <Link
                  to={`/auth?next=${encodeURIComponent(next)}`}
                  className="back-button w-fit"
                >
                  Use another email
                </Link>
              </div>
            ) : (
              <>
                <p className="workspace-eyebrow">Welcome back</p>
                <h1 id="sign-in-title">Sign in to Resumide</h1>
                <p className="auth-form-intro">
                  Enter your email address and we will send a secure,
                  password-free sign-in link.
                </p>

                {invalidLink ? (
                  <section className="auth-message is-error" role="alert">
                    <h2>Your sign-in link has expired</h2>
                    <p>
                      Request a new one below and we will send it to your email.
                    </p>
                  </section>
                ) : null}

                <Form
                  method="post"
                  className="auth-form"
                  aria-busy={isSubmitting}
                >
                  <input type="hidden" name="next" value={next} />
                  <div className="form-div">
                    <label htmlFor="email">Email address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      aria-describedby={
                        actionData?.error ? "email-error" : undefined
                      }
                      aria-invalid={Boolean(actionData?.error)}
                    />
                    {actionData?.error ? (
                      <p id="email-error" className="field-error" role="alert">
                        {actionData.error}
                      </p>
                    ) : null}
                  </div>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Sending secure link"
                      : "Send secure sign-in link"}
                  </button>
                </Form>
                <p className="auth-helper-copy">No password required.</p>
                <Link to="/" className="back-button w-fit">
                  Return to Resumide
                </Link>
              </>
            )}
          </section>
        </section>
      </main>
    </PublicShell>
  );
}

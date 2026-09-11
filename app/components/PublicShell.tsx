import type { ReactNode } from "react";
import { Form, Link, useRouteLoaderData } from "react-router";
import ThemeControl from "~/components/ThemeControl";
import BrandLockup from "~/components/BrandLockup";

interface RootLoaderData {
  user: { email?: string } | null;
}

const PublicShell = ({ children }: { children: ReactNode }) => {
  const rootData = useRouteLoaderData("root") as RootLoaderData | undefined;

  return (
    <div className="public-shell">
      <header className="public-header">
        <Link to="/" className="workspace-brand" aria-label="Resumide home">
          <BrandLockup />
        </Link>
        <nav className="public-nav" aria-label="Product navigation">
          <Link to="/#product">Product</Link>
          <Link to="/#scoring">How scoring works</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
        <div className="public-actions">
          <div className="public-header-theme">
            <ThemeControl />
          </div>
          <Link
            to="/upload"
            className="primary-button public-analyze-action"
            aria-label="Analyze resume"
          >
            <span className="public-analyze-full">Analyze resume</span>
            <span className="public-analyze-short" aria-hidden="true">
              Analyze
            </span>
          </Link>
          {rootData?.user ? (
            <Form method="post" action="/auth/logout">
              <button
                type="submit"
                className="back-button public-account-action"
              >
                Sign out
              </button>
            </Form>
          ) : (
            <Link to="/auth" className="back-button public-account-action">
              Sign in
            </Link>
          )}
          <details className="public-mobile-menu">
            <summary>
              <span className="sr-only">Open product navigation</span>
              <span className="public-mobile-menu-icon" aria-hidden="true" />
            </summary>
            <nav aria-label="Mobile product navigation">
              <Link to="/#product">Product</Link>
              <Link to="/#scoring">How scoring works</Link>
              <Link to="/privacy">Privacy</Link>
              {rootData?.user ? (
                <Form method="post" action="/auth/logout">
                  <button type="submit">Sign out</button>
                </Form>
              ) : (
                <Link to="/auth">Sign in</Link>
              )}
            </nav>
          </details>
        </div>
      </header>
      {children}
      <footer className="public-footer">
        <div>
          <Link to="/" className="workspace-brand" aria-label="Resumide home">
            <BrandLockup />
          </Link>
          <p>Evidence before edits. Clarity before confidence.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link to="/#product">Product</Link>
          <Link to="/#scoring">Scoring</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
};

export default PublicShell;

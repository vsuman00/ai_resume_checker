import { Form, Link, useRouteLoaderData } from "react-router";
import ThemeControl from "~/components/ThemeControl";
import BrandLockup from "~/components/BrandLockup";

interface RootLoaderData {
  user: { email?: string } | null;
}

const Navbar = () => {
  const rootData = useRouteLoaderData("root") as RootLoaderData | undefined;

  return (
    <nav className="navbar" aria-label="Primary navigation">
      <Link to="/" className="brand-link" aria-label="Resumide home">
        <BrandLockup compact showDescriptor={false} />
      </Link>
      <div className="navbar-actions">
        <ThemeControl />
        <Link
          to="/upload"
          className="primary-button navbar-analyze w-fit"
          aria-label="Analyze resume"
        >
          <span className="navbar-analyze-full">Analyze resume</span>
          <span className="navbar-analyze-short" aria-hidden="true">
            Analyze
          </span>
        </Link>
        {rootData?.user ? (
          <Form method="post" action="/auth/logout">
            <button type="submit" className="back-button">
              Sign out
            </button>
          </Form>
        ) : (
          <Link to="/auth" className="back-button">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
};
export default Navbar;

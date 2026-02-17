import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import LoginForm from "@/components/auth/LoginForm";
import SEO from "@/components/SEO";

const Login = () => {
  const [params] = useSearchParams();
  const redirectParam = params.get("redirect");

  const redirectTo = useMemo(() => {
    const fallback = "/account/dashboard";
    if (!redirectParam) return fallback;
    // Basic hardening: only allow internal redirects.
    if (redirectParam.startsWith("http://") || redirectParam.startsWith("https://")) return fallback;
    if (!redirectParam.startsWith("/")) return fallback;
    return redirectParam;
  }, [redirectParam]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <SEO
        title="Sign in - ScopeDrop"
        description="Sign in to your ScopeDrop account."
        keywords={["ScopeDrop", "login", "sign in"]}
      />
      <Header />

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <LoginForm redirectTo={redirectTo} />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Back to{" "}
              <Link to="/" className="text-oxford hover:underline">
                Home
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;


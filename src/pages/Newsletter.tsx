import { Link, useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { PageShell } from "@/components/home/PageShell";
import { NewsletterBlock } from "@/components/home/NewsletterBlock";

const INCLUDES: { title: string; body: string }[] = [
  { title: "Every round", body: "The funding rounds we track, with company, stage and amount." },
  { title: "Every acquisition", body: "M&A, acqui-hires and listings, decoded for what they signal." },
  { title: "One new concept", body: "A term or idea from the Learn tracks, explained in three minutes." },
  { title: "Three stories that mattered", body: "The moves worth your attention, picked by the desk." },
];

const Newsletter = () => {
  const [params] = useSearchParams();
  // The header's "Sign in" lands here (from=signin) until reader accounts ship.
  const fromSignin = params.get("from") === "signin";

  return (
    <PageShell>
      <SEO
        title="Newsletter — ScopeDrop"
        description="Get Your Scope: every round, every acquisition, one new concept and the three stories that mattered."
        keywords={["startup newsletter", "funding newsletter", "ScopeDrop"]}
      />
      <div className="nl-page">
        <NewsletterBlock source={fromSignin ? "signin" : "newsletter"} />
      </div>
      <section className="flow-sec">
        <div className="wrap">
          <div className="sec-h">
            <h3>What's in each edition</h3>
            <Link className="more" to="/startups/news">
              Read the latest →
            </Link>
          </div>
          <div className="lr-terms">
            {INCLUDES.map((i) => (
              <div key={i.title} className="lr-term">
                <strong>{i.title}</strong>
                <span>{i.body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default Newsletter;

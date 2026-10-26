import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { PageHead, PageShell } from "@/components/home/PageShell";
import { SECTIONS, SECTION_KEYS } from "../../../supabase/functions/_shared/sections";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Collect",
    body: "We pull signals from public reporting on startups, tech and AI through the day: funding announcements, launches, acquisitions, policy moves.",
  },
  {
    title: "Filter",
    body: "Each signal is checked for relevance before anything is written. Off-topic items (consumer deals, celebrity news, general-interest stories) are dropped, and duplicates of a story we already covered are merged.",
  },
  {
    title: "Place",
    body: "Every story lands in exactly one section, using the definitions below. The section is chosen from the source text, not from the headline we write.",
  },
  {
    title: "Write",
    body: "The ScopeDrop desk drafts each story with language models working from the original reporting, then publishes it under the desk byline. Only published stories appear on the site.",
  },
  {
    title: "Structure",
    body: "Funding rounds and acquisitions are extracted into structured records: company, round, amount, date. Those records power the company directory and the emerging-tech radar.",
  },
];

const HowWeCurate = () => (
  <PageShell>
    <SEO
      title="Methodology — ScopeDrop"
      description="How ScopeDrop collects, filters, sections and writes its startup, tech and AI coverage."
      keywords={["methodology", "editorial standards", "ScopeDrop"]}
    />
    <PageHead
      kicker="METHODOLOGY"
      title="How we curate"
      dek="What the ScopeDrop desk covers, how a story gets from a signal to the site, and how each one is sorted."
    />

    <section className="flow-sec">
      <div className="wrap">
        <div className="sec-h">
          <h3>From signal to story</h3>
        </div>
        <ol className="mt-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section className="flow-sec">
      <div className="wrap">
        <div className="sec-h">
          <h3>The seven sections</h3>
          <Link className="more" to="/startups/news">
            All stories →
          </Link>
        </div>
        <div className="lr-terms">
          {SECTION_KEYS.map((key) => (
            <Link key={key} className="lr-term" to={`/startups/news?c=${key}`}>
              <strong>{SECTIONS[key].label}</strong>
              <span>{SECTIONS[key].definition}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  </PageShell>
);

export default HowWeCurate;

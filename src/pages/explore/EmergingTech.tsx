// ============================================================
// EmergingTech — /tech/emerging, the full emerging-tech radar the
// home panel links to ("Full radar →"), with the latest tech stories.
// ============================================================
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { PageHead, PageShell, StoryGrid } from "@/components/home/PageShell";
import { useRadar } from "@/hooks/home/useRadar";
import { useStories } from "@/hooks/home/useStories";

const EmergingTech = () => {
  const radar = useRadar(20);
  const stories = useStories("tech");
  const rows = stories.data?.pages[0]?.slice(0, 9);

  return (
    <PageShell>
      <SEO
        title="Emerging tech radar — ScopeDrop"
        description="Which sectors capital is moving into, quarter over quarter, computed from the funding rounds ScopeDrop tracks."
        keywords={["emerging tech", "funding momentum", "sector trends", "ScopeDrop"]}
      />
      <PageHead
        kicker="EMERGING TECH RADAR · THIS QUARTER"
        title="Where the capital is moving"
        dek="Sectors ranked by money raised in the last 90 days, with the change against the 90 days before. Built from the closed and agreed deals we track."
      />

      <section className="flow-sec">
        <div className="wrap">
          {radar.isLoading ? (
            <div className="sd-skel" style={{ height: 240 }} />
          ) : radar.error ? (
            <div className="sd-empty">
              <span className="k">Couldn't load the radar</span>
              <p>Refresh the page to try again.</p>
            </div>
          ) : (radar.data?.length ?? 0) === 0 ? (
            <div className="sd-empty">
              <span className="k">Not enough deals yet to call a trend</span>
              <p>The radar fills in as rounds land.</p>
            </div>
          ) : (
            <div className="rd-full">
              {radar.data!.map((s) => (
                <div key={s.name} className="radar-item">
                  <span className="nm">{s.name}</span>
                  <span className="bh">
                    <i style={{ width: `${s.barPct}%` }}></i>
                  </span>
                  <span className="v">{s.label}</span>
                </div>
              ))}
              <div className="radar-note">
                MONEY RAISED THIS QUARTER · CHANGE VS LAST QUARTER · NEW = FIRST DEALS
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="flow-sec">
        <div className="wrap">
          <div className="sec-h">
            <h3>Latest in tech</h3>
            <Link className="more" to="/startups/news?c=tech">
              All tech stories →
            </Link>
          </div>
          <StoryGrid
            rows={rows}
            isLoading={stories.isLoading}
            error={stories.error}
            emptyLabel="No tech stories yet"
          />
        </div>
      </section>
    </PageShell>
  );
};

export default EmergingTech;

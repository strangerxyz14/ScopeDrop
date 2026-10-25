import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { PageHead, PageShell, StoryGrid } from "@/components/home/PageShell";
import type { StoryArticle } from "@/components/home/StoryCards";
import { fetchSection } from "@/services/sectionFeed";
import { SECTION_KEYS } from "../../supabase/functions/_shared/sections";

const LIMIT = 24;

/** Founder-tagged stories from any section first, topped up with the latest startup stories. */
async function fetchFounderStories(): Promise<StoryArticle[]> {
  const [tagged, startups] = await Promise.all([
    fetchSection([...SECTION_KEYS], { withTag: "founder", limit: LIMIT }),
    fetchSection(["startups"], { limit: LIMIT }),
  ]);
  const seen = new Set<string>();
  return ([...tagged, ...startups] as unknown as StoryArticle[])
    .filter((a) => !seen.has(a.id) && seen.add(a.id))
    .slice(0, LIMIT);
}

const FounderStoriesPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["founder-stories"],
    queryFn: fetchFounderStories,
    staleTime: 60 * 1000,
  });

  return (
    <PageShell>
      <SEO
        title="Founder Stories — ScopeDrop"
        description="The people building the future: their decisions, mistakes and breakthroughs."
        keywords={["founder stories", "startup founders", "ScopeDrop"]}
      />
      <PageHead
        kicker="FOUNDERS"
        title="Founder Stories"
        dek="The people building the future: their decisions, mistakes and breakthroughs."
      />
      <section className="flow-sec">
        <div className="wrap">
          <StoryGrid rows={data} isLoading={isLoading} error={error} emptyLabel="No founder stories yet" />
          <div className="st-load">
            <Link to="/startups/news?c=startups">All startup stories →</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default FounderStoriesPage;

import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { MastheadStrip } from "@/components/home/MastheadStrip";
import { DailyFlagship } from "@/components/home/DailyFlagship";
import { WhatsBuildingToday } from "@/components/home/WhatsBuildingToday";
import { CapitalRail } from "@/components/home/CapitalRail";
import { LearnBand } from "@/components/home/LearnBand";
import { RadarAndCompanies } from "@/components/home/RadarAndCompanies";
import { EventsGrid } from "@/components/home/EventsGrid";
import { NewsletterBlock } from "@/components/home/NewsletterBlock";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import "@/components/home/theme.css";

const Home = () => {
  return (
    <div className="sdvg">
      <SEO
        title="ScopeDrop — The pulse of what's building"
        description="Startup, tech, and AI intelligence — structured, decoded, and delivered daily."
        keywords={["startup intelligence", "funding rounds", "venture capital", "acquisitions"]}
      />
      <SiteHeader />
      <main>
        <MastheadStrip />
        <DailyFlagship />
        <WhatsBuildingToday />
        <CapitalRail />
        <LearnBand />
        <RadarAndCompanies />
        <EventsGrid />
        <NewsletterBlock />
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
};

export default Home;

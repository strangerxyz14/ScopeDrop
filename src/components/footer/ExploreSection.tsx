
import React from "react";
import { Link } from "react-router-dom";
import FooterSection from "./FooterSection";
import FooterLink from "./FooterLink";

const ExploreSection = () => {
  return (
    <FooterSection title="Explore ScopeDrop">
      <ul className="space-y-4">
        <li>
          <FooterLink to="/startups/news">
            <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
            Startup News
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/funding/big-stories">
            <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
            Big Funding Stories
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/tech/emerging">
            <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
            Emerging Tech (AI, Web3 & More)
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/founder-spotlights">
            <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
            Founder Spotlights
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/case-studies">
            <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
            In-Depth Case Studies
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/growth-strategies">
            <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
            Growth Strategy Playbooks
          </FooterLink>
        </li>
      </ul>
    </FooterSection>
  );
};

export default ExploreSection;

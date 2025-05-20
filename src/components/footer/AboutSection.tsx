
import React from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import FooterSection from "./FooterSection";

const AboutSection = () => {
  return (
    <FooterSection title="About ScopeDrop" icon={<Info size={18} />}>
      <p className="text-opacity-80 text-white text-sm leading-relaxed mb-8">
        ScopeDrop provides comprehensive insights into the global startup ecosystem, 
        covering funding rounds, IPOs, acquisitions, and founder stories. 
        We're dedicated to bringing you high-quality startup intelligence and market analysis.
      </p>
      <div className="mt-6">
        <Link to="/" className="font-display text-3xl font-bold text-parrot hover:text-parrot-300 transition-colors">
          ScopeDrop
        </Link>
      </div>
    </FooterSection>
  );
};

export default AboutSection;

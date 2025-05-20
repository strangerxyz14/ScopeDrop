
import React from "react";
import BackToTop from "./footer/BackToTop";
import AboutSection from "./footer/AboutSection";
import ExploreSection from "./footer/ExploreSection";
import AccountSection from "./footer/AccountSection";
import ResourcesSection from "./footer/ResourcesSection";
import CopyrightSection from "./footer/CopyrightSection";
import { useScroll } from "@/hooks/useScroll";

const Footer = () => {
  const { showBackToTop } = useScroll(400);
  
  return (
    <footer className="bg-oxford text-white relative">
      {/* Back to top button */}
      <BackToTop visible={showBackToTop} />
      
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
          {/* About */}
          <AboutSection />
          
          {/* Explore ScopeDrop */}
          <ExploreSection />
          
          {/* Manage My Account */}
          <AccountSection />
          
          {/* Resources */}
          <ResourcesSection />
        </div>
        
        {/* Copyright */}
        <CopyrightSection />
      </div>
    </footer>
  );
};

export default Footer;


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
    <footer className="bg-oxford relative overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-oxford-500 opacity-10 z-0" 
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1531297484001-80022131f5a1')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'multiply',
          filter: 'blur(2px)'
        }}
      />
      
      {/* Content overlay */}
      <div className="absolute inset-0 bg-oxford-500/90 z-0"></div>
      
      {/* Back to top button */}
      <BackToTop visible={showBackToTop} />
      
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
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


import React from "react";
import { Link } from "react-router-dom";

const CopyrightSection = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="border-t border-oxford-400/50 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
      <p className="text-[14px] text-white/80">&copy; {currentYear} ScopeDrop. All rights reserved.</p>
      <div className="flex space-x-6 mt-4 md:mt-0">
        <Link to="/privacy-policy" className="text-[14px] text-white/80 hover:text-white hover:underline underline-offset-4 transition-colors">
          Privacy Policy
        </Link>
        <Link to="/terms" className="text-[14px] text-white/80 hover:text-white hover:underline underline-offset-4 transition-colors">
          Terms of Service
        </Link>
        <Link to="/sitemap" className="text-[14px] text-white/80 hover:text-white hover:underline underline-offset-4 transition-colors">
          Sitemap
        </Link>
      </div>
    </div>
  );
};

export default CopyrightSection;

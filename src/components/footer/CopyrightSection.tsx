
import React from "react";
import { Link } from "react-router-dom";

const CopyrightSection = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="border-t border-oxford-400 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-opacity-80 text-white">
      <p>&copy; {currentYear} ScopeDrop. All rights reserved.</p>
      <div className="flex space-x-6 mt-4 md:mt-0">
        <Link to="/privacy-policy" className="hover:text-parrot transition-colors">
          Privacy Policy
        </Link>
        <Link to="/terms" className="hover:text-parrot transition-colors">
          Terms of Service
        </Link>
        <Link to="/sitemap" className="hover:text-parrot transition-colors">
          Sitemap
        </Link>
      </div>
    </div>
  );
};

export default CopyrightSection;


import { Link } from "react-router-dom";
import { ArrowUp, Facebook, Twitter, Linkedin, Mail, Info, Globe, Phone, User, Settings, BookOpen, FileText, MessageSquare, Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Show back to top button when scrolled down
  const handleScroll = () => {
    if (window.scrollY > 400) {
      setShowBackToTop(true);
    } else {
      setShowBackToTop(false);
    }
  };
  
  // Add scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  
  return (
    <footer className="bg-oxford text-white relative">
      {/* Back to top button */}
      {showBackToTop && (
        <div className="fixed bottom-8 right-8 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={scrollToTop}
                  className="bg-parrot text-oxford rounded-full p-3 shadow-lg hover:bg-parrot-400 transition-all duration-300 animate-fade-in"
                >
                  <ArrowUp size={24} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Back to top</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {/* Main footer content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
          {/* About */}
          <div>
            <h3 className="text-xl font-display font-bold mb-6 tracking-wide text-white flex items-center">
              <Info size={18} className="mr-2 text-parrot" />
              ABOUT SCOPEDROP
            </h3>
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
          </div>
          
          {/* Explore ScopeDrop */}
          <div>
            <h3 className="text-xl font-display font-bold mb-6 tracking-wide text-white uppercase">Explore ScopeDrop</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/startups/news" className="footer-link flex items-center group text-opacity-80 text-white text-sm">
                  <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Startup News</span>
                </Link>
              </li>
              <li>
                <Link to="/funding/big-stories" className="footer-link flex items-center group text-opacity-80 text-white text-sm">
                  <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Big Funding Stories</span>
                </Link>
              </li>
              <li>
                <Link to="/tech/emerging" className="footer-link flex items-center group text-opacity-80 text-white text-sm">
                  <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Emerging Tech (AI, Web3 & More)</span>
                </Link>
              </li>
              <li>
                <Link to="/founder-spotlights" className="footer-link flex items-center group text-opacity-80 text-white text-sm">
                  <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Founder Spotlights</span>
                </Link>
              </li>
              <li>
                <Link to="/case-studies" className="footer-link flex items-center group text-opacity-80 text-white text-sm">
                  <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">In-Depth Case Studies</span>
                </Link>
              </li>
              <li>
                <Link to="/growth-strategies" className="footer-link flex items-center group text-opacity-80 text-white text-sm">
                  <span className="w-0 group-hover:w-2 h-2 bg-parrot rounded-full mr-0 group-hover:mr-2 transition-all duration-300 opacity-0 group-hover:opacity-100"></span>
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Growth Strategy Playbooks</span>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Manage My Account */}
          <div>
            <h3 className="text-xl font-display font-bold mb-6 tracking-wide text-white uppercase">Manage My Account</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/account/dashboard" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <User size={16} className="mr-2 text-parrot-300" />
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">My Dashboard</span>
                </Link>
              </li>
              <li>
                <Link to="/account/saves" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <BookOpen size={16} className="mr-2 text-parrot-300" />
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">My Saved Articles</span>
                </Link>
              </li>
              <li>
                <Link to="/account/emails" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <Mail size={16} className="mr-2 text-parrot-300" />
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Email Preferences</span>
                </Link>
              </li>
              <li>
                <Link to="/account/recent" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <FileText size={16} className="mr-2 text-parrot-300" />
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Recently Viewed</span>
                </Link>
              </li>
              <li>
                <Link to="/account/settings" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <Settings size={16} className="mr-2 text-parrot-300" />
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Account Settings</span>
                </Link>
              </li>
              <li>
                <Link to="/signout" className="footer-link flex items-center text-opacity-80 text-white text-sm group hover:text-red-300">
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Sign Out</span>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="text-xl font-display font-bold mb-6 tracking-wide text-white uppercase">Resources</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/blog" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">ScopeDrop Blog</span>
                </Link>
              </li>
              <li>
                <Link to="/how-we-curate" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">How We Curate Content</span>
                </Link>
              </li>
              <li>
                <Link to="/api-access" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">API Access</span>
                </Link>
              </li>
              <li>
                <Link to="/startup-submission" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Startup Submission</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className="footer-link flex items-center text-opacity-80 text-white text-sm group">
                  <MessageSquare size={16} className="mr-2 text-parrot-300" />
                  <span className="hover:transform hover:-translate-y-0.5 transition-transform">Contact & Support</span>
                </Link>
              </li>
            </ul>
            
            {/* Social Media */}
            <div className="flex space-x-4 mt-8">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-parrot transition-colors bg-oxford-400 rounded-full p-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-parrot transition-colors bg-oxford-400 rounded-full p-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <Twitter size={20} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-parrot transition-colors bg-oxford-400 rounded-full p-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <Linkedin size={20} />
              </a>
              <a href="mailto:contact@scopedrop.com" className="hover:text-parrot transition-colors bg-oxford-400 rounded-full p-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <Send size={20} />
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
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
      </div>
    </footer>
  );
};

export default Footer;

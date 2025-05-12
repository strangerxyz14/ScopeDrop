
import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Mail, Info, Globe, Phone } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-oxford text-white mt-12">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-display font-bold mb-4 flex items-center">
              <Info size={18} className="mr-2" />
              About ScopeDrop
            </h3>
            <p className="text-blue-200 text-sm leading-relaxed">
              ScopeDrop provides comprehensive insights into the global startup ecosystem, 
              covering funding rounds, IPOs, acquisitions, and founder stories. 
              We're dedicated to bringing you high-quality startup intelligence and market analysis.
            </p>
            <div className="mt-4">
              <Link to="/" className="font-display text-2xl font-bold text-parrot">
                ScopeDrop
              </Link>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-display font-bold mb-4">Main Sections</h3>
            <ul className="space-y-2 text-blue-200">
              <li><Link to="/startups" className="footer-link">Startups</Link></li>
              <li><Link to="/tech" className="footer-link">AI & Tech</Link></li>
              <li><Link to="/funding" className="footer-link">Funding & Investors</Link></li>
              <li><Link to="/market-insights" className="footer-link">Market Insights</Link></li>
              <li><Link to="/events" className="footer-link">Events</Link></li>
              <li><Link to="/newsletter" className="footer-link">Newsletter</Link></li>
            </ul>
          </div>
          
          {/* Company */}
          <div>
            <h3 className="text-xl font-display font-bold mb-4">Company</h3>
            <ul className="space-y-2 text-blue-200">
              <li><Link to="/about" className="footer-link">About Us</Link></li>
              <li><Link to="/team" className="footer-link">Our Team</Link></li>
              <li><Link to="/careers" className="footer-link">Careers</Link></li>
              <li><Link to="/contact" className="footer-link">Contact Us</Link></li>
              <li><Link to="/privacy-policy" className="footer-link">Privacy Policy</Link></li>
              <li><Link to="/terms" className="footer-link">Terms of Service</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-xl font-display font-bold mb-4">Contact Us</h3>
            <div className="space-y-3 text-blue-200">
              <div className="flex items-start">
                <Mail className="mt-1 mr-2 flex-shrink-0" size={18} />
                <span>contact@ScopeDrop.com</span>
              </div>
              <div className="flex items-start">
                <Phone className="mt-1 mr-2 flex-shrink-0" size={18} />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-start">
                <Globe className="mt-1 mr-2 flex-shrink-0" size={18} />
                <span>www.ScopeDrop.com</span>
              </div>
              
              {/* Social Media */}
              <div className="flex space-x-4 mt-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-parrot transition-colors">
                  <Facebook size={20} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-parrot transition-colors">
                  <Twitter size={20} />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-parrot transition-colors">
                  <Linkedin size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Newsletter Signup */}
        <div className="mt-12 py-6 border-t border-oxford-400">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="text-xl font-display font-bold mb-2">Join Our Newsletter</h3>
            <p className="text-blue-200 mb-4">Stay updated with the latest in the startup ecosystem</p>
            <form className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-grow px-4 py-2 rounded-md bg-white text-gray-800 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="bg-parrot text-oxford px-6 py-2 rounded-md font-medium hover:bg-parrot-400 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-oxford-400 mt-8 pt-6 text-center text-sm text-blue-300">
          <p>&copy; {currentYear} ScopeDrop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

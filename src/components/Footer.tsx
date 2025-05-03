
import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Mail, Info } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-elevarcBlue text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Us */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Info size={18} className="mr-2" />
              About Us
            </h3>
            <p className="text-blue-200 text-sm leading-relaxed">
              ElevArc provides curated insights into the startup ecosystem, 
              covering funding rounds, IPOs, acquisitions, and founder stories. 
              We're dedicated to bringing you the most relevant startup news and analysis.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Site Links</h3>
            <ul className="space-y-2 text-blue-200">
              <li><Link to="/" className="hover:text-elevarcGreen transition-colors">Home</Link></li>
              <li><Link to="/startup-news" className="hover:text-elevarcGreen transition-colors">Startup News</Link></li>
              <li><Link to="/tech-stacks" className="hover:text-elevarcGreen transition-colors">Tech Stacks</Link></li>
              <li><Link to="/growth-hacking" className="hover:text-elevarcGreen transition-colors">Growth Hacking</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-elevarcGreen transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Mail size={18} className="mr-2" />
              Contact Us
            </h3>
            <p className="text-blue-200 text-sm mb-4">
              Have questions or feedback? Reach out to us at info@elevarc.com
            </p>
            
            {/* Social Media */}
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-elevarcGreen transition-colors">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-elevarcGreen transition-colors">
                <Twitter size={20} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-elevarcGreen transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-blue-800 mt-8 pt-4 text-center text-sm text-blue-300">
          <p>&copy; {currentYear} ElevArc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

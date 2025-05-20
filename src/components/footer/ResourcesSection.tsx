
import React from "react";
import { MessageSquare, Facebook, Twitter, Linkedin, Send } from "lucide-react";
import FooterSection from "./FooterSection";
import FooterLink from "./FooterLink";

const ResourcesSection = () => {
  return (
    <FooterSection title="Resources">
      <ul className="space-y-4">
        <li>
          <FooterLink to="/blog">
            ScopeDrop Blog
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/how-we-curate">
            How We Curate Content
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/api-access">
            API Access
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/startup-submission">
            Startup Submission
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/contact" icon={<MessageSquare size={16} />}>
            Contact & Support
          </FooterLink>
        </li>
      </ul>
      
      {/* Social Media */}
      <div className="flex space-x-4 mt-8">
        <FooterLink 
          to="https://facebook.com" 
          external={true}
          className="hover:text-parrot transition-colors bg-oxford-400 rounded-full p-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
        >
          <Facebook size={20} />
        </FooterLink>
        <FooterLink 
          to="https://twitter.com" 
          external={true}
          className="hover:text-parrot transition-colors bg-oxford-400 rounded-full p-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
        >
          <Twitter size={20} />
        </FooterLink>
        <FooterLink 
          to="https://linkedin.com" 
          external={true}
          className="hover:text-parrot transition-colors bg-oxford-400 rounded-full p-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
        >
          <Linkedin size={20} />
        </FooterLink>
        <FooterLink 
          to="mailto:contact@scopedrop.com" 
          external={true}
          className="hover:text-parrot transition-colors bg-oxford-400 rounded-full p-2 transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
        >
          <Send size={20} />
        </FooterLink>
      </div>
    </FooterSection>
  );
};

export default ResourcesSection;

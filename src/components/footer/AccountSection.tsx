
import React from "react";
import { User, BookOpen, Mail, FileText, Settings } from "lucide-react";
import FooterSection from "./FooterSection";
import FooterLink from "./FooterLink";

const AccountSection = () => {
  return (
    <FooterSection title="Manage My Account">
      <ul className="space-y-4">
        <li>
          <FooterLink to="/account/dashboard" icon={<User size={16} />}>
            My Dashboard
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/account/saves" icon={<BookOpen size={16} />}>
            My Saved Articles
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/account/emails" icon={<Mail size={16} />}>
            Email Preferences
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/account/recent" icon={<FileText size={16} />}>
            Recently Viewed
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/account/settings" icon={<Settings size={16} />}>
            Account Settings
          </FooterLink>
        </li>
        <li>
          <FooterLink to="/signout" className="hover:text-red-300">
            Sign Out
          </FooterLink>
        </li>
      </ul>
    </FooterSection>
  );
};

export default AccountSection;

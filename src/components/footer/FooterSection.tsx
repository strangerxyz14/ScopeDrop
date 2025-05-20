
import React from "react";
import { Link } from "react-router-dom";

interface FooterSectionProps {
  title: string;
  icon?: React.ReactNode;
}

const FooterSection: React.FC<React.PropsWithChildren<FooterSectionProps>> = ({
  title,
  icon,
  children,
}) => {
  return (
    <div className="footer-section">
      <h3 className="text-xl font-display font-bold mb-6 tracking-wider text-white uppercase flex items-center border-b border-oxford-400 pb-3">
        {icon && <span className="mr-2 text-parrot">{icon}</span>}
        {title}
      </h3>
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
};

export default FooterSection;

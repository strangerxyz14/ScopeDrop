
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
    <div>
      <h3 className="text-xl font-display font-bold mb-6 tracking-wide text-white uppercase flex items-center">
        {icon && <span className="mr-2 text-parrot">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
};

export default FooterSection;

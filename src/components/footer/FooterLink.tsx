
import React from "react";
import { Link } from "react-router-dom";

interface FooterLinkProps {
  to: string;
  icon?: React.ReactNode;
  external?: boolean;
  className?: string;
}

const FooterLink: React.FC<React.PropsWithChildren<FooterLinkProps>> = ({
  to,
  icon,
  external = false,
  children,
  className,
}) => {
  const linkClasses = `footer-link flex items-center group text-[14px] text-white/80 hover:text-white ${className || ""}`;
  
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {icon && <span className="mr-2 text-parrot-300">{icon}</span>}
        <span className="hover:transform transition-all duration-300 flex items-center">
          {children}
        </span>
      </a>
    );
  }

  return (
    <Link to={to} className={linkClasses}>
      {icon && <span className="mr-2 text-parrot-300">{icon}</span>}
      <span className="hover:transform transition-all duration-300 flex items-center">
        {children}
      </span>
    </Link>
  );
};

export default FooterLink;


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
  const linkClasses = `footer-link flex items-center group text-opacity-80 text-white text-sm ${className || ""}`;
  
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {icon && <span className="mr-2 text-parrot-300">{icon}</span>}
        <span className="hover:transform hover:-translate-y-0.5 transition-transform">
          {children}
        </span>
      </a>
    );
  }

  return (
    <Link to={to} className={linkClasses}>
      {icon && <span className="mr-2 text-parrot-300">{icon}</span>}
      <span className="hover:transform hover:-translate-y-0.5 transition-transform">
        {children}
      </span>
    </Link>
  );
};

export default FooterLink;

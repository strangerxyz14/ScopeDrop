
import React from "react";
import { Link } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FooterSectionProps {
  title: string;
  icon?: React.ReactNode;
}

const FooterSection: React.FC<React.PropsWithChildren<FooterSectionProps>> = ({
  title,
  icon,
  children,
}) => {
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = React.useState(true);
  
  if (isMobile) {
    return (
      <Collapsible 
        open={isOpen} 
        onOpenChange={setIsOpen}
        className="footer-section"
      >
        <CollapsibleTrigger className="w-full text-left">
          <h3 className="text-[18px] font-display font-bold mb-2 tracking-wider text-white uppercase flex items-center justify-between border-b border-oxford-400/50 pb-3">
            <span className="flex items-center">
              {icon && <span className="mr-2 text-parrot">{icon}</span>}
              {title}
            </span>
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </h3>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  
  return (
    <div className="footer-section">
      <h3 className="text-[18px] font-display font-bold mb-3 tracking-wider text-white uppercase flex items-center border-b border-oxford-400/50 pb-3">
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

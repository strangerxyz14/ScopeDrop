
import React from "react";
import { ArrowUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BackToTopProps {
  visible: boolean;
}

const BackToTop: React.FC<BackToTopProps> = ({ visible }) => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={scrollToTop}
              className="bg-parrot text-oxford rounded-full p-3 shadow-lg hover:bg-parrot-400 hover:-translate-y-1 transition-all duration-300 animate-fade-in"
              aria-label="Back to top"
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
  );
};

export default BackToTop;

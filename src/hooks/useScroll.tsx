
import { useState, useEffect } from "react";

export const useScroll = (threshold: number = 400) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Handle scroll event
  const handleScroll = () => {
    const position = window.scrollY;
    setScrollPosition(position);
    setShowBackToTop(position > threshold);
  };
  
  // Add scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);
  
  return { scrollPosition, showBackToTop };
};

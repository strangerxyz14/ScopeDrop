import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ArrowUp, Menu, Search, Filter, Share, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

// Hook for detecting mobile device
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
};

// Hook for touch gestures
export const useSwipeGesture = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = 50
) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

// Mobile-optimized scroll to top button
export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-full shadow-lg",
        "h-12 w-12 md:h-10 md:w-10", // Larger on mobile
        "transition-all duration-300 ease-in-out",
        "hover:scale-110 active:scale-95"
      )}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};

// Mobile-optimized floating action button
interface FloatingActionButtonProps {
  actions: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    color?: string;
  }>;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("fixed bottom-4 left-4 z-50", className)}>
      <div className="relative">
        {/* Action buttons */}
        {isOpen && (
          <div className="absolute bottom-16 left-0 space-y-2 animate-in slide-in-from-bottom-2 fade-in-0">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                size="icon"
                variant="secondary"
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg",
                  "transition-all duration-200",
                  "hover:scale-110 active:scale-95",
                  action.color
                )}
                aria-label={action.label}
              >
                <action.icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "transition-all duration-300",
            "hover:scale-110 active:scale-95",
            isOpen && "rotate-45"
          )}
          aria-label="Open actions menu"
          aria-expanded={isOpen}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

// Mobile-optimized card with touch feedback
interface TouchCardProps {
  children: React.ReactNode;
  onTap?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export const TouchCard: React.FC<TouchCardProps> = ({
  children,
  onTap,
  onSwipeLeft,
  onSwipeRight,
  className
}) => {
  const swipeHandlers = useSwipeGesture(onSwipeLeft, onSwipeRight);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Card
      className={cn(
        "transition-all duration-200 cursor-pointer",
        "hover:shadow-md active:scale-[0.98]",
        isPressed && "scale-[0.98] shadow-sm",
        className
      )}
      onClick={onTap}
      onTouchStart={(e) => {
        setIsPressed(true);
        swipeHandlers.onTouchStart(e);
      }}
      onTouchMove={swipeHandlers.onTouchMove}
      onTouchEnd={(e) => {
        setIsPressed(false);
        swipeHandlers.onTouchEnd();
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
};

// Mobile-optimized bottom sheet for filters/actions
interface MobileBottomSheetProps {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  trigger,
  title,
  children,
  className
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className={cn(
          "h-[80vh] rounded-t-lg",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
          className
        )}
      >
        <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-4" />
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Mobile-optimized sticky toolbar
interface MobileStickyToolbarProps {
  actions: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    active?: boolean;
  }>;
  className?: string;
}

export const MobileStickyToolbar: React.FC<MobileStickyToolbarProps> = ({
  actions,
  className
}) => {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40",
      "bg-background/95 backdrop-blur-sm border-t",
      "px-4 py-2 safe-area-pb",
      className
    )}>
      <div className="flex items-center justify-around max-w-md mx-auto">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.active ? "default" : "ghost"}
            size="sm"
            onClick={action.onClick}
            className={cn(
              "flex-col h-12 px-2 py-1",
              "min-w-0 flex-1 mx-1",
              "transition-all duration-200"
            )}
            aria-label={action.label}
          >
            <action.icon className="h-4 w-4 mb-1" />
            <span className="text-xs truncate">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

// Pull-to-refresh component
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && touchStart > 0) {
      const currentTouch = e.touches[0].clientY;
      const distance = Math.max(0, currentTouch - touchStart);
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setTouchStart(0);
  };

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-muted/50"
          style={{ transform: `translateY(${pullDistance - 60}px)` }}
        >
          <div className={cn(
            "transition-all duration-200",
            isRefreshing && "animate-spin"
          )}>
            {isRefreshing ? "🔄" : pullDistance > 60 ? "↻" : "↓"}
          </div>
        </div>
      )}
      
      <div style={{ transform: `translateY(${Math.max(0, pullDistance - 60)}px)` }}>
        {children}
      </div>
    </div>
  );
};

// Mobile viewport height fix for iOS
export const useMobileViewportFix = () => {
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);
};

export default {
  useIsMobile,
  useSwipeGesture,
  ScrollToTop,
  FloatingActionButton,
  TouchCard,
  MobileBottomSheet,
  MobileStickyToolbar,
  PullToRefresh,
  useMobileViewportFix,
};
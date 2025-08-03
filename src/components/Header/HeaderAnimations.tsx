import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animation variants for header components
export const headerAnimations = {
  // Logo animation
  logo: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    hover: { scale: 1.05, transition: { duration: 0.2 } }
  },

  // Navigation item animations
  navItem: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    hover: { 
      y: -2, 
      transition: { duration: 0.2, ease: "easeOut" }
    },
    tap: { scale: 0.95 }
  },

  // Search bar animations
  searchBar: {
    initial: { width: '16rem' },
    expanded: { width: '24rem' },
    transition: { duration: 0.3, ease: "easeInOut" }
  },

  // Dropdown animations
  dropdown: {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
    transition: { duration: 0.2, ease: "easeOut" }
  },

  // Badge animations
  badge: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    pulse: {
      scale: [1, 1.1, 1],
      transition: { duration: 2, repeat: Infinity }
    }
  },

  // Mobile menu animations
  mobileMenu: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { duration: 0.3, ease: "easeInOut" }
  },

  // Backdrop animations
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  }
};

// Animated Logo Component
export const AnimatedLogo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    variants={headerAnimations.logo}
    initial="initial"
    animate="animate"
    whileHover="hover"
    className="flex-shrink-0"
  >
    {children}
  </motion.div>
);

// Animated Navigation Item
export const AnimatedNavItem: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className, onClick }) => (
  <motion.div
    variants={headerAnimations.navItem}
    initial="initial"
    animate="animate"
    whileHover="hover"
    whileTap="tap"
    className={className}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

// Animated Search Bar
export const AnimatedSearchBar: React.FC<{ 
  children: React.ReactNode;
  isExpanded: boolean;
}> = ({ children, isExpanded }) => (
  <motion.div
    variants={headerAnimations.searchBar}
    initial="initial"
    animate={isExpanded ? "expanded" : "initial"}
    transition={headerAnimations.searchBar.transition}
  >
    {children}
  </motion.div>
);

// Animated Dropdown
export const AnimatedDropdown: React.FC<{ 
  children: React.ReactNode;
  isOpen: boolean;
}> = ({ children, isOpen }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        variants={headerAnimations.dropdown}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={headerAnimations.dropdown.transition}
        className="absolute top-full left-0 right-0 mt-2"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

// Animated Badge
export const AnimatedBadge: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  isPulsing?: boolean;
}> = ({ children, className, isPulsing = false }) => (
  <motion.div
    variants={headerAnimations.badge}
    initial="initial"
    animate={isPulsing ? "pulse" : "animate"}
    className={className}
  >
    {children}
  </motion.div>
);

// Animated Mobile Menu
export const AnimatedMobileMenu: React.FC<{ 
  children: React.ReactNode;
  isOpen: boolean;
}> = ({ children, isOpen }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          variants={headerAnimations.backdrop}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={headerAnimations.backdrop.transition}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
        <motion.div
          variants={headerAnimations.mobileMenu}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={headerAnimations.mobileMenu.transition}
          className="fixed top-0 right-0 w-80 h-full bg-oxford-900 border-l border-oxford-600 shadow-xl z-50"
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// Loading Spinner Component
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-parrot/60 border-t-transparent rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
};

// Fade In Animation
export const FadeIn: React.FC<{ 
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}> = ({ children, delay = 0, duration = 0.5 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration, delay }}
  >
    {children}
  </motion.div>
);

// Slide In Animation
export const SlideIn: React.FC<{ 
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
}> = ({ children, direction = 'left', delay = 0 }) => {
  const variants = {
    left: { x: -50, opacity: 0 },
    right: { x: 50, opacity: 0 },
    up: { y: -50, opacity: 0 },
    down: { y: 50, opacity: 0 }
  };

  return (
    <motion.div
      initial={variants[direction]}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
};
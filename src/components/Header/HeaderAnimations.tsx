import React from 'react';
import { motion, AnimatePresence, type Easing } from 'framer-motion';

// Animation variants for header components
export const headerAnimations = {
  logo: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    hover: { scale: 1.05, transition: { duration: 0.2 } }
  },
  navItem: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    hover: { 
      y: -2, 
      transition: { duration: 0.2, ease: "easeOut" as Easing }
    },
    tap: { scale: 0.95 }
  },
  searchBar: {
    initial: { width: '16rem' },
    expanded: { width: '24rem' },
    transition: { duration: 0.3, ease: "easeInOut" as Easing }
  },
  dropdown: {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
    transition: { duration: 0.2, ease: "easeOut" as Easing }
  },
  badge: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    pulse: {
      scale: [1, 1.1, 1],
      transition: { duration: 2, repeat: Infinity }
    }
  },
  mobileMenu: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { duration: 0.3, ease: "easeInOut" as Easing }
  },
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  }
};

export const AnimatedLogo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    whileHover={{ scale: 1.05 }}
    className="flex-shrink-0"
  >
    {children}
  </motion.div>
);

export const AnimatedNavItem: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.95 }}
    className={className}
    onClick={onClick}
  >
    {children}
  </motion.div>
);

export const AnimatedSearchBar: React.FC<{ 
  children: React.ReactNode;
  isExpanded: boolean;
}> = ({ children, isExpanded }) => (
  <motion.div
    initial={{ width: '16rem' }}
    animate={{ width: isExpanded ? '24rem' : '16rem' }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

export const AnimatedDropdown: React.FC<{ 
  children: React.ReactNode;
  isOpen: boolean;
}> = ({ children, isOpen }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute top-full left-0 right-0 mt-2"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

export const AnimatedBadge: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  isPulsing?: boolean;
}> = ({ children, className, isPulsing = false }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={isPulsing ? { scale: [1, 1.1, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
    transition={isPulsing ? { duration: 2, repeat: Infinity } : undefined}
    className={className}
  >
    {children}
  </motion.div>
);

export const AnimatedMobileMenu: React.FC<{ 
  children: React.ReactNode;
  isOpen: boolean;
}> = ({ children, isOpen }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed top-0 right-0 w-80 h-full bg-background border-l border-border shadow-xl z-50"
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-accent/60 border-t-transparent rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
};

export const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; duration?: number }> = ({ children, delay = 0, duration = 0.5 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration, delay }}>
    {children}
  </motion.div>
);

export const SlideIn: React.FC<{ children: React.ReactNode; direction?: 'left' | 'right' | 'up' | 'down'; delay?: number }> = ({ children, direction = 'left', delay = 0 }) => {
  const variants = { left: { x: -50, opacity: 0 }, right: { x: 50, opacity: 0 }, up: { y: -50, opacity: 0 }, down: { y: 50, opacity: 0 } };
  return (
    <motion.div initial={variants[direction]} animate={{ x: 0, y: 0, opacity: 1 }} transition={{ duration: 0.5, delay }}>
      {children}
    </motion.div>
  );
};

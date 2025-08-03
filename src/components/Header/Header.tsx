import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Navigation } from './Navigation';
import { AISearchBar } from './AISearchBar';
import { UserMenu } from './UserMenu';
import { MobileMenu } from './MobileMenu';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`
        fixed top-0 left-0 right-0 z-50
        bg-oxford/95 backdrop-blur-md border-b border-oxford-400/20
        transition-all duration-300 ease-in-out
        ${isScrolled ? 'shadow-lg' : ''}
        ${className || ''}
      `}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-parrot hover:text-parrot-300 transition-colors">ScopeDrop</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <Navigation />
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            <AISearchBar />
            <UserMenu />
            
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-white hover:text-parrot transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </header>
  );
};
import React from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';
import { PRIMARY_NAV, SECONDARY_NAV, MOBILE_MENU } from './navigationData';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu Content */}
      <div className="absolute top-0 right-0 w-80 h-full bg-oxford-900 border-l border-oxford-600 shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-oxford-600">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto">
            {MOBILE_MENU.sections.map((section) => (
              <div key={section.title} className="border-b border-oxford-600">
                <div className="px-4 py-3">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
                
                <div className="px-4 pb-4 space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="
                        flex items-center px-3 py-2 rounded-lg text-white/90
                        hover:text-parrot hover:bg-parrot/10 transition-colors
                      "
                      onClick={onClose}
                    >
                      {item.icon && <item.icon className="w-4 h-4 mr-3" />}
                      <span className="text-sm">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto px-2 py-1 text-xs bg-parrot/20 text-parrot rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-oxford-600">
            <div className="text-xs text-white/40 text-center">
              ScopeDrop v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
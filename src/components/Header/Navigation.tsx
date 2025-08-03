import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { PRIMARY_NAV, SECONDARY_NAV } from './navigationData';

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="flex items-center space-x-1">
      {/* Primary Navigation */}
      {PRIMARY_NAV.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`
            relative px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200 ease-in-out
            ${location.pathname === item.path 
              ? 'bg-parrot/20 text-parrot' 
              : 'text-white/90 hover:text-parrot hover:bg-parrot/10'
            }
          `}
        >
          <div className="flex items-center space-x-2">
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
            {item.badge && (
              <Badge 
                variant="secondary" 
                className="ml-1 bg-parrot/20 text-parrot border-parrot/30 animate-pulse"
              >
                {item.badge}
              </Badge>
            )}
          </div>
        </Link>
      ))}

      {/* Secondary Navigation Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="
            px-4 py-2 rounded-lg text-sm font-medium text-white/90 
            hover:text-parrot hover:bg-parrot/10 transition-all duration-200
            flex items-center space-x-2
          ">
            <span>More</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-oxford-800 border-oxford-600 min-w-[200px]">
          {SECONDARY_NAV.map((item) => (
            <DropdownMenuItem key={item.path} asChild>
              <Link 
                to={item.path}
                className="flex items-center space-x-2 text-white hover:bg-parrot/10"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};
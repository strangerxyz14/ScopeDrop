import React, { useState } from 'react';
import { User, Moon, Sun, Settings, LogOut } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useDarkMode } from '@/hooks/useDarkMode';

export const UserMenu: React.FC = () => {
  const { isDarkMode, isLoading, toggleDarkMode } = useDarkMode();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    // Here you would implement authentication
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        disabled={isLoading}
        className="
          p-2 rounded-lg text-white/90 hover:text-parrot hover:bg-parrot/10
          transition-all duration-200 ease-in-out disabled:opacity-50
        "
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
        ) : isDarkMode ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </button>

      {/* User Menu */}
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="
              p-2 rounded-lg text-white/90 hover:text-parrot hover:bg-parrot/10
              transition-all duration-200 ease-in-out
            ">
              <User className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-oxford-800 border-oxford-600 min-w-[200px]">
            <DropdownMenuItem className="text-white hover:bg-parrot/10">
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-parrot/10">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-oxford-600" />
            <DropdownMenuItem 
              className="text-white hover:bg-parrot/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          onClick={handleLogin}
          className="
            px-4 py-2 rounded-lg text-sm font-medium
            bg-parrot/20 text-parrot hover:bg-parrot/30
            transition-all duration-200 ease-in-out
          "
        >
          Sign In
        </button>
      )}
    </div>
  );
};
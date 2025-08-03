import React, { useState } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export const UserMenu: React.FC = () => {
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
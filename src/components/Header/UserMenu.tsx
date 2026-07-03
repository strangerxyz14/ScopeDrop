import React, { useState } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserMenu: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-lg text-white/90 hover:text-parrot hover:bg-parrot/10 transition-all duration-200 ease-in-out">
                <User className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-oxford-800 border-oxford-600 min-w-[200px]">
              <DropdownMenuItem
                className="text-white hover:bg-parrot/10 cursor-pointer"
                onClick={() => navigate('/account/dashboard')}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white hover:bg-parrot/10 cursor-pointer"
                onClick={() => navigate('/account/settings')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-oxford-600" />
              <DropdownMenuItem
                className="text-white hover:bg-parrot/10 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-parrot text-oxford hover:bg-parrot/90 transition-all duration-200 ease-in-out font-semibold"
          >
            Sign In
          </button>
        )}
      </div>

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Sign In</DialogTitle>
          </DialogHeader>
          <LoginForm onSuccess={() => setShowAuthModal(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bookmark,
  Mail,
  Clock,
  Settings,
  User,
  TrendingUp,
  Bell,
  Shield,
  CreditCard,
  LogOut,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AccountLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

const AccountLayout: React.FC<AccountLayoutProps> = ({ children, title, description }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    {
      title: "Overview",
      items: [
        {
          label: "Dashboard",
          href: "/account/dashboard",
          icon: LayoutDashboard,
          description: "Your personalized overview"
        },
        {
          label: "Activity",
          href: "/account/activity",
          icon: TrendingUp,
          description: "Track your reading activity"
        }
      ]
    },
    {
      title: "Content",
      items: [
        {
          label: "Saved Articles",
          href: "/account/saves",
          icon: Bookmark,
          description: "Your reading collection"
        },
        {
          label: "Recently Viewed",
          href: "/account/recent",
          icon: Clock,
          description: "Your browsing history"
        }
      ]
    },
    {
      title: "Preferences",
      items: [
        {
          label: "Email Preferences",
          href: "/account/emails",
          icon: Mail,
          description: "Newsletter & notifications"
        },
        {
          label: "Notifications",
          href: "/account/notifications",
          icon: Bell,
          description: "Alert preferences"
        }
      ]
    },
    {
      title: "Account",
      items: [
        {
          label: "Profile Settings",
          href: "/account/settings",
          icon: Settings,
          description: "Manage your profile"
        },
        {
          label: "Privacy & Security",
          href: "/account/privacy",
          icon: Shield,
          description: "Security settings"
        },
        {
          label: "Billing",
          href: "/account/billing",
          icon: CreditCard,
          description: "Subscription & payments"
        }
      ]
    }
  ];

  const isActive = (href: string) => location.pathname === href;

  const SidebarContent = () => (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-blue-600 text-white">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {user?.user_metadata?.full_name || "User"}
            </p>
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-gray-600">Member since</span>
          <span className="font-medium">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
          </span>
        </div>
      </Card>

      {/* Navigation */}
      <nav className="space-y-6">
        {navigationItems.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200",
                      active
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active && "text-blue-600")} />
                    <div className="flex-1">
                      <p className="text-sm">{item.label}</p>
                      {active && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    {active && <ChevronRight className="w-4 h-4 text-blue-600" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out Button */}
      <div className="pt-4 border-t">
        <Link to="/signout">
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-8">
                <SidebarContent />
              </div>
            </aside>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="outline"
                  size="icon"
                  className="fixed bottom-4 right-4 z-40 shadow-lg bg-white"
                >
                  {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="p-6 overflow-y-auto h-full">
                  <h2 className="text-lg font-semibold mb-4">Account Menu</h2>
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {(title || description) && (
                <div className="mb-6">
                  {title && <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>}
                  {description && <p className="text-gray-600">{description}</p>}
                </div>
              )}
              {children}
            </main>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AccountLayout;
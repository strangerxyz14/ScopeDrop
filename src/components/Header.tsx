
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Menu, TrendingUp, BarChart2, Rocket } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Startup News", icon: TrendingUp, path: "/startup-news" },
    { name: "Tech Stacks", icon: BarChart2, path: "/tech-stacks" },
    { name: "Growth Hacking", icon: Rocket, path: "/growth-hacking" },
  ];

  return (
    <header className="bg-elevarcBlue text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-elevarcGreen flex items-center justify-center text-elevarcBlue font-bold">
              E
            </div>
            <span className="text-xl font-display font-bold hidden sm:block">ElevArc</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center space-x-1 opacity-90 hover:opacity-100 transition-opacity font-medium"
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white"
            >
              <Menu />
            </Button>
          </div>

          {/* Additional Actions */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Founders' Stories</DropdownMenuItem>
                <DropdownMenuItem>Market Maps</DropdownMenuItem>
                <DropdownMenuItem>Investor Spotlights</DropdownMenuItem>
                <DropdownMenuItem>Events Calendar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="mt-4 space-y-2 pb-3 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center space-x-2 py-2 hover:bg-blue-800 px-3 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </Link>
            ))}
            <div className="border-t border-blue-800 my-2 pt-2">
              <div className="text-xs text-blue-300 uppercase font-medium px-3 mb-1">More Sections</div>
              <Link to="/founders-stories" className="block py-2 hover:bg-blue-800 px-3 rounded-md">Founders' Stories</Link>
              <Link to="/market-maps" className="block py-2 hover:bg-blue-800 px-3 rounded-md">Market Maps</Link>
              <Link to="/investor-spotlights" className="block py-2 hover:bg-blue-800 px-3 rounded-md">Investor Spotlights</Link>
              <Link to="/events-calendar" className="block py-2 hover:bg-blue-800 px-3 rounded-md">Events Calendar</Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;

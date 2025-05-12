
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Menu, 
  X, 
  ChevronDown, 
  Rocket, 
  Cpu, 
  TrendingUp, 
  BarChart, 
  Calendar, 
  Mail,
  Building,
  Brain,
  DollarSign,
  LineChart,
  Globe
} from "lucide-react";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const mainMenuItems = [
    { 
      name: "Startups", 
      icon: Rocket, 
      path: "/startups",
      submenu: [
        { name: "Latest News", path: "/startups/news" },
        { name: "Upcoming Startups", path: "/startups/upcoming" },
        { name: "Founders' Journeys", path: "/startups/founders" },
        { name: "Exit Stories", path: "/startups/exits" },
        { name: "Failures", path: "/startups/failures" },
      ] 
    },
    { 
      name: "AI & Tech", 
      icon: Brain, 
      path: "/tech",
      submenu: [
        { name: "AI News", path: "/tech/ai-news" },
        { name: "AI Tools Directory", path: "/tech/ai-tools" },
        { name: "Tech Stack Breakdowns", path: "/tech/tech-stacks" },
        { name: "Growth Hacking", path: "/tech/growth-hacking" },
      ] 
    },
    { 
      name: "Funding & Investors", 
      icon: DollarSign, 
      path: "/funding",
      submenu: [
        { name: "Funding & IPOs", path: "/funding/rounds" },
        { name: "Investor Spotlights", path: "/funding/investors" },
        { name: "Mergers & Acquisitions", path: "/funding/acquisitions" },
        { name: "Corporate vs Startup", path: "/funding/corporate-startup" },
      ] 
    },
    { 
      name: "Market Insights", 
      icon: LineChart, 
      path: "/market-insights",
      submenu: [
        { name: "Market Maps", path: "/market-insights/maps" },
        { name: "Country Reports", path: "/market-insights/countries" },
        { name: "Global Rankings", path: "/market-insights/rankings" },
        { name: "Policy Changes", path: "/market-insights/policy" },
      ] 
    },
    { 
      name: "Events", 
      icon: Calendar, 
      path: "/events",
      submenu: [
        { name: "Demo Days", path: "/events/demo-days" },
        { name: "Tech Conferences", path: "/events/conferences" },
        { name: "Pitch Competitions", path: "/events/pitch-competitions" },
      ] 
    },
    { 
      name: "Newsletter", 
      icon: Mail, 
      path: "/newsletter" 
    }
  ];

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="bg-oxford text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto">
        <div className="flex items-center justify-between py-4 px-4 md:px-6">
          {/* Logo */}
          <Link to="/" className="font-display text-2xl font-bold text-parrot tracking-tight">
            ScopeDrop
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            {mainMenuItems.map((item) => (
              item.submenu ? (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger asChild>
                    <button className="header-nav-link">
                      <item.icon size={18} />
                      <span>{item.name}</span>
                      <ChevronDown size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white min-w-[200px]">
                    {item.submenu.map((subItem) => (
                      <DropdownMenuItem key={subItem.name} asChild>
                        <Link 
                          to={subItem.path}
                          className="block w-full px-4 py-2 hover:bg-oxford-50"
                        >
                          {subItem.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={item.name}
                  to={item.path}
                  className="header-nav-link"
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </Link>
              )
            ))}
            <Link to="/search" className="ml-2 p-2 hover:text-parrot transition-colors">
              <Search size={20} />
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <Link to="/search" className="mr-2 p-2 hover:text-parrot transition-colors">
              <Search size={20} />
            </Link>
            <button
              onClick={toggleMenu}
              className="p-2 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden bg-oxford border-t border-oxford-400 animate-slide-in-right">
            <nav className="py-4 px-6 space-y-4">
              {mainMenuItems.map((item) => (
                <div key={item.name} className="py-1">
                  {item.submenu ? (
                    <details className="group text-white">
                      <summary className="flex items-center cursor-pointer">
                        <item.icon size={18} className="mr-2" />
                        <span>{item.name}</span>
                        <ChevronDown size={16} className="ml-auto transform group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-2 ml-6 space-y-2">
                        {item.submenu.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.path}
                            className="block py-2 hover:text-parrot transition-colors"
                            onClick={closeMenu}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <Link
                      to={item.path}
                      className="flex items-center py-2 hover:text-parrot transition-colors"
                      onClick={closeMenu}
                    >
                      <item.icon size={18} className="mr-2" />
                      <span>{item.name}</span>
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

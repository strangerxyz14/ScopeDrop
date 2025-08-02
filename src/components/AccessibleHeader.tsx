import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
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
  Globe,
  Sun,
  Moon,
  User,
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
  submenu?: { name: string; path: string; description?: string }[];
}

const AccessibleHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [focusedSubmenu, setFocusedSubmenu] = useState<string | null>(null);
  const location = useLocation();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  
  const mainMenuItems: MenuItem[] = [
    { 
      name: "Startups", 
      icon: Rocket, 
      path: "/startups",
      submenu: [
        { name: "Latest News", path: "/startups/news", description: "Recent startup news and updates" },
        { name: "Upcoming Startups", path: "/startups/upcoming", description: "Emerging companies to watch" },
        { name: "Founders' Journeys", path: "/startups/founders", description: "Stories from startup founders" },
        { name: "Exit Stories", path: "/startups/exits", description: "Successful startup exits and acquisitions" },
        { name: "Failures", path: "/startups/failures", description: "Lessons from startup failures" },
      ] 
    },
    { 
      name: "Funding", 
      icon: DollarSign, 
      path: "/funding",
      submenu: [
        { name: "Funding Rounds", path: "/funding/rounds", description: "Latest investment rounds" },
        { name: "Big Stories", path: "/funding/big-stories", description: "Major funding announcements" },
        { name: "VC Insights", path: "/funding/vc-insights", description: "Venture capital trends and insights" },
        { name: "Angel Investors", path: "/funding/angels", description: "Angel investor profiles and deals" },
      ]
    },
    { 
      name: "Technology", 
      icon: Cpu, 
      path: "/tech",
      submenu: [
        { name: "Tech Stacks", path: "/tech/tech-stacks", description: "Popular technology stacks" },
        { name: "Emerging Tech", path: "/tech/emerging", description: "Latest technology trends" },
        { name: "Growth Hacking", path: "/tech/growth-hacking", description: "Growth strategies and tactics" },
        { name: "AI & ML", path: "/tech/ai-ml", description: "Artificial intelligence and machine learning" },
      ]
    },
    { 
      name: "Explore", 
      icon: Globe, 
      path: "/explore",
      submenu: [
        { name: "Founder Spotlights", path: "/founder-spotlights", description: "Featured startup founders" },
        { name: "Case Studies", path: "/case-studies", description: "In-depth business case studies" },
        { name: "Growth Strategies", path: "/growth-strategies", description: "Proven growth methodologies" },
        { name: "Market Maps", path: "/market-maps", description: "Industry landscape overviews" },
      ]
    },
  ];

  const resourceItems = [
    { name: "Blog", path: "/blog", icon: LineChart },
    { name: "Newsletter", path: "/newsletter", icon: Mail },
    { name: "Events", path: "/events", icon: Calendar },
    { name: "How We Curate", path: "/how-we-curate", icon: Brain },
    { name: "API Access", path: "/api-access", icon: Building },
    { name: "Contact", path: "/contact", icon: Mail },
  ];

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        // Return focus to menu button
        const menuButton = document.querySelector('[aria-label="Toggle main menu"]') as HTMLElement;
        menuButton?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Handle focus trap in mobile menu
  useEffect(() => {
    if (isOpen && mobileMenuRef.current) {
      const focusableElements = mobileMenuRef.current.querySelectorAll(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTabKey);
      firstElement?.focus();

      return () => document.removeEventListener("keydown", handleTabKey);
    }
  }, [isOpen]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // In a real app, this would update the theme context or localStorage
    document.documentElement.classList.toggle("dark");
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleSubmenuKeyDown = (e: React.KeyboardEvent, submenuItems: MenuItem['submenu']) => {
    if (!submenuItems) return;
    
    const currentIndex = submenuItems.findIndex(item => 
      document.activeElement?.getAttribute('href') === item.path
    );
    
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % submenuItems.length;
        const nextLink = document.querySelector(`a[href="${submenuItems[nextIndex].path}"]`) as HTMLElement;
        nextLink?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? submenuItems.length - 1 : currentIndex - 1;
        const prevLink = document.querySelector(`a[href="${submenuItems[prevIndex].path}"]`) as HTMLElement;
        prevLink?.focus();
        break;
      }
      case "Escape": {
        e.preventDefault();
        setFocusedSubmenu(null);
        const menuButton = document.querySelector(`[aria-expanded="true"]`) as HTMLElement;
        menuButton?.focus();
        break;
      }
    }
  };

  return (
    <>
      {/* Skip to main content link */}
      <a
        ref={skipLinkRef}
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      <header 
        className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        role="banner"
      >
        <div className="container flex h-16 items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
            aria-label="Startup Tracker - Go to homepage"
          >
            <TrendingUp className="h-6 w-6" aria-hidden="true" />
            <span className="font-bold text-xl">StartupTracker</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 ml-6" role="navigation" aria-label="Main navigation">
            {mainMenuItems.map((item) => (
              <DropdownMenu key={item.name}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md",
                      isActiveRoute(item.path) && "text-primary bg-primary/10"
                    )}
                    aria-expanded={focusedSubmenu === item.name}
                    aria-haspopup="true"
                    onMouseEnter={() => setFocusedSubmenu(item.name)}
                    onMouseLeave={() => setFocusedSubmenu(null)}
                  >
                    <item.icon className="w-4 h-4" aria-hidden="true" />
                    <span>{item.name}</span>
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56"
                  onKeyDown={(e) => handleSubmenuKeyDown(e, item.submenu)}
                >
                  <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {item.submenu?.map((subItem) => (
                    <DropdownMenuItem key={subItem.path} asChild>
                      <Link
                        to={subItem.path}
                        className={cn(
                          "flex flex-col items-start space-y-1 px-2 py-2",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm",
                          isActiveRoute(subItem.path) && "bg-primary/10 text-primary"
                        )}
                      >
                        <span className="font-medium">{subItem.name}</span>
                        {subItem.description && (
                          <span className="text-xs text-muted-foreground">{subItem.description}</span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
            >
              <Link to="/search" aria-label="Search startups and companies">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Search</span>
              </Link>
            </Button>

            {/* Theme Toggle */}
            <div className="flex items-center space-x-2">
              <label htmlFor="theme-toggle" className="text-sm font-medium sr-only">
                Toggle dark mode
              </label>
              <Sun className="h-4 w-4" aria-hidden="true" />
              <Switch
                id="theme-toggle"
                checked={isDarkMode}
                onCheckedChange={toggleDarkMode}
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              />
              <Moon className="h-4 w-4" aria-hidden="true" />
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
                  aria-label="User account menu"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account/dashboard" className="flex items-center space-x-2">
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account/settings" className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/signout" className="flex items-center space-x-2">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle main menu"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div
            ref={mobileMenuRef}
            id="mobile-menu"
            className="md:hidden border-t bg-background"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="container py-4 space-y-4">
              {/* Mobile Search */}
              <div className="pb-4 border-b">
                <Button
                  variant="outline"
                  className="w-full justify-start focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  asChild
                >
                  <Link to="/search">
                    <Search className="h-4 w-4 mr-2" aria-hidden="true" />
                    Search startups...
                  </Link>
                </Button>
              </div>

              {/* Mobile Navigation Items */}
              <div className="space-y-2">
                {mainMenuItems.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center space-x-2 py-2 text-sm font-medium">
                      <item.icon className="w-4 h-4" aria-hidden="true" />
                      <span>{item.name}</span>
                    </div>
                    {item.submenu && (
                      <div className="ml-6 space-y-1">
                        {item.submenu.map((subItem) => (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={cn(
                              "block py-2 text-sm transition-colors",
                              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md",
                              isActiveRoute(subItem.path) ? "text-primary font-medium" : "text-muted-foreground"
                            )}
                            onClick={() => setIsOpen(false)}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Mobile Resources */}
              <div className="pt-4 border-t">
                <div className="text-sm font-medium mb-2">Resources</div>
                <div className="space-y-1">
                  {resourceItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center space-x-2 py-2 text-sm transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md",
                        isActiveRoute(item.path) ? "text-primary font-medium" : "text-muted-foreground"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="w-4 h-4" aria-hidden="true" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Theme Toggle */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dark mode</span>
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4" aria-hidden="true" />
                    <Switch
                      checked={isDarkMode}
                      onCheckedChange={toggleDarkMode}
                      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                    />
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content landmark */}
      <main id="main-content" tabIndex={-1}>
        {/* Content will be rendered here by the router */}
      </main>
    </>
  );
};

export default AccessibleHeader;
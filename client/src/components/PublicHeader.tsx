import { useState } from "react";
import { Activity, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Tools", href: "/tools" },
  { label: "Blog", href: "/blog" },
  { label: "Features", href: "/features" },
];

export default function PublicHeader() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/blog") return location.startsWith("/blog");
    if (href === "/tools") return location.startsWith("/tools");
    return location === href;
  };

  const linkClass = (href: string) =>
    isActive(href)
      ? "text-[#FC4C02] border-b-2 border-[#FC4C02] pb-0.5 font-medium text-sm transition-colors"
      : "text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors";

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-charcoal">RunAnalytics</h1>
            </div>
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href}>
                <span className={linkClass(href)}>{label}</span>
              </Link>
            ))}
          </nav>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth">
              <Button
                className="bg-strava-orange text-white hover:bg-strava-orange/90"
                data-testid="header-sign-in"
              >
                Analyze My Data
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="flex flex-col divide-y divide-gray-100">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href}>
                <span
                  className={`block px-6 py-4 text-base font-medium cursor-pointer ${
                    isActive(href)
                      ? "text-[#FC4C02] bg-orange-50"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </span>
              </Link>
            ))}
            <div className="px-6 py-4">
              <Link href="/auth">
                <Button
                  className="w-full bg-strava-orange text-white hover:bg-strava-orange/90"
                  onClick={() => setMobileOpen(false)}
                >
                  Analyze My Data
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

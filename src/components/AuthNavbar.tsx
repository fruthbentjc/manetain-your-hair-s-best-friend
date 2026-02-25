import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  User, LogOut, LayoutDashboard, Camera, Clock, Pill, Stethoscope,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analyze", href: "/analysis", icon: Camera },
  { label: "History", href: "/history", icon: Clock },
  { label: "Treatments", href: "/treatments", icon: Pill },
  { label: "Specialists", href: "/specialists", icon: Stethoscope },
];

const AuthNavbar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      {/* Top bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between py-2.5 px-4 md:px-6">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M</span>
            </div>
            <span className="font-display text-lg md:text-xl font-bold text-foreground">Manetain</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`transition-colors ${
                  pathname === link.href
                    ? "text-foreground font-medium"
                    : "hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/profile">
                <User className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => { signOut(); navigate("/"); }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around py-1.5">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-0 transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <link.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AuthNavbar;

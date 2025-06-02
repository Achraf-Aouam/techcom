"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sun, Moon, LogOut, UserCircle, LayoutDashboard } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface ReusableNavbarProps {
  navItems: NavItem[];
  brandName?: string;
  brandHref?: string;
}

export function ReusableNavbar({
  navItems,
  brandName = "Admin Panel",
  brandHref = "/admin",
}: ReusableNavbarProps) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href={brandHref} className="mr-6 flex items-center space-x-2">
            {/* You can use an SVG logo here if you have one */}
            <LayoutDashboard className="h-6 w-6" />
            <span className="font-bold sm:inline-block">{brandName}</span>
          </Link>
          <nav className="flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={
                  pathname === item.href ||
                  (pathname.startsWith(item.href) &&
                    item.href !== "/admin" &&
                    item.href !== "/")
                    ? "secondary"
                    : "ghost"
                }
                asChild
                size="sm"
                className="text-sm font-medium"
              >
                <Link href={item.href}>
                  {item.icon && (
                    <span className="mr-2 h-4 w-4">{item.icon}</span>
                  )}
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        {/* Mobile Menu (Optional - for MVP can be simpler or omitted) */}
        {/* <div className="md:hidden"> ... Mobile menu button and drawer ... </div> */}

        <div className="flex flex-1 items-center justify-end space-x-2">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : user ? (
            <>
              <div className="flex items-center text-sm text-muted-foreground">
                <UserCircle className="mr-2 h-5 w-5" />
                <span>
                  {user.email} ({user.role})
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
          {/* Optional: Theme Toggle
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          */}
        </div>
      </div>
    </header>
  );
}

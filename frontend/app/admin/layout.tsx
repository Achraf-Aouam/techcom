"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ReusableNavbar, NavItem } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toaster";
import {
  Shield,
  Users,
  CalendarDays,
  Landmark,
  LayoutDashboard,
} from "lucide-react";

const adminNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Clubs",
    href: "/admin/clubs",
    icon: <Landmark className="h-4 w-4" />,
  },
  {
    label: "Events",
    href: "/admin/events",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    label: "Members",
    href: "/admin/members",
    icon: <Users className="h-4 w-4" />,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!token) {
        console.log("AdminLayout: No token, redirecting to login.");
        router.replace("/login?message=session_expired_or_not_logged_in");
      } else if (user && user.role !== "SAO_ADMIN") {
        console.log(
          `AdminLayout: User role is ${user.role}, not admin. Redirecting.`
        );
        router.replace("/?message=unauthorized_access_to_admin");
      } else if (!user && token) {
        console.warn(
          "AdminLayout: isLoading is false, token exists, but user is null. Render logic will handle UI."
        );
      }
    }
  }, [user, isLoading, token, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="flex flex-col items-center">
          <Shield className="h-12 w-12 animate-pulse text-primary mb-4" />
          <p className="text-lg">Securing admin area...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "SAO_ADMIN") {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="flex flex-col items-center">
          <Shield className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg">Access Denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <ReusableNavbar navItems={adminNavItems} brandName="Admin Dashboard" />
      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}

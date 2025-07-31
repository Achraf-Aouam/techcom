"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function MainNav({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const { user } = useAuth();
  const pathname = usePathname();

  const setRoutes = () => {
    if (user?.role === "CLUB_MANAGER") {
      return [
        {
          href: `/dashboard`,
          label: "Dashboard",
          active: pathname === `/dashboard`,
        },
        {
          href: `/myclub`,
          label: "My Club",
          active: pathname === `/myclub`,
        },
        {
          href: `/myevents`,
          label: "My Events",
          active: pathname === `/myevents`,
        },
        {
          href: `/members`,
          label: "Members",
          active: pathname === `/members`,
        },
      ];
    }
    if (user?.role === "SAO_ADMIN") {
      return [
        {
          href: `/dashboard`,
          label: "Dashboard",
          active: pathname === `/dashboard`,
        },
        {
          href: `/clubs`,
          label: "Clubs",
          active: pathname === `/clubs`,
        },
        {
          href: `/events`,
          label: "Events",
          active: pathname === `/events`,
        },
        {
          href: `/members`,
          label: "Members",
          active: pathname === `/members`,
        },
      ];
    }
    return [
      {
        href: `/dashboard`,
        label: "Dashboard",
        active: pathname === `/dashboard`,
      },
      {
        href: `/clubs`,
        label: "Clubs",
        active: pathname === `/clubs`,
      },
      {
        href: `/events`,
        label: "Events",
        active: pathname === `/events`,
      },
    ];
  };

  const routes = setRoutes();

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-board hover:text-primary ",
            route.active
              ? "text-black dark:text-white"
              : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}

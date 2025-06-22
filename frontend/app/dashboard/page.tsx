// app/dashboard/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { logoutAction } from "@/lib/actions"; // We'll create this next
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    // This can happen briefly before the initialUser is set
    // or if fetching the user failed.
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome to your Dashboard, {user.name}!</h1>
      <p>Your Email: {user.email}</p>
      <p>Your Role: {user.role}</p>

      <form action={logoutAction}>
        <Button type="submit" className="your-button-styles">
          Logout
        </Button>
      </form>
    </div>
  );
}

"use client"; // Add this for client-side interactivity

import Image from "next/image";
import Link from "next/link"; // Import Link for navigation
import { useState, useEffect } from "react"; // Import hooks for interactivity
import { Button } from "@/components/ui/button"; // Import Button component
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth to check login status

export default function Home() {
  const [rotation, setRotation] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const { token, isLoading, user } = useAuth(); // Get auth status

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prevRotation) => prevRotation + (isHovering ? 2 : 0.5));
    }, 50);
    return () => clearInterval(interval);
  }, [isHovering]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-slate-900 to-slate-700 text-white font-[family-name:var(--font-geist-sans)]">
      <header className="absolute top-8 right-8">
        {!isLoading &&
          (token && user ? (
            <Link href="/profile">
              <Button
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-slate-900"
              >
                Go to Profile ({user.name})
              </Button>
            </Link>
          ) : (
            <div className="flex gap-4">
              <Link href="/login">
                <Button
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-slate-900"
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="default"
                  className="bg-blue-500 hover:bg-blue-400 text-white"
                >
                  Register
                </Button>
              </Link>
            </div>
          ))}
      </header>

      <main className="flex flex-col items-center text-center gap-12">
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: "transform 0.1s linear",
          }}
          className="cursor-pointer"
        >
          <Image
            src="/globe.svg" // Assuming you have a globe icon in public
            alt="Interactive Globe"
            width={150}
            height={150}
            className="dark:invert" // Invert colors for dark mode if needed
          />
        </div>

        <h1 className="text-5xl font-bold">Welcome to TechCom</h1>
        <p className="text-xl text-slate-300 max-w-xl">
          Your central hub for university clubs, events, and student engagement.
          Discover new opportunities and connect with your community.
        </p>

        <div className="mt-8 flex gap-6">
          <Link href={token ? "/profile" : "/register"}>
            <Button
              size="lg"
              className="bg-green-500 hover:bg-green-400 text-white px-8 py-6 text-lg"
            >
              {token ? "Explore Dashboard" : "Get Started"}
            </Button>
          </Link>
          <a
            href="https://nextjs.org/docs" // Example external link
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-slate-900 px-8 py-6 text-lg"
            >
              Learn More
            </Button>
          </a>
        </div>
      </main>

      <footer className="absolute bottom-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} TechCom. All rights reserved.</p>
        <p className="mt-1">
          Powered by Next.js and Vercel.
          <Image
            src="/next.svg"
            alt="Next.js Logo"
            width={60}
            height={12}
            className="inline-block ml-2 dark:invert"
          />
        </p>
      </footer>
    </div>
  );
}

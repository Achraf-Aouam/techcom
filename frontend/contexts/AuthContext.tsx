"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { TokenResponse, UserProfile, getCurrentUser } from "@/lib/authService";
import { useRouter } from "next/navigation";

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  login: (data: TokenResponse) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("authToken", token);
      getCurrentUser(token)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("authToken");
          setToken(null);
          setUser(null);
          router.push("/login");
        })
        .finally(() => setIsLoading(false));
    } else {
      localStorage.removeItem("authToken");
      setUser(null);
      setIsLoading(false);
    }
  }, [token, router]);

  const login = (data: TokenResponse) => {
    setToken(data.access_token);
    setIsLoading(true);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

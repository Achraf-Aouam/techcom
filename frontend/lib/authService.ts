import { z } from "zod";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1"; // Adjust if your backend is hosted elsewhere

// Schemas based on OpenAPI_docs.json

export const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"), // Can be student_id or email
  password: z.string().min(1, "Password is required"),
});
export type LoginData = z.infer<typeof LoginSchema>;

export const UserRoleSchema = z.enum(["SAO_ADMIN", "CLUB_MANAGER", "STUDENT"]);
export type UserRoleType = z.infer<typeof UserRoleSchema>;

export const RegisterSchema = z.object({
  student_id: z.string().min(1, "Student ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: UserRoleSchema.default("STUDENT"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});
export type RegisterData = z.infer<typeof RegisterSchema>;

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: number;
  student_id: string;
  name: string;
  email: string;
  role: UserRoleType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API Service Functions

export async function loginUser(data: LoginData): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded", // FastAPI token endpoint expects form data
    },
    body: new URLSearchParams(data),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Login failed" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function registerUser(data: RegisterData): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Registration failed" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function getCurrentUser(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch user" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

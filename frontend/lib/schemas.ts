// lib/schemas.ts
import { z } from "zod";

// Schema for the login form. Matches the backend's OAuth2PasswordRequestForm.
// The backend accepts either email or student_id as 'username'.
export const LoginSchema = z.object({
  username: z.union([z.string().email(), z.coerce.number()]),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

// Type derived from the Zod schema
export type LoginInput = z.infer<typeof LoginSchema>;

// Based on your backend's UserInDb schema
export const UserSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["STUDENT", "CLUB_MANAGER", "SAO_ADMIN"]), // Match your UserRoleType enum
  wants_email_notif: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export type User = z.infer<typeof UserSchema>;

// Based on your backend's JWT payload structure
export interface DecodedToken {
  sub: string; // The user's email
  roles: string; // e.g., "STUDENT", "CLUB_MANAGER"
  managed_club?: number; // Optional club ID
  exp: number; // Expiration timestamp
}

export const RegisterSchema = z.object({
  student_id: z.coerce.number(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export type Event = {
  name: string;
  description: string;
  location: string;
  status: "IDEATION" | "PLANNING" | "POSTED" | "CURRENT" | "PAST";
  image_url: string;
  start_time: string;
  end_time: string;
};

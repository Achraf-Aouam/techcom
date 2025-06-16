// lib/schemas.ts
import { z } from "zod";

// Schema for the login form. Matches the backend's OAuth2PasswordRequestForm.
// The backend accepts either email or student_id as 'username'.
export const LoginSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
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
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// Based on your backend's JWT payload structure
export interface DecodedToken {
  sub: string; // The user's email
  roles: string; // e.g., "STUDENT", "CLUB_MANAGER"
  managed_club?: number; // Optional club ID
  exp: number; // Expiration timestamp
}

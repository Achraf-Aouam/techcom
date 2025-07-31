"use client";

//separate schema for client since no FileList in SSR

import { z } from "zod";

export const EventCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  status: z
    .enum(["IDEATION", "PLANNING", "POSTED", "PENDING", "CURRENT", "PAST"])
    .optional(),
  tempFile: z.instanceof(FileList).optional().nullable(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});
export type EventCreateType = z.infer<typeof EventCreateSchema>;

export const ClubCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  // imageUrl: z.string().optional(),
  color_code: z.string().optional(),
  is_active: z.boolean().optional(),
  // managerId: z.string().optional(),
  managerId: z.coerce.number().optional(),

  tempFile: z.instanceof(FileList).optional().nullable(),
});

export type ClubCreateType = z.infer<typeof ClubCreateSchema>;

export const ClubUpdateSchema = z.object({
  description: z.string().optional(),
  color_code: z.string().optional(),
  tempFile: z.instanceof(FileList).optional().nullable(),
});

export type ClubUpdateType = z.infer<typeof ClubUpdateSchema>;

export type Event = {
  id: number;
  name: string;
  status: "IDEATION" | "PLANNING" | "POSTED" | "PENDING" | "CURRENT" | "PAST";
  description: string | undefined;
  image_url: string | undefined;
  location: string | undefined;
  start_time: string | undefined;
  end_time: string | undefined;
  club_id: number;
};

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

export type Club = {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  color_code?: string;
  is_active?: boolean;
  manager_id?: number;
  created_at: string;
  updated_at: string;
};

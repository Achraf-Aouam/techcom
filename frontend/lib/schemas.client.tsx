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

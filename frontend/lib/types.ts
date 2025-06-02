// Based on the OpenAPI schema for ClubInDb
export interface ClubInDb {
  name: string;
  description?: string | null;
  image_url?: string | null;
  color_code?: string | null; // Matches regex ^#(?:[0-9a-fA-F]{3}){1,2}$
  is_active?: boolean | null;
  id: number;
  created_at: string; // date-time format
  updated_at: string; // date-time format
}

// Based on the OpenAPI schema for EventInDb
export type EventStatusType =
  | "IDEATION"
  | "PLANNING"
  | "POSTED"
  | "CURRENT"
  | "PAST";

export interface EventInDb {
  name: string;
  description?: string | null;
  location: string;
  status: EventStatusType;
  image_url?: string | null;
  start_time?: string | null; // date-time format
  end_time?: string | null; // date-time format
  club_id: number;
  id: number;
  created_at: string; // date-time format
  updated_at: string; // date-time format
}

// Based on the OpenAPI schema for UserInDb
export type UserRoleType = "SAO_ADMIN" | "CLUB_MANAGER" | "STUDENT";

export interface UserInDb {
  student_id: number;
  name: string;
  email: string; // email format
  role: UserRoleType;
  wants_email_notif?: boolean | null;
  id: number;
  created_at: string; // date-time format
  updated_at: string; // date-time format
}

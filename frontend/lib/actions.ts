"use server";

import {
  LoginSchema,
  RegisterInput,
  User,
  Event,
  Club,
} from "./schemas.server";

import { createSession, getDecodedToken } from "./session";
import { getBearerToken } from "@/lib/session";

import { redirect } from "next/navigation";
import { deleteSession } from "./session";

// Define a type for our action's state
export type FormState = {
  message: string;
  success: boolean;
};

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function loginAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. Server-side validation with Zod

  const validatedFields = LoginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      message: "Invalid form data. Please check your inputs.",
      success: false,
    };
  }

  const { username, password } = validatedFields.data;

  try {
    // 2. Prepare data for FastAPI's OAuth2PasswordRequestForm
    const formBody = new URLSearchParams();
    formBody.append("username", String(username));
    formBody.append("password", password);

    // 3. Call the FastAPI backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // The API returned an error (e.g., 401 Unauthorized)
      return {
        message: data.detail || "Login failed. Please check your credentials.",
        success: false,
      };
    }

    // 4. Success! Create the secure session cookie
    const backendToken = data.access_token;
    await createSession(backendToken);

    // We don't return state on success because we will redirect.
    // The redirect must be called outside the try/catch block.
  } catch (error) {
    console.error("Login Action Error:", error);
    return {
      message: "An unexpected error occurred. Please try again.",
      success: false,
    };
  }

  // 5. Redirect to the dashboard on successful login
  redirect("/dashboard");
}

export async function registerUser(formdata: RegisterInput): Promise<User> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formdata),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: "Registration failed",
    }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function getAllUsers(): Promise<Array<User>> {
  const token = await getBearerToken();
  if (!token) {
    return [];
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "retreival of users failed" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function createClub(submitData: {}) {
  const token = await getBearerToken();
  if (!token) {
    return [];
  }

  await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/clubs/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(submitData),
  });
}

export async function createEvent(submitData: Record<string, any>) {
  const token = await getBearerToken();
  const decodedToken = await getDecodedToken();

  if (!token || !decodedToken) {
    throw new Error("Authentication required.");
  }

  // submitData = Object.fromEntries(
  //   Object.entries(submitData).filter(([_, v]) => v !== null && v !== "")
  // );

  const cleanedData: Record<string, any> = {};
  for (const key in submitData) {
    if (submitData[key] !== null && submitData[key] !== "") {
      cleanedData[key] = submitData[key];
    }
  }
  submitData = cleanedData;
  const eventData = {
    ...submitData,
    ...(decodedToken.managed_club && { club_id: decodedToken.managed_club }),
  };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(eventData),
    }
  );
  if (!response.ok) {
    // Optional: Add better error handling
    let errorDetail = "Failed to create event.";
    try {
      const error = await response.json();
      errorDetail = error.detail || errorDetail;
    } catch (e) {
      // response is not JSON, keep default message
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export async function updateEventStatus(id: number) {
  const token = await getBearerToken();
  if (!token) {
    return [];
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${id}/status`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "retreival of users failed" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function getManagedClubEvents() {
  const token = await getBearerToken();
  const decodedToken = await getDecodedToken();

  if (!token || !decodedToken) {
    throw new Error("Authentication required.");
  }

  const events = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/?club_id=${decodedToken.managed_club}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data: Array<Event> = await events.json();
  return data;
}

export async function updateEvent(
  submitData: Record<string, any>,
  eventId: number
) {
  const token = await getBearerToken();
  if (!token) {
    return [];
  }
  const cleanedData: Record<string, any> = {};
  for (const key in submitData) {
    if (submitData[key] !== null && submitData[key] !== "") {
      cleanedData[key] = submitData[key];
    }
  }
  submitData = cleanedData;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(submitData),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Update of Event Failed" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function DeleteEvent(eventId: Number) {
  const token = await getBearerToken();
  if (!token) {
    return [];
  }
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Delete of Event Failed" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return { success: true };
}

export async function getEvents(
  params?: Record<string, string | number | Array<any>>
) {
  const token = await getBearerToken();
  // Build query string from params if provided
  let query = "";
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
    query = `?${searchParams.toString()}`;
  } else {
    query = "";
  }
  if (!token) {
    throw new Error("Authentication required.");
  }
  console.log(query);
  const events = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data: Array<Event> = await events.json();
  return data;
}

export async function adminEventReview(eventId: number, approve: boolean) {
  const token = await getBearerToken();
  if (!token) {
    return [];
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${eventId}/review?approve=${approve}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Update of Event Failed" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function updateClub(data: Record<string, any>) {
  const token = await getBearerToken();
  if (!token) {
    return [];
  }

  const response = await fetch(``, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

export async function getEventById(eventId: number): Promise<Event> {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${eventId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch event" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }

  return response.json();
}

export async function getAttendanceById(eventId: number): Promise<Array<User>> {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${eventId}/attendees`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch attendees" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }

  return response.json();
}

export async function getEventStats(eventId: number): Promise<{
  total_attendance: number;
  attendance_rate: number;
  member_attendance_rate: number;
  non_member_attendance: number;
}> {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("Authentication required.");
  }
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/${eventId}/stats`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch event stats" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function getmyclub(): Promise<Club> {
  const token = await getBearerToken();
  const decodedToken = await getDecodedToken();

  if (!token || !decodedToken) {
    throw new Error("Authentication required.");
  }
  if (!decodedToken.managed_club) {
    throw new Error("Needs to be a manager");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/clubs/${decodedToken.managed_club}`
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch event stats" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }
  return response.json();
}

export async function getClubStatsById(clubId: number): Promise<{
  total_events: number;
  total_members: number;
  avg_attendance_per_event: number;
}> {
  const token = await getBearerToken();
  if (!token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/clubs/${clubId}/stats`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch club stats" }));
    throw {
      status: response.status,
      message: errorData.detail || `HTTP error ${response.status}`,
    };
  }

  return response.json();
}

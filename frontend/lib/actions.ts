// lib/actions.ts
"use server";

import { z } from "zod";
import { LoginSchema, UserSchema } from "./schemas";

import { createSession } from "./session";
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
    formBody.append("username", username);
    formBody.append("password", password);

    // 3. Call the FastAPI backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/token`,
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

export async function signinAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. Server-side validation with Zod
  const validatedFields = UserSchema.safeParse(
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
    formBody.append("username", username);
    formBody.append("password", password);

    // 3. Call the FastAPI backend
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/token`,
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

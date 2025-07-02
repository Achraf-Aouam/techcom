Of course! This is an excellent use case for the Next.js App Router's new capabilities. Here is a comprehensive, step-by-step guide to implementing stateless JWT authentication with your FastAPI backend. We will cover everything from setting up the project to advanced topics like server-side validation, middleware, and a client-side `AuthContext`.

---

## The Ultimate Guide to Stateless JWT Auth in Next.js (App Router)

This guide will walk you through building a robust, secure, and modern authentication system in your Next.js TypeScript application, interacting with your existing FastAPI backend.

### Table of Contents

1.  **Core Concepts: Stateless Auth & Our Strategy**
2.  **Part 1: Project Setup & Environment**
3.  **Part 2: Schemas & Types - The Single Source of Truth**
4.  **Part 3: The Auth Core - Secure Session Management**
5.  **Part 4: The Login Flow - Form, Action, and Validation**
6.  **Part 5: Middleware - Protecting Routes & Redirecting Users**
7.  **Part 6: The AuthContext - Global State Management**
8.  **Part 7: Putting It All Together - Layouts and Pages**
9.  **Part 8: The Logout Flow**
10. **Part 9: Accessing Token Content (The Secure Way)**
11. **Conclusion & Next Steps**

---

### Core Concepts: Stateless Auth & Our Strategy

- **Stateless JWT:** Your FastAPI backend is "stateless." When a user logs in, it creates a JSON Web Token (JWT), signs it, and sends it to the client. The server doesn't store this token. For every subsequent request to a protected endpoint, the client sends the JWT back, and the server verifies its signature to authenticate the user.
- **Our Next.js Strategy:**
  1.  **Secure Storage:** We will store the JWT received from the backend in a **secure, `httpOnly` cookie**. This is crucial because it prevents the token from being accessed by client-side JavaScript, mitigating XSS (Cross-Site Scripting) attacks.
  2.  **Server Actions:** We'll use Next.js Server Actions for form submissions (like login). This allows us to perform server-side validation _within our Next.js app_ before ever hitting the FastAPI backend, reducing unnecessary API calls.
  3.  **Middleware:** We'll use `middleware.ts` to inspect incoming requests for the session cookie, protecting routes and handling redirects without waiting for a page to render.
  4.  **AuthContext:** We'll use a React Context to provide user data and authentication status to client components across the application, avoiding prop-drilling.

---

### Part 1: Project Setup & Environment

First, let's set up the necessary packages and environment variables.

1.  **Install Dependencies:**

    ```bash
    npm install zod react-hook-form @hookform/resolvers zod-form-data
    npm install jose # For encrypting our session cookie
    npm install jwt-decode # A lightweight utility for decoding JWT payloads
    ```

2.  **Environment Variables:**

    Create a file named `.env.local` in your project root.

    ```bash
    # .env.local

    # The base URL of your FastAPI backend
    NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000"

    # A strong, secret key for encrypting the session cookie.
    # Generate one using: `openssl rand -base64 32`
    SESSION_SECRET="your-super-strong-random-secret-for-session-cookie"
    ```

---

### Part 2: Schemas & Types - The Single Source of Truth

Let's define our data structures using Zod. This ensures type safety and provides schemas for validation.

Create a file `lib/schemas.ts`:

```typescript
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
```

---

### Part 3: The Auth Core - Secure Session Management

Here we'll create server-side utility functions to manage the `httpOnly` cookie session. This is the heart of our security model.

Create a file `lib/session.ts`:

```typescript
// lib/session.ts
import "server-only"; // Ensures this code never runs on the client
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secretKey = process.env.SESSION_SECRET;
const key = new TextEncoder().encode(secretKey);

// Encrypts a payload (our session data) into a JWT.
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d") // Session cookie will expire in 1 day
    .sign(key);
}

// Decrypts the session JWT and returns the payload.
export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    // This can happen if the token is malformed, expired, or the secret is wrong.
    console.error("Failed to decrypt session:", error);
    return null;
  }
}

// Action to create the session cookie.
export async function createSession(token: string) {
  // The 'token' here is the JWT from your FastAPI backend.
  // We will store this token inside our own encrypted session cookie.
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 24 hours
  const session = await encrypt({ token, expires });

  // Securely set the session cookie.
  cookies().set("session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

// Action to delete the session cookie.
export async function deleteSession() {
  cookies().set("session", "", { expires: new Date(0), path: "/" });
}

// Function to get the current session from the cookie.
// This can be used in Server Components and Server Actions.
export async function getSession() {
  const sessionCookie = cookies().get("session")?.value;
  if (!sessionCookie) return null;
  return await decrypt(sessionCookie);
}

// Function to get the raw JWT for API calls.
export async function getBearerToken() {
  const session = await getSession();
  // The session payload contains the token from our backend.
  return session?.token ?? null;
}

// Function to update the session in middleware.
export async function updateSession(request: NextRequest) {
  const session = request.cookies.get("session")?.value;
  if (!session) return;

  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  const res = NextResponse.next();
  res.cookies.set({
    name: "session",
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  });
  return res;
}
```

---

### Part 4: The Login Flow - Form, Action, and Validation

Now, let's build the login page. It will use React Hook Form, Zod for client-side validation, and a Server Action for the actual login logic.

**1. The Server Action (`lib/actions.ts`)**

This action validates the form data on the server, calls your FastAPI backend, and creates the session if successful.

```typescript
// lib/actions.ts
"use server";

import { z } from "zod";
import { LoginSchema } from "./schemas";
import { createSession } from "./session";
import { redirect } from "next/navigation";

// Define a type for our action's state
export type FormState = {
  message: string;
  success: boolean;
};

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
```

**2. The Login Page Component (`app/login/page.tsx`)**

This client component renders the form and uses `useFormState` to handle the server action's response.

```typescript
// app/login/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInput, LoginSchema } from "@/lib/schemas";
import { loginAction, FormState } from "@/lib/actions";
import { useFormState, useFormStatus } from "react-dom";

// A component to show pending status on the submit button
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="your-button-styles">
      {pending ? "Logging in..." : "Login"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState<FormState, FormData>(loginAction, {
    message: "",
    success: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema), // Client-side validation
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <div className="login-container">
      <h1>Login</h1>
      <form action={formAction} className="login-form">
        <div>
          <label htmlFor="username">Email or Student ID</label>
          <input
            id="username"
            type="text"
            {...register("username")}
            className="your-input-styles"
          />
          {errors.username && (
            <p className="error-text">{errors.username.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            {...register("password")}
            className="your-input-styles"
          />
          {errors.password && (
            <p className="error-text">{errors.password.message}</p>
          )}
        </div>

        {/* Display server-side error message */}
        {!state.success && state.message && (
          <p className="error-text">{state.message}</p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
```

---

### Part 5: Middleware - Protecting Routes & Redirecting Users

Middleware runs before a request is completed. It's perfect for protecting routes.

Create a file `middleware.ts` in your project's root directory (or inside `src/` if you use it).

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

// 1. Specify protected and public-only routes
const protectedRoutes = ["/dashboard", "/profile"];
const publicRoutes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 2. Check if the current route is protected or public
  const isProtectedRoute = protectedRoutes.some((prefix) =>
    path.startsWith(prefix)
  );
  const isPublicRoute = publicRoutes.some((prefix) => path.startsWith(prefix));

  // 3. Decrypt the session from the cookie
  const cookie = request.cookies.get("session")?.value;
  const session = cookie ? await decrypt(cookie) : null;

  // 4. Redirect logic
  // 4.1. If trying to access a protected route without a session, redirect to login
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  // 4.2. If trying to access a public-only route with a session, redirect to dashboard
  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

### Part 6: The AuthContext - Global State Management

The context will hold the user's data and make it available to all client components, avoiding the need to re-fetch it constantly.

Create `context/AuthContext.tsx`:

```tsx
// context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { User } from "@/lib/schemas";

// Define the shape of the context data
interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  // We can add more auth-related functions here later, like a client-side logout
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the provider component
interface AuthProviderProps {
  children: ReactNode;
  initialUser: User | null; // Allow passing an initial user
}

// Create the provider component
export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Create a custom hook for easy access to the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

---

### Part 7: Putting It All Together - Layouts and Pages

Now we integrate the `AuthProvider` into our main layout and fetch the initial user data.

**1. Update Root Layout (`app/layout.tsx`)**

This Server Component will fetch the user's data if a session exists and pass it to the `AuthProvider`.

```tsx
// app/layout.tsx
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { getBearerToken } from "@/lib/session";
import { User, UserSchema } from "@/lib/schemas";

const inter = Inter({ subsets: ["latin"] });

// This function fetches the current user from your FastAPI backend
async function getCurrentUser(): Promise<User | null> {
  const token = await getBearerToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store", // Ensure fresh data
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch user");
      return null;
    }

    const data = await response.json();
    // Validate the response against our Zod schema
    const parsedUser = UserSchema.safeParse(data);

    if (!parsedUser.success) {
      console.error("User data validation failed:", parsedUser.error);
      return null;
    }

    return parsedUser.data;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch user data on the server
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap the entire app with the AuthProvider */}
        <AuthProvider initialUser={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**2. Example Dashboard Page (`app/dashboard/page.tsx`)**

This client component demonstrates how to use the `useAuth` hook and create a logout button.

```tsx
// app/dashboard/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { logoutAction } from "@/lib/actions"; // We'll create this next

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    // This can happen briefly before the initialUser is set
    // or if fetching the user failed.
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome to your Dashboard, {user.name}!</h1>
      <p>Your Email: {user.email}</p>
      <p>Your Role: {user.role}</p>

      <form action={logoutAction}>
        <button type="submit" className="your-button-styles">
          Logout
        </button>
      </form>
    </div>
  );
}
```

---

### Part 8: The Logout Flow

We just need a simple Server Action to delete the session cookie.

Add this to `lib/actions.ts`:

```typescript
// Add to lib/actions.ts

import { deleteSession } from "./session";
// ... other imports

// ... loginAction ...

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
```

Our dashboard's logout button will now correctly call this action, clear the session, and redirect the user.

---

### Part 9: Accessing Token Content (The Secure Way)

Your original request asked how to access the token content on the client side. With our `httpOnly` cookie approach, **you cannot and should not access the raw JWT string directly from client-side JavaScript.** This is a security feature, not a limitation.

The correct way to get information that's in the token is:

1.  **Primary Method (Best Practice):** Fetch the full user object from a trusted API endpoint (`/api/users/me`), as we did in `app/layout.tsx`. This data is then available globally via the `useAuth` hook. This is more reliable as the user data from the API is always the most up-to-date.

2.  **Secondary Method (If Needed):** If you absolutely need to access the decoded payload without fetching the full user object, you can create a dedicated API Route in Next.js to do it securely.

    Create `app/api/session/payload/route.ts`:

    ```typescript
    // app/api/session/payload/route.ts
    import { getSession } from "@/lib/session";
    import { NextResponse } from "next/server";
    import { jwtDecode } from "jwt-decode";
    import { DecodedToken } from "@/lib/schemas";

    export async function GET() {
      const session = await getSession();

      if (!session?.token) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 }
        );
      }

      try {
        // Decode the token that was stored in our secure session
        const decoded = jwtDecode<DecodedToken>(session.token);
        return NextResponse.json(decoded);
      } catch (error) {
        return NextResponse.json({ error: "Invalid token" }, { status: 400 });
      }
    }
    ```

    You could then `fetch('/api/session/payload')` from a client component to get this data. This keeps the actual token secure on the server while exposing only its decoded, non-sensitive payload.

---

### Conclusion & Next Steps

You now have a complete, secure, and modern authentication system!

**Recap of the flow:**

1.  User fills out the login form (`/login`).
2.  The form submits to a Server Action (`loginAction`).
3.  The action validates the data, calls your FastAPI backend, and gets a JWT.
4.  The action creates an encrypted, `httpOnly` session cookie containing the JWT.
5.  The user is redirected to `/dashboard`.
6.  The middleware checks for the session cookie on every request, protecting routes.
7.  The root layout fetches the full user data using the token from the cookie and populates the `AuthProvider`.
8.  Client components anywhere in the app can now access the user's data via the `useAuth()` hook.

**To extend this system:**

- **Role-Based Access Control (RBAC):** Use the `user.role` from the `useAuth` hook to conditionally render UI elements (e.g., show an "Admin Panel" link only if `user.role === 'SAO_ADMIN'`).
- **Refresh Tokens:** For longer-lived sessions, your backend could issue a refresh token. You would store this securely in the session cookie as well and create a mechanism to use it to get a new access token when the old one expires.
- **Error Handling:** Enhance the UI feedback for errors from server actions and API calls.

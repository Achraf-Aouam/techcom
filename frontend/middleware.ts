// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";
import { decodeJwt } from "jose";

// 1. Specify protected and public-only routes
const protectedRoutes = ["/dashboard", "/profile", "/clubs", "/events"];
const publicRoutes = ["/login", "/register"];

/**
 * Checks if the backend authentication token stored in the session is expired.
 * @param session The decrypted session payload, which should contain the backend token.
 * @returns `true` if the token is expired or invalid, `false` otherwise.
 */
function isBackendTokenExpired(session: { token: string } | null): boolean {
  if (!session?.token) {
    return true; // No token means no valid session.
  }
  try {
    const backendToken = decodeJwt(session.token);
    // Check if 'exp' claim exists and is a number.
    if (typeof backendToken.exp !== "number") {
      console.error("Backend token has no 'exp' claim.");
      return true; // Treat as invalid if no expiration.
    }
    // Check if token is expired.
    const isExpired = backendToken.exp * 1000 < Date.now();
    return isExpired;
  } catch (error) {
    console.error("Failed to decode or process backend token:", error);
    return true; // Treat as invalid if any error occurs.
  }
}

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

  // 4. Determine if the session is valid based on token expiration
  const isSessionValid = !isBackendTokenExpired(session);

  // 5. Redirect logic
  // 5.1. If trying to access a protected route with an invalid session, redirect to login.
  if (isProtectedRoute && !isSessionValid) {
    console.log("session isn't valid");
    const response = NextResponse.redirect(new URL("/login", request.nextUrl));
    // Clear the invalid session cookie if it exists
    if (cookie) {
      response.cookies.set("session", "", { expires: new Date(0), path: "/" });
    }
    return response;
  }

  // 5.2. If trying to access a public-only route with a valid session, redirect to dashboard.
  if (isPublicRoute && isSessionValid) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  // 5.3 If on a public route with an expired/invalid session cookie, clear it and proceed.
  // This prevents a redirect loop if the user manually navigates to /login with an old cookie.
  if (isPublicRoute && cookie && !isSessionValid) {
    const response = NextResponse.next();
    response.cookies.set("session", "", { expires: new Date(0), path: "/" });
    return response;
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

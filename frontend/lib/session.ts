// lib/session.ts
import "server-only"; // Ensures this code never runs on the client
import { SignJWT, jwtVerify, decodeJwt } from "jose";
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
  (await cookies()).set("session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

// Action to delete the session cookie.
export async function deleteSession() {
  (await cookies()).set("session", "", { expires: new Date(0), path: "/" });
}

// Function to get the current session from the cookie.
// This can be used in Server Components and Server Actions.
export async function getSession() {
  const sessionCookie = (await cookies()).get("session")?.value;
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

export interface DecodedToken {
  sub: string;
  roles: string;
  managed_club?: number; // This field is optional
  exp?: number;
  iat?: number;
}

export async function getDecodedToken(): Promise<DecodedToken | null> {
  const token = await getBearerToken();
  if (!token) return null;
  try {
    const decoded = decodeJwt(token);
    return decoded as unknown as DecodedToken;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

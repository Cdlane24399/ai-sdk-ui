import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

// Validate JWT_SECRET is set in production
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production");
  }
  return new TextEncoder().encode(
    secret || "dev-only-secret-change-in-production"
  );
};

const JWT_SECRET = getJwtSecret();

const COOKIE_NAME = "auth_token";

export interface JWTPayload {
  userId: number;
  email: string;
  name?: string;
}

// Create a JWT token
export async function createToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

// Verify and decode a JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Set authentication cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// Get authentication cookie
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

// Clear authentication cookie
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from request
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}

// Secure password hashing using PBKDF2 with Web Crypto API
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  
  // Return salt:hash format
  return `${arrayBufferToHex(salt.buffer)}:${arrayBufferToHex(derivedBits)}`;
}

// Verify password against stored hash
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [saltHex, hashHex] = storedHash.split(":");
  
  if (!saltHex || !hashHex) {
    return false;
  }
  
  const salt = new Uint8Array(hexToArrayBuffer(saltHex));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  
  return arrayBufferToHex(derivedBits) === hashHex;
}

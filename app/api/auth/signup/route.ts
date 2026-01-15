import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const result = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email}, ${passwordHash}, ${name || null})
      RETURNING id, email, name
    `;

    const user = result[0];

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    // Set auth cookie
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

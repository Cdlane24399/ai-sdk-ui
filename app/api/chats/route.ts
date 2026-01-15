import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Get all chats for the current user
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sql = getSql();

    const chats = await sql`
      SELECT id, title, model_id, created_at, updated_at
      FROM chats
      WHERE user_id = ${user.userId}
      ORDER BY updated_at DESC
    `;

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Get chats error:", error);
    return NextResponse.json(
      { error: "Failed to get chats" },
      { status: 500 }
    );
  }
}

// Create a new chat
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { title, modelId } = await req.json();

    const sql = getSql();

    const result = await sql`
      INSERT INTO chats (user_id, title, model_id)
      VALUES (${user.userId}, ${title || "New Chat"}, ${modelId || null})
      RETURNING id, title, model_id, created_at, updated_at
    `;

    return NextResponse.json({ chat: result[0] });
  } catch (error) {
    console.error("Create chat error:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 }
    );
  }
}

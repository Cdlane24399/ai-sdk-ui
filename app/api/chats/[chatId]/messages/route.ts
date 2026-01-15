import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ chatId: string }>;
};

// Add a message to a chat
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { chatId } = await params;
    const chatIdNum = parseInt(chatId, 10);

    if (isNaN(chatIdNum)) {
      return NextResponse.json(
        { error: "Invalid chat ID" },
        { status: 400 }
      );
    }

    const sql = getSql();

    // Verify chat ownership
    const chats = await sql`
      SELECT id FROM chats WHERE id = ${chatIdNum} AND user_id = ${user.userId}
    `;

    if (chats.length === 0) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    const { role, content } = await req.json();

    if (!role || !content) {
      return NextResponse.json(
        { error: "Role and content are required" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO messages (chat_id, role, content)
      VALUES (${chatIdNum}, ${role}, ${content})
      RETURNING id, role, content, created_at
    `;

    // Update chat's updated_at timestamp
    await sql`
      UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ${chatIdNum}
    `;

    return NextResponse.json({ message: result[0] });
  } catch (error) {
    console.error("Add message error:", error);
    return NextResponse.json(
      { error: "Failed to add message" },
      { status: 500 }
    );
  }
}

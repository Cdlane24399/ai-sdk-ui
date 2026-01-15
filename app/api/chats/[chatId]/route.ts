import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ chatId: string }>;
};

// Get a specific chat with messages
export async function GET(req: Request, { params }: RouteParams) {
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

    // Get chat and verify ownership
    const chats = await sql`
      SELECT id, title, model_id, created_at, updated_at
      FROM chats
      WHERE id = ${chatIdNum} AND user_id = ${user.userId}
    `;

    if (chats.length === 0) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    // Get messages for this chat
    const messages = await sql`
      SELECT id, role, content, created_at
      FROM messages
      WHERE chat_id = ${chatIdNum}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      chat: chats[0],
      messages,
    });
  } catch (error) {
    console.error("Get chat error:", error);
    return NextResponse.json(
      { error: "Failed to get chat" },
      { status: 500 }
    );
  }
}

// Update chat (title, etc.)
export async function PATCH(req: Request, { params }: RouteParams) {
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

    const { title } = await req.json();

    const result = await sql`
      UPDATE chats
      SET title = ${title}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${chatIdNum} AND user_id = ${user.userId}
      RETURNING id, title, model_id, created_at, updated_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ chat: result[0] });
  } catch (error) {
    console.error("Update chat error:", error);
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 }
    );
  }
}

// Delete a chat
export async function DELETE(req: Request, { params }: RouteParams) {
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

    const result = await sql`
      DELETE FROM chats
      WHERE id = ${chatIdNum} AND user_id = ${user.userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}

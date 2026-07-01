import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TelegramMessage from "@/models/TelegramMessage";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await connectDB();

    const messages = await TelegramMessage.find()
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ messages: messages.reverse() });
  } catch (err) {
    console.error("Fetch telegram messages error:", err);
    return NextResponse.json(
      { error: "Something went wrong while fetching messages." },
      { status: 500 }
    );
  }
}

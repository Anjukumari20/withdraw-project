import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    await connectDB();

    const leads = await Lead.find().sort({ createdAt: -1 });

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("List leads error:", err);
    return NextResponse.json(
      { error: "Something went wrong while fetching leads." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      isAdmin: user.isAdmin,
    },
  });
}

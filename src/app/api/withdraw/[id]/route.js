import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WithdrawRequest from "@/models/WithdrawRequest";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/getCurrentUser";

// Admin: approve or reject a withdraw request
export async function PATCH(req, { params }) {
  try {
    const admin = await getCurrentUser();
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (!admin.isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const { status, adminNote } = await req.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'." },
        { status: 400 }
      );
    }

    await connectDB();

    const request = await WithdrawRequest.findById(id);
    if (!request) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been reviewed." },
        { status: 400 }
      );
    }

    // If approving, deduct from the user's mock balance.
    if (status === "approved") {
      const targetUser = await User.findById(request.user);
      if (!targetUser) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      if (targetUser.balance < request.amount) {
        return NextResponse.json(
          { error: "User no longer has sufficient balance for this withdrawal." },
          { status: 400 }
        );
      }
      targetUser.balance -= request.amount;
      await targetUser.save();
    }

    request.status = status;
    request.adminNote = adminNote || "";
    request.reviewedAt = new Date();
    await request.save();

    return NextResponse.json({
      message: `Request ${status}.`,
      request,
    });
  } catch (err) {
    console.error("Update withdraw request error:", err);
    return NextResponse.json(
      { error: "Something went wrong while updating the request." },
      { status: 500 }
    );
  }
}

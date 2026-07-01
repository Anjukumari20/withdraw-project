import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WithdrawRequest from "@/models/WithdrawRequest";
import { getCurrentUser } from "@/lib/getCurrentUser";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID;

// Generates a random 10-digit numeric reference code (first digit 1-9 so it
// never looks like it has a leading zero truncated).
function generateRefCode() {
  let code = String(Math.floor(Math.random() * 9) + 1);
  for (let i = 0; i < 9; i++) {
    code += String(Math.floor(Math.random() * 10));
  }
  return code;
}

// Sends the "Payout needed" card into the fixed Telegram group.
// Uses the raw Telegram Bot HTTP API directly — no need to go through the
// bot's Node process, since any client holding the token can call sendMessage.
// Returns the sent message_id on success, throws on failure.
async function sendWithdrawRequestToTelegram({ refCode, amount, upiNumber }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
    throw new Error(
      "Telegram bot is not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_ID in .env)."
    );
  }

  const text =
    `🔔 Payout needed\n` +
    `Amount: ₹${amount}\n` +
    `UPI: ${upiNumber}\n` +
    `Ref: ${refCode}`;

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUP_ID,
        text,
      }),
    }
  );

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || "Failed to send Telegram message.");
  }

  return data.result.message_id;
}

// Create a new withdraw request for the logged-in user
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { amount, upiNumber, name } = await req.json();
    const parsedAmount = Number(amount);
    const requestName = (name || user.name || "").trim();

    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid withdrawal amount." },
        { status: 400 }
      );
    }

    if (!upiNumber || !upiNumber.trim()) {
      return NextResponse.json(
        { error: "Please enter your UPI ID." },
        { status: 400 }
      );
    }

    if (!requestName) {
      return NextResponse.json(
        { error: "Please enter a name." },
        { status: 400 }
      );
    }

    if (parsedAmount > user.balance) {
      return NextResponse.json(
        { error: "Withdrawal amount exceeds your available balance." },
        { status: 400 }
      );
    }

    await connectDB();

    // Create the request first (status "pending"). Retry a couple of times
    // in the rare case of a refCode collision (unique index on refCode).
    let request;
    for (let attempt = 0; attempt < 5; attempt++) {
      const refCode = generateRefCode();
      try {
        request = await WithdrawRequest.create({
          user: user._id,
          name: requestName,
          amount: parsedAmount,
          upiNumber: upiNumber.trim(),
          status: "pending",
          telegramGroupId: TELEGRAM_GROUP_ID || "",
          refCode,
        });
        break;
      } catch (err) {
        if (err.code === 11000) continue; // duplicate refCode, try again
        throw err;
      }
    }

    if (!request) {
      return NextResponse.json(
        { error: "Could not generate a unique reference. Please try again." },
        { status: 500 }
      );
    }

    // Push the request into the Telegram group. Balance is only deducted
    // if this succeeds — if Telegram is unreachable, the user keeps their
    // balance and the request stays "pending" so it can be retried.
    let messageId;
    try {
      messageId = await sendWithdrawRequestToTelegram({
        refCode: request.refCode,
        amount: parsedAmount,
        upiNumber: upiNumber.trim(),
      });
    } catch (telegramErr) {
      console.error("Telegram send error:", telegramErr);
      return NextResponse.json(
        { error: "Could not notify the payment group. Please try again." },
        { status: 502 }
      );
    }

    // Telegram message sent successfully — now mark matched and deduct balance.
    request.status = "matched";
    request.telegramMessageId = messageId;
    request.matchedAt = new Date();
    await request.save();

    user.balance -= parsedAmount;
    await user.save();

    return NextResponse.json({
      message: "Withdraw request submitted.",
      request,
    });
  } catch (err) {
    console.error("Create withdraw request error:", err);
    return NextResponse.json(
      { error: "Something went wrong while submitting the request." },
      { status: 500 }
    );
  }
}

// List withdraw requests.
// - Regular users see only their own requests.
// - Admins see all requests, with user info populated.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await connectDB();

    let requests;
    if (user.isAdmin) {
      requests = await WithdrawRequest.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 });
    } else {
      requests = await WithdrawRequest.find({ user: user._id }).sort({
        createdAt: -1,
      });
    }

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("List withdraw requests error:", err);
    return NextResponse.json(
      { error: "Something went wrong while fetching requests." },
      { status: 500 }
    );
  }
}
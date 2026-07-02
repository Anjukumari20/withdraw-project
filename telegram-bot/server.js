require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { Telegraf } = require("telegraf");
const { connectDB } = require("./db");
const TelegramMessage = require("./TelegramMessage");
const WithdrawRequest = require("./WithdrawRequest");
const { extractUpiFromText } = require("./ocrMatch"); // reuse the UPI-extraction regex
require("./User"); // registers User schema for populate()

const PORT = process.env.BOT_SOCKET_PORT || 4001;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Your OCR project's endpoint that reads a screenshot and returns text.
const OCR_API_URL =
  process.env.OCR_API_URL || "http://localhost:3000/image-reader/ocr";

// Comma-separated list of origins allowed to connect to the socket server,
// e.g. "http://localhost:3000,https://yourapp.com"
const ALLOWED_ORIGINS = (process.env.SOCKET_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

// Comma-separated chat IDs of the monitored withdrawal groups
const MONITORED_GROUPS = (process.env.TG_GROUP_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!TELEGRAM_TOKEN) {
  console.error(
    "[telegram-bot] TELEGRAM_BOT_TOKEN is not set. Add it to telegram-bot/.env"
  );
  process.exit(1);
}

// Sends the screenshot buffer to your OCR API and returns all text it found.
//
// ASSUMPTION: the endpoint accepts multipart/form-data with a "file" field.
// We combine every text-ish field the response might contain (text, ocrText,
// upiId, upi) into one string and search all of it for the UPI ID — this
// way we don't depend on the OCR API isolating any specific field correctly.
// If your /image-reader/ocr route uses a different request shape (e.g. a
// different field name, or a base64 JSON body instead of multipart), tell
// me its exact contract and I'll adjust this one function.
async function extractTextFromImage(buffer, filename = "screenshot.jpg") {
  const form = new FormData();
  form.append("file", new Blob([buffer]), filename);

  const res = await fetch(OCR_API_URL, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`OCR API returned status ${res.status}`);
  }

  const data = await res.json();
  return [data.text, data.ocrText, data.upiId, data.upi]
    .filter(Boolean)
    .join(" ");
}

// Normalizes a UPI ID for comparison: lowercase + trimmed. UPI IDs are
// exact strings (name@ybl, name@okhdfcbank, etc.) so — unlike the old
// reference-code matching — we don't fuzzy-match here. Either the OCR
// pulled out the same handle or it didn't.
function normalizeUpi(upi) {
  return (upi || "").toLowerCase().trim();
}

async function main() {
  await connectDB();

  // --- Socket.IO server (frontend connects here to receive live messages) ---
  const httpServer = http.createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`[socket] listening on port ${PORT}`);
  });

  // --- Telegram bot (Telegraf, long polling) ---
  // IMPORTANT: privacy mode must be disabled for this bot via @BotFather
  // (/setprivacy -> Disable) so it receives every message in groups it's
  // a member of, not just ones that mention/reply to it.
  const bot = new Telegraf(TELEGRAM_TOKEN);

  bot.on("message", async (ctx) => {
    try {
      const msg = ctx.message;
      const chatId = String(msg.chat.id);

      // Always log every message (existing behavior, unchanged)
      const payload = {
        chatId,
        chatTitle: msg.chat.title || msg.chat.username || "Direct message",
        fromUserId: msg.from ? String(msg.from.id) : "",
        fromUsername:
          msg.from?.username ||
          [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
          "Unknown",
        text: msg.text || msg.caption || "[non-text message]",
        messageId: msg.message_id,
        sentAt: new Date(msg.date * 1000),
      };

      const saved = await TelegramMessage.create(payload);

      // Push to every connected dashboard client in real time
      io.emit("telegram:message", {
        _id: saved._id.toString(),
        ...payload,
        sentAt: payload.sentAt.toISOString(),
      });

      console.log(
        `[telegram] [${payload.chatTitle}] ${payload.fromUsername}: ${payload.text}`
      );

      // Only run screenshot-matching logic in the monitored groups
      if (!MONITORED_GROUPS.includes(chatId)) return;

      // NOTE: withdrawal requests are matched at creation time by the
      // dashboard (it posts the "Payout needed" card directly to the group
      // and sets status "matched"). The bot only watches for screenshots.

      // --- Screenshot -> OCR (via your OCR API) + UPI ID match against ANY
      // "matched" request in this group (not just the most recent one,
      // since multiple withdrawals can be awaiting proof at once) ---
      if (msg.photo) {
        const pendingMatches = await WithdrawRequest.find({
          status: "matched",
          telegramGroupId: chatId,
        }).sort({ matchedAt: -1 });

        if (!pendingMatches.length) {
          await ctx.telegram.sendMessage(
            chatId,
            "No matched request awaiting payment proof in this group."
          );
          return;
        }

        try {
          const fileId = msg.photo[msg.photo.length - 1].file_id;
          const fileLink = await ctx.telegram.getFileLink(fileId);
          const imgRes = await fetch(fileLink.href || fileLink);
          const buffer = Buffer.from(await imgRes.arrayBuffer());

          const extractedText = await extractTextFromImage(buffer);
          const extractedUpi = extractUpiFromText(extractedText);

          // Find the pending request whose stored UPI ID exactly matches
          // the UPI ID pulled from the screenshot.
          const match = extractedUpi
            ? pendingMatches.find(
                (candidate) => normalizeUpi(candidate.upiNumber) === extractedUpi
              )
            : null;

          if (match) {
            match.status = "paid";
            match.paidAt = new Date();
            match.screenshotFileId = fileId;
            await match.save();

            io.emit("withdraw:paid", {
              _id: match._id.toString(),
              amount: match.amount,
              upiNumber: match.upiNumber,
              refCode: match.refCode,
              paidAt: match.paidAt.toISOString(),
            });

            await ctx.telegram.sendMessage(
              chatId,
              `✅ Payment confirmed (₹${match.amount}) — UPI: ${match.upiNumber}`,
              { reply_to_message_id: msg.message_id }
            );
          } else if (!extractedUpi) {
            await ctx.telegram.sendMessage(
              chatId,
              `⚠️ Couldn't read a UPI ID from this screenshot. Please resend a clearer image.`,
              { reply_to_message_id: msg.message_id }
            );
          } else {
            await ctx.telegram.sendMessage(
              chatId,
              `⚠️ UPI ID "${extractedUpi}" doesn't match any pending request in this group.`,
              { reply_to_message_id: msg.message_id }
            );
          }
        } catch (err) {
          console.error("[telegram] OCR/match error:", err);
          await ctx.telegram.sendMessage(chatId, "Error reading screenshot. Try again.");
        }
      }
    } catch (err) {
      console.error("[telegram] failed to process message:", err);
    }
  });

  // Telegraf-wide error handler
  bot.catch((err) => {
    console.error("[telegram] bot error:", err.message);
  });

  bot.launch().catch((err) => {
    console.error("[telegram-bot] launch() failed:", err);
    process.exit(1);
  });
  console.log("[telegram-bot] Bot is polling for messages…");

  // Graceful shutdown
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((err) => {
  console.error("[telegram-bot] Fatal startup error:", err);
  process.exit(1);
});
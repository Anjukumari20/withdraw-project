require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const { Telegraf } = require("telegraf");
const { connectDB } = require("./db");
const TelegramMessage = require("./TelegramMessage");
const WithdrawRequest = require("./WithdrawRequest");
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
// upiId, upi) into one string and search all of it for the Ref code — this
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

// Standard Levenshtein edit distance (insertions/deletions/substitutions).
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

// Lowercases, strips anything that isn't a-z0-9, and fixes characters OCR
// commonly confuses with hex digits (our Ref is a 24-char hex ObjectId).
function normalizeForRefMatch(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/l/g, "1")
    .replace(/o/g, "0")
    .replace(/i/g, "1");
}

// Returns the best (smallest) Levenshtein distance found between the ref
// and any similarly-sized window of the OCR text. Infinity if nothing close.
function refMatchDistance(ocrText, ref) {
  if (!ocrText || !ref) return Infinity;

  const normalizedRef = normalizeForRefMatch(ref);
  const normalizedText = normalizeForRefMatch(ocrText);
  const refLen = normalizedRef.length;
  let best = Infinity;

  for (let winLen = refLen - 2; winLen <= refLen + 2; winLen++) {
    if (winLen <= 0) continue;
    for (let i = 0; i + winLen <= normalizedText.length; i++) {
      const window = normalizedText.slice(i, i + winLen);
      const d = levenshtein(window, normalizedRef);
      if (d < best) best = d;
    }
  }
  return best;
}

const REF_MATCH_THRESHOLD = 3; // allow up to 3 character edits

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

      console.log("DEBUG chatId:", chatId, "| MONITORED_GROUPS:", MONITORED_GROUPS);

      // Only run screenshot-matching logic in the monitored groups
      if (!MONITORED_GROUPS.includes(chatId)) return;

      // NOTE: withdrawal requests are matched at creation time by the
      // dashboard (it posts the "Payout needed" card directly to the group
      // and sets status "matched"). The bot only watches for screenshots.

      // --- Screenshot -> OCR (via your OCR API) + Ref match against ANY
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

          let best = null;
          let bestDistance = Infinity;
          for (const candidate of pendingMatches) {
            const d = refMatchDistance(extractedText, candidate.refCode);
            if (d < bestDistance) {
              bestDistance = d;
              best = candidate;
            }
          }

          if (best && bestDistance <= REF_MATCH_THRESHOLD) {
            best.status = "paid";
            best.paidAt = new Date();
            best.screenshotFileId = fileId;
            await best.save();

            io.emit("withdraw:paid", {
              _id: best._id.toString(),
              amount: best.amount,
              upiNumber: best.upiNumber,
              paidAt: best.paidAt.toISOString(),
            });

            await ctx.telegram.sendMessage(
              chatId,
              `✅ Payment confirmed (₹${best.amount}) — Ref: ${best.refCode}`,
              { reply_to_message_id: msg.message_id }
            );
          } else {
            await ctx.telegram.sendMessage(
              chatId,
              `⚠️ Couldn't match this screenshot to any pending request. Please re-check and resend.`,
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
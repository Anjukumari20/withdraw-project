const { Telegraf } = require("telegraf");
const Lead = require("./Lead");

/**
 * Starts the lead-collection Telegram bot.
 * Walks a user through /start -> name -> email -> mobile, then saves a Lead.
 * This is a SEPARATE bot/token from the group-message-reading bot in
 * server.js — Telegram only allows one active long-polling connection per
 * token, so each bot needs its own @BotFather token.
 */
function startLeadBot() {
  const token = process.env.LEAD_BOT_TOKEN;

  if (!token) {
    console.log(
      "[lead-bot] LEAD_BOT_TOKEN is not set — lead bot will not start. (This is fine if you're not using it yet.)"
    );
    return null;
  }

  const bot = new Telegraf(token);

  // In-memory session per Telegram user. Fine for a single-process bot;
  // sessions are lost on restart, which just means an in-progress
  // conversation has to start over with /start.
  const sessions = {};

  bot.start((ctx) => {
    const userId = ctx.from.id.toString();
    sessions[userId] = { step: "name" };
    ctx.reply(
      `👋 Welcome to the Lead Collection Bot!\n\nPlease enter your *Full Name*:`,
      { parse_mode: "Markdown" }
    );
  });

  bot.on("text", async (ctx) => {
    const userId = ctx.from.id.toString();
    const userInput = ctx.message.text.trim();
    const session = sessions[userId];

    if (!session) {
      return ctx.reply("Please type /start to begin.");
    }

    if (session.step === "name") {
      session.name = userInput;
      session.step = "email";
      return ctx.reply("✅ Got it! Now please enter your *Email Address*:", {
        parse_mode: "Markdown",
      });
    }

    if (session.step === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userInput)) {
        return ctx.reply("❌ Invalid email. Please enter a valid email address:");
      }
      session.email = userInput;
      session.step = "mobile";
      return ctx.reply("✅ Got it! Now please enter your *Mobile Number*:", {
        parse_mode: "Markdown",
      });
    }

    if (session.step === "mobile") {
      const mobileRegex = /^\d{10,}$/;
      if (!mobileRegex.test(userInput)) {
        return ctx.reply(
          "❌ Invalid mobile number. It must be numeric and at least 10 digits. Try again:"
        );
      }
      session.mobile = userInput;

      try {
        const existing = await Lead.findOne({ email: session.email });
        if (existing) {
          delete sessions[userId];
          return ctx.reply(
            "⚠️ This email is already registered. Use /start to try again with a different email."
          );
        }

        const newLead = await Lead.create({
          name: session.name,
          email: session.email,
          mobile: session.mobile,
          telegramId: userId,
        });

        delete sessions[userId];

        console.log(`[lead-bot] New lead saved: ${newLead.email}`);

        return ctx.reply(
          `🎉 *Thank you, ${session.name}!*\n\nYour details have been saved successfully.\n\n` +
            `📋 *Summary:*\n` +
            `👤 Name: ${session.name}\n` +
            `📧 Email: ${session.email}\n` +
            `📱 Mobile: ${session.mobile}`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("[lead-bot] DB error:", error.message);
        delete sessions[userId];
        return ctx.reply(
          "❌ Something went wrong while saving. Please try again with /start"
        );
      }
    }
  });

  bot.launch();
  console.log("[lead-bot] Lead collection bot started (polling)");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  return bot;
}

module.exports = startLeadBot;

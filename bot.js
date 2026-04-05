const TelegramBot = require("node-telegram-bot-api");
const Anthropic = require("@anthropic-ai/sdk");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Store user modes
const userModes = {};

const MODES = {
  correct: "✏️ תיקון טקסט",
  explain: "📖 הסבר כלל",
  practice: "🎯 תרגיל",
};

function getSystemPrompt(mode) {
  const base = `אתה מורה לעברית מומחה, ידידותי ומעודד. תמיד תגיב בעברית בלבד. השתמש באמוג'י במידה. הודעות קצרות וברורות.`;

  if (mode === "correct")
    return `${base}
כשמשתמש שולח משפט:
1. בדוק שגיאות כתיב, דקדוק, מבנה משפט
2. הצג את הטקסט המתוקן
3. פרט כל שגיאה ומה הכלל
4. תן ציון 1-10
5. טיפ קצר לשיפור
אם אין שגיאות – שבח את המשתמש!`;

  if (mode === "explain")
    return `${base}
כשמשתמש שואל על כלל דקדוק:
1. הסבר את הכלל בפשטות
2. תן 2-3 דוגמאות נכונות ולא נכונות
3. ציין חריגים נפוצים`;

  if (mode === "practice")
    return `${base}
תן תרגיל דקדוק מעניין. כלול הוראות ברורות ו-3 שאלות.
כשמשתמש עונה – תקן והסבר בעדינות.`;

  return base;
}

// /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userModes[chatId] = "correct";

  bot.sendMessage(
    chatId,
    `שלום! אני המורה לעברית שלך 📚🇮🇱

אני יכול לעזור לך ב:
✅ *תיקון משפטים* שכתבת
✅ *הסבר כללי דקדוק*
✅ *תרגילים* לשיפור הכתיבה

פשוט שלח לי משפט ואתחיל לתקן!

השתמש בתפריט למטה לשינוי מצב 👇`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [
          ["✏️ תיקון טקסט", "📖 הסבר כלל", "🎯 תרגיל"],
          ["❓ עזרה"],
        ],
        resize_keyboard: true,
      },
    }
  );
});

// /help command
bot.onText(/\/help|❓ עזרה/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `*איך להשתמש בבוט:*

✏️ *תיקון טקסט* – שלח משפט ואתקן שגיאות
📖 *הסבר כלל* – שאל שאלה על דקדוק
🎯 *תרגיל* – קבל תרגיל לתרגול

*דוגמאות:*
• "תוכל לתקן: אני הולך לבית ספר"
• "מה ההבדל בין ב' ל-כ'?"
• "תן לי תרגיל על פעלים"`,
    { parse_mode: "Markdown" }
  );
});

// Mode switching
bot.onText(/✏️ תיקון טקסט/, (msg) => {
  userModes[msg.chat.id] = "correct";
  bot.sendMessage(msg.chat.id, "✏️ *מצב תיקון טקסט*\nשלח לי משפט ואתקן אותו!", { parse_mode: "Markdown" });
});

bot.onText(/📖 הסבר כלל/, (msg) => {
  userModes[msg.chat.id] = "explain";
  bot.sendMessage(msg.chat.id, "📖 *מצב הסבר כלל*\nשאל אותי כל שאלה על דקדוק עברי!", { parse_mode: "Markdown" });
});

bot.onText(/🎯 תרגיל/, (msg) => {
  userModes[msg.chat.id] = "practice";
  bot.sendMessage(msg.chat.id, "🎯 *מצב תרגיל*\nאיזה נושא לתרגל? (פעלים, כינויים, שמות עצם...)", { parse_mode: "Markdown" });
});

// Handle all other messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Skip commands and keyboard buttons
  if (!text || text.startsWith("/") || Object.values(MODES).includes(text) || text === "❓ עזרה") return;

  const mode = userModes[chatId] || "correct";

  // Show typing indicator
  bot.sendChatAction(chatId, "typing");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: getSystemPrompt(mode),
      messages: [{ role: "user", content: text }],
    });

    const reply = response.content[0].text;
    bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ משהו השתבש. נסה שוב בעוד רגע.");
  }
});

console.log("🤖 בוט העברית פועל!");

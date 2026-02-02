import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

if (!TG_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");
if (!TG_SECRET) throw new Error("Missing TELEGRAM_WEBHOOK_SECRET");
if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

const ai = new GoogleGenAI({});

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.post("/webhook", (req, res) => {
  const got = req.get("X-Telegram-Bot-Api-Secret-Token");
  if (got !== TG_SECRET) return res.sendStatus(401);

  res.sendStatus(200);
  void handleUpdate(req.body).catch((e) => console.error("handleUpdate error:", e));
});

async function handleUpdate(update) {
  const msg = update?.message;
  const text = msg?.text;
  const chatId = msg?.chat?.id;

  if (!chatId || !text) return;

  if (text === "/start") {
    await sendTelegramMessage(chatId, "已連線。直接輸入文字即可。");
    return;
  }

  const resp = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: text,
  });

  const reply = (resp?.text || "").trim() || "（無輸出）";
  await sendTelegramMessage(chatId, reply);
}

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!r.ok) {
    const data = await r.json().catch(() => null);
    console.error("sendMessage failed:", r.status, data);
  }
}

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

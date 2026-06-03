const express = require("express");
const line = require("@line/bot-sdk");
const OpenAI = require("openai");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const userMode = {};

function getUserKey(event) {
  return event.source.userId || event.source.groupId || event.source.roomId;
}

function menuFlex() {
  return {
    type: "flex",
    altText: "選擇翻譯模式",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "🌏 GPT 雙向翻譯", weight: "bold", size: "xl", align: "center" },
          { type: "button", action: { type: "message", label: "🇹🇭 中泰雙向", text: "設定 中泰" } },
          { type: "button", action: { type: "message", label: "🇻🇳 中越雙向", text: "設定 中越" } },
          { type: "button", action: { type: "message", label: "🇺🇸 中英雙向", text: "設定 中英" } },
          { type: "button", style: "primary", action: { type: "message", label: "🌍 多國翻譯", text: "設定 多國" } }
        ]
      }
    }
  };
}

async function replyText(event, text) {
  return client.replyMessage(event.replyToken, { type: "text", text });
}

async function gptTranslate(text, mode) {
  let instruction = "";

  if (mode === "zh-th") {
    instruction = "你是專業中文泰文雙向翻譯。若輸入是中文，翻成自然泰文；若輸入是泰文，翻成自然繁體中文。只輸出翻譯結果。";
  } else if (mode === "zh-vi") {
    instruction = "你是專業中文越南文雙向翻譯。若輸入是中文，翻成自然越南文；若輸入是越南文，翻成自然繁體中文。只輸出翻譯結果。";
  } else if (mode === "zh-en") {
    instruction = "你是專業中文英文雙向翻譯。若輸入是中文，翻成自然英文；若輸入是英文，翻成自然繁體中文。只輸出翻譯結果。";
  } else if (mode === "multi") {
    instruction = "請把使用者文字翻譯成泰文、越南文、英文、繁體中文。格式：🇹🇭 泰文：...\n\n🇻🇳 越文：...\n\n🇺🇸 英文：...\n\n🇹🇼 中文：...。只輸出翻譯結果。";
  }

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: instruction },
      { role: "user", content: text }
    ]
  });

  return response.output_text.trim();
}

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const event = req.body.events[0];

    if (!event || event.type !== "message" || event.message.type !== "text") {
      return res.status(200).end();
    }

    const text = event.message.text.trim();
    const key = getUserKey(event);

    if (text === "選單" || text === "menu" || text === "開始" || text === "?") {
      await client.replyMessage(event.replyToken, menuFlex());
      return res.status(200).end();
    }

    if (text === "設定 中泰") {
      userMode[key] = "zh-th";
      await replyText(event, "已切換：GPT 中泰雙向 🇹🇼↔️🇹🇭");
      return res.status(200).end();
    }

    if (text === "設定 中越") {
      userMode[key] = "zh-vi";
      await replyText(event, "已切換：GPT 中越雙向 🇹🇼↔️🇻🇳");
      return res.status(200).end();
    }

    if (text === "設定 中英") {
      userMode[key] = "zh-en";
      await replyText(event, "已切換：GPT 中英雙向 🇹🇼↔️🇺🇸");
      return res.status(200).end();
    }

    if (text === "設定 多國") {
      userMode[key] = "multi";
      await replyText(event, "已切換：GPT 多國翻譯 🌍");
      return res.status(200).end();
    }

    const mode = userMode[key] || "zh-th";

    const translated = await gptTranslate(text, mode);
    await replyText(event, translated);

    return res.status(200).end();

  } catch (err) {
    console.error(err);
    return res.status(200).end();
  }
});

app.get("/", (req, res) => {
  res.send("LINE GPT Translator Bot Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

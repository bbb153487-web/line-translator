const express = require("express");
const line = require("@line/bot-sdk");
const { Translate } = require("@google-cloud/translate").v2;

const app = express();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
const translate = new Translate({ key: process.env.GOOGLE_API_KEY });

const userMode = {};

function getUserKey(event) {
  return event.source.groupId || event.source.roomId || event.source.userId;
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
          {
            type: "text",
            text: "🌏 雙向翻譯",
            weight: "bold",
            size: "xl",
            align: "center"
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇹🇭 中泰雙向",
              text: "設定 中泰"
            }
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇻🇳 中越雙向",
              text: "設定 中越"
            }
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇺🇸 中英雙向",
              text: "設定 中英"
            }
          },
          {
            type: "button",
            style: "primary",
            action: {
              type: "message",
              label: "🌍 多國翻譯",
              text: "設定 多國"
            }
          }
        ]
      }
    }
  };
}

async function replyText(event, text) {
  return client.replyMessage(event.replyToken, {
    type: "text",
    text
  });
}

async function detectLanguage(text) {
  const [detect] = await translate.detect(text);
  return detect.language;
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
      await replyText(event, "已切換：中泰雙向 🇹🇼↔️🇹🇭\n中文會翻泰文，泰文會翻中文");
      return res.status(200).end();
    }

    if (text === "設定 中越") {
      userMode[key] = "zh-vi";
      await replyText(event, "已切換：中越雙向 🇹🇼↔️🇻🇳\n中文會翻越文，越文會翻中文");
      return res.status(200).end();
    }

    if (text === "設定 中英") {
      userMode[key] = "zh-en";
      await replyText(event, "已切換：中英雙向 🇹🇼↔️🇺🇸\n中文會翻英文，英文會翻中文");
      return res.status(200).end();
    }

    if (text === "設定 多國") {
      userMode[key] = "multi";
      await replyText(event, "已切換：多國翻譯 🌍\n中文會翻泰文、越文、英文");
      return res.status(200).end();
    }

    const mode = userMode[key];

    if (!mode) {
      await client.replyMessage(event.replyToken, menuFlex());
      return res.status(200).end();
    }

    if (mode === "multi") {
      const [th] = await translate.translate(text, "th");
      const [vi] = await translate.translate(text, "vi");
      const [en] = await translate.translate(text, "en");

      await replyText(
        event,
        `🇹🇭 泰文：${th}\n\n🇻🇳 越文：${vi}\n\n🇺🇸 英文：${en}`
      );

      return res.status(200).end();
    }

    const lang = await detectLanguage(text);

    let target = "zh-TW";

    if (mode === "zh-th") {
      target = lang.includes("zh") ? "th" : "zh-TW";
    }

    if (mode === "zh-vi") {
      target = lang.includes("zh") ? "vi" : "zh-TW";
    }

    if (mode === "zh-en") {
      target = lang.includes("zh") ? "en" : "zh-TW";
    }

    const [translated] = await translate.translate(text, target);
    await replyText(event, translated);

    return res.status(200).end();

  } catch (err) {
    console.error(err);
    return res.status(200).end();
  }
});

app.get("/", (req, res) => {
  res.send("LINE Translator Bot Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

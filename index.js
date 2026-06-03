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
    altText: "選擇語言",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "🌏 多國翻譯", weight: "bold", size: "xl" },
          { type: "button", action: { type: "message", label: "🇹🇭 泰文", text: "設定 泰文" } },
          { type: "button", action: { type: "message", label: "🇻🇳 越文", text: "設定 越文" } },
          { type: "button", action: { type: "message", label: "🇺🇸 英文", text: "設定 英文" } },
          { type: "button", action: { type: "message", label: "🇨🇳 中文", text: "設定 中文" } },
          { type: "button", style: "primary", action: { type: "message", label: "🌍 多國翻譯", text: "設定 多國" } }
        ]
      }
    }
  };
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

    if (text === "設定 泰文") {
      userMode[key] = "th";
      await client.replyMessage(event.replyToken, { type: "text", text: "已切換泰文模式 🇹🇭\n請直接輸入要翻譯的文字" });
      return res.status(200).end();
    }

    if (text === "設定 越文") {
      userMode[key] = "vi";
      await client.replyMessage(event.replyToken, { type: "text", text: "已切換越文模式 🇻🇳\n請直接輸入要翻譯的文字" });
      return res.status(200).end();
    }

    if (text === "設定 英文") {
      userMode[key] = "en";
      await client.replyMessage(event.replyToken, { type: "text", text: "已切換英文模式 🇺🇸\n請直接輸入要翻譯的文字" });
      return res.status(200).end();
    }

    if (text === "設定 中文") {
      userMode[key] = "zh-TW";
      await client.replyMessage(event.replyToken, { type: "text", text: "已切換中文模式 🇹🇼\n請直接輸入要翻譯的文字" });
      return res.status(200).end();
    }

    if (text === "設定 多國") {
      userMode[key] = "multi";
      await client.replyMessage(event.replyToken, { type: "text", text: "已切換多國模式 🌍\n請直接輸入要翻譯的文字" });
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
      const [zh] = await translate.translate(text, "zh-TW");

      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `🇹🇭 泰文：${th}\n\n🇻🇳 越文：${vi}\n\n🇺🇸 英文：${en}\n\n🇹🇼 中文：${zh}`
      });
      return res.status(200).end();
    }

    const [translated] = await translate.translate(text, mode);

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: translated
    });

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

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
          {
            type: "text",
            text: "🌏 多國翻譯",
            weight: "bold",
            size: "xl",
            align: "center"
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇹🇭 翻成泰文",
              text: "設定 泰文"
            }
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇻🇳 翻成越文",
              text: "設定 越文"
            }
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇺🇸 翻成英文",
              text: "設定 英文"
            }
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇹🇼 翻成中文",
              text: "設定 中文"
            }
          },
          {
            type: "separator",
            margin: "md"
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇹🇭➡️🇹🇼 泰翻中",
              text: "設定 泰翻中"
            }
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇻🇳➡️🇹🇼 越翻中",
              text: "設定 越翻中"
            }
          },
          {
            type: "button",
            action: {
              type: "message",
              label: "🇺🇸➡️🇹🇼 英翻中",
              text: "設定 英翻中"
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

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const event = req.body.events[0];

    if (!event || event.type !== "message" || event.message.type !== "text") {
      return res.status(200).end();
    }

    const text = event.message.text.trim();
    const key = getUserKey(event);

    if (
      text === "選單" ||
      text === "menu" ||
      text === "開始" ||
      text === "?"
    ) {
      await client.replyMessage(event.replyToken, menuFlex());
      return res.status(200).end();
    }

    if (text === "設定 泰文") {
      userMode[key] = "th";
      await replyText(event, "已切換：翻成泰文 🇹🇭\n請直接輸入要翻譯的文字");
      return res.status(200).end();
    }

    if (text === "設定 越文") {
      userMode[key] = "vi";
      await replyText(event, "已切換：翻成越文 🇻🇳\n請直接輸入要翻譯的文字");
      return res.status(200).end();
    }

    if (text === "設定 英文") {
      userMode[key] = "en";
      await replyText(event, "已切換：翻成英文 🇺🇸\n請直接輸入要翻譯的文字");
      return res.status(200).end();
    }

    if (text === "設定 中文") {
      userMode[key] = "zh-TW";
      await replyText(event, "已切換：翻成中文 🇹🇼\n請直接輸入要翻譯的文字");
      return res.status(200).end();
    }

    if (text === "設定 泰翻中") {
      userMode[key] = "thai2zh";
      await replyText(event, "已切換：泰文翻中文 🇹🇭➡️🇹🇼\n請直接輸入泰文");
      return res.status(200).end();
    }

    if (text === "設定 越翻中") {
      userMode[key] = "viet2zh";
      await replyText(event, "已切換：越文翻中文 🇻🇳➡️🇹🇼\n請直接輸入越文");
      return res.status(200).end();
    }

    if (text === "設定 英翻中") {
      userMode[key] = "eng2zh";
      await replyText(event, "已切換：英文翻中文 🇺🇸➡️🇹🇼\n請直接輸入英文");
      return res.status(200).end();
    }

    if (text === "設定 多國") {
      userMode[key] = "multi";
      await replyText(event, "已切換：多國翻譯 🌍\n請直接輸入要翻譯的文字");
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

      await replyText(
        event,
        `🇹🇭 泰文：${th}\n\n🇻🇳 越文：${vi}\n\n🇺🇸 英文：${en}\n\n🇹🇼 中文：${zh}`
      );

      return res.status(200).end();
    }

    if (
      mode === "thai2zh" ||
      mode === "viet2zh" ||
      mode === "eng2zh"
    ) {
      const [translated] = await translate.translate(text, "zh-TW");
      await replyText(event, translated);
      return res.status(200).end();
    }

    const [translated] = await translate.translate(text, mode);
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

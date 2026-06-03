const express = require("express");
const line = require("@line/bot-sdk");
const { Translate } = require("@google-cloud/translate").v2;

const app = express();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

const translate = new Translate({
  key: process.env.GOOGLE_API_KEY
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {

    const event = req.body.events[0];

    if (!event) {
      return res.status(200).end();
    }

    if (event.type !== "message" || event.message.type !== "text") {
      return res.status(200).end();
    }

    const text = event.message.text.trim();

    const flex = {
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
              size: "xl"
            },
            {
              type: "button",
              action: {
                type: "message",
                label: "🇹🇭 泰文",
                text: "設定 泰文"
              }
            },
            {
              type: "button",
              action: {
                type: "message",
                label: "🇻🇳 越文",
                text: "設定 越文"
              }
            },
            {
              type: "button",
              action: {
                type: "message",
                label: "🇺🇸 英文",
                text: "設定 英文"
              }
            },
            {
              type: "button",
              action: {
                type: "message",
                label: "🇨🇳 中文",
                text: "設定 中文"
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

    if (
      text === "menu" ||
      text === "選單" ||
      text === "開始"
    ) {
      await client.replyMessage(event.replyToken, flex);
      return res.status(200).end();
    }

    if (text === "設定 泰文") {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入：泰文 你好"
      });
      return res.status(200).end();
    }

    if (text === "設定 越文") {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入：越文 你好"
      });
      return res.status(200).end();
    }

    if (text === "設定 英文") {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入：英文 你好"
      });
      return res.status(200).end();
    }

    if (text === "設定 中文") {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入：中文 hello"
      });
      return res.status(200).end();
    }

    if (text === "設定 多國") {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入：多國 你好"
      });
      return res.status(200).end();
    }

    let target = "";
    let content = "";

    if (text.startsWith("泰文 ")) {
      target = "th";
      content = text.replace("泰文 ", "");
    }
    else if (text.startsWith("越文 ")) {
      target = "vi";
      content = text.replace("越文 ", "");
    }
    else if (text.startsWith("英文 ")) {
      target = "en";
      content = text.replace("英文 ", "");
    }
    else if (text.startsWith("中文 ")) {
      target = "zh-TW";
      content = text.replace("中文 ", "");
    }
    else if (text.startsWith("多國 ")) {

      content = text.replace("多國 ", "");

      const [th] = await translate.translate(content, "th");
      const [vi] = await translate.translate(content, "vi");
      const [en] = await translate.translate(content, "en");

      await client.replyMessage(event.replyToken, {
        type: "text",
        text:
`🇹🇭 泰文：
${th}

🇻🇳 越文：
${vi}

🇺🇸 英文：
${en}`
      });

      return res.status(200).end();
    }
    else {

      await client.replyMessage(event.replyToken, flex);

      return res.status(200).end();
    }

    const [translated] = await translate.translate(content, target);

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

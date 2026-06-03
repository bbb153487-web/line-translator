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

// 暫時記住每個使用者選的語言
const userMode = {};

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const event = req.body.events[0];

    if (event.type !== "message" || event.message.type !== "text") {
      return res.status(200).end();
    }

    const userId = event.source.userId;
    const text = event.message.text.trim();

    if (text === "泰文") {
      userMode[userId] = "th";
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "已切換：泰文翻譯模式\n請輸入要翻譯的內容"
      });
      return res.status(200).end();
    }

    if (text === "越文") {
      userMode[userId] = "vi";
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "已切換：越文翻譯模式\n請輸入要翻譯的內容"
      });
      return res.status(200).end();
    }

    if (text === "英文") {
      userMode[userId] = "en";
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "已切換：英文翻譯模式\n請輸入要翻譯的內容"
      });
      return res.status(200).end();
    }

    if (text === "中文") {
      userMode[userId] = "zh-TW";
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "已切換：中文翻譯模式\n請輸入要翻譯的內容"
      });
      return res.status(200).end();
    }

    if (text === "多國") {
      userMode[userId] = "multi";
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "已切換：多國翻譯模式\n請輸入要翻譯的內容"
      });
      return res.status(200).end();
    }

    const mode = userMode[userId];

    if (!mode) {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先點選下方選單：泰文、越文、英文、中文或多國"
      });
      return res.status(200).end();
    }

    if (mode === "multi") {
      const [th] = await translate.translate(text, "th");
      const [vi] = await translate.translate(text, "vi");
      const [en] = await translate.translate(text, "en");
      const [zh] = await translate.translate(text, "zh-TW");

      await client.replyMessage(event.replyToken, {
        type: "text",
        text: `泰文：${th}\n\n越文：${vi}\n\n英文：${en}\n\n中文：${zh}`
      });
      return res.status(200).end();
    }

    const [translated] = await translate.translate(text, mode);

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: translated
    });

    res.status(200).end();

  } catch (err) {
    console.log(err);
    res.status(200).end();
  }
});

app.get("/", (req, res) => {
  res.send("LINE Translator Bot Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

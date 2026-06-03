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

const userMode = {};

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const event = req.body.events[0];

    if (event.type !== "message" || event.message.type !== "text") {
      return res.status(200).end();
    }

    const userId = event.source.userId || event.source.groupId || event.source.roomId;
    const text = event.message.text.trim();

    if (text === "泰文") {
      userMode[userId] = "th";
      await reply(event, "已切換成泰文模式 🇹🇭\n請直接輸入要翻譯的內容");
      return res.status(200).end();
    }

    if (text === "越文") {
      userMode[userId] = "vi";
      await reply(event, "已切換成越文模式 🇻🇳\n請直接輸入要翻譯的內容");
      return res.status(200).end();
    }

    if (text === "英文") {
      userMode[userId] = "en";
      await reply(event, "已切換成英文模式 🇺🇸\n請直接輸入要翻譯的內容");
      return res.status(200).end();
    }

    if (text === "中文") {
      userMode[userId] = "zh-TW";
      await reply(event, "已切換成中文模式 🇹🇼\n請直接輸入要翻譯的內容");
      return res.status(200).end();
    }

    if (text === "多國") {
      userMode[userId] = "multi";
      await reply(event, "已切換成多國翻譯模式 🌍\n請直接輸入要翻譯的內容");
      return res.status(200).end();
    }

    const mode = userMode[userId];

    if (!mode) {
      await reply(event, "請先點選下方選單：泰文、越文、英文、中文或多國");
      return res.status(200).end();
    }

    if (mode === "multi") {
      const [th] = await translate.translate(text, "th");
      const [vi] = await translate.translate(text, "vi");
      const [en] = await translate.translate(text, "en");
      const [zh] = await translate.translate(text, "zh-TW");

      await reply(event, `泰文 🇹🇭：${th}\n\n越文 🇻🇳：${vi}\n\n英文 🇺🇸：${en}\n\n中文 🇹🇼：${zh}`);
      return res.status(200).end();
    }

    const [translated] = await translate.translate(text, mode);
    await reply(event, translated);

    res.status(200).end();

  } catch (err) {
    console.log(err);
    res.status(200).end();
  }
});

function reply(event, text) {
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: text
  });
}

app.get("/", (req, res) => {
  res.send("LINE Translator Bot Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

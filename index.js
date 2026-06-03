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

    if (event.type !== "message" || event.message.type !== "text") {
      return res.status(200).end();
    }

    const text = event.message.text;
    const [detect] = await translate.detect(text);
    const lang = detect.language;

    let reply = "";

    if (lang.includes("zh")) {
      const [th] = await translate.translate(text, "th");
      const [vi] = await translate.translate(text, "vi");
      const [en] = await translate.translate(text, "en");

      reply = `泰文：${th}\n越文：${vi}\n英文：${en}`;
    } else {
      const [zh] = await translate.translate(text, "zh-TW");
      reply = `中文：${zh}`;
    }

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: reply
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

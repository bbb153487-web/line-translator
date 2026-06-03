const express = require("express");
const line = require("@line/bot-sdk");
const { Translate } = require("@google-cloud/translate").v2;

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

const translate = new Translate({
  key: process.env.GOOGLE_API_KEY
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const event = req.body.events[0];

    if (event.type !== "message" ||!event.message || event.message.type !== "text") {
      return res.status(200).end();
    }

    const userText = event.message.text;

    const [translated] = await translate.translate(userText, "zh-TW");

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: translated
    });

    res.status(200).end();

  } catch (err) {
    console.log(err);
    res.status(500).end();
  }
});

app.get("/", (req, res) => {
  res.send("LINE Translator Bot Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});

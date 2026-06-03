const express = require("express");
const line = require("@line/bot-sdk");
const { Translate } = require("@google-cloud/translate").v2;

const app = express();

const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

const translate = new Translate({
  key: process.env.GOOGLE_API_KEY,
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const text = event.message.text;

  const [detect] = await translate.detect(text);
  const lang = detect.language;

  let reply = "";

  if (lang.includes("zh")) {
    const [th] = await translate.translate(text, "th");
    const [vi] = await translate.translate(text, "vi");

    reply =
`泰文：
${th}

越文：
${vi}`;
  } else {
    const [zh] = await translate.translate(text, "zh-TW");

    reply =
`中文：
${zh}`;
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: reply,
  });
}

app.listen(process.env.PORT || 3000, () => {
  console.log("running...");
});

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
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "🌏 多語翻譯",
            weight: "bold",
            size: "xl",
            align: "center"
          },
          { type: "button", action: { type: "message", label: "🇹🇭 中泰翻譯", text: "設定 中泰" } },
          { type: "button", action: { type: "message", label: "🇻🇳 中越翻譯", text: "設定 中越" } },
          { type: "button", action: { type: "message", label: "🇺🇸 中英翻譯", text: "設定 中英" } },
          { type: "button", action: { type: "message", label: "🇯🇵 中日翻譯", text: "設定 中日" } },
          { type: "button", action: { type: "message", label: "🇰🇷 中韓翻譯", text: "設定 中韓" } },
          { type: "button", action: { type: "message", label: "🇵🇭 中菲翻譯", text: "設定 中菲" } },
          { type: "button", action: { type: "message", label: "🇲🇲 中緬翻譯", text: "設定 中緬" } },
          { type: "button", action: { type: "message", label: "🇷🇺 中俄翻譯", text: "設定 中俄" } },
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
const DEFAULT_LANGUAGE = "zh-TW";
async function gptTranslate(text, mode) {
  const instructions = {
  "auto": `
你是專業口語翻譯機，使用在 LINE 群組與私人聊天。

翻譯規則：

1. 自動偵測輸入語言。
2. 中文（繁體、簡體）翻譯成自然英文。
3. 泰文、越南文、英文、日文、韓文、菲律賓文(Tagalog)、緬甸文、俄文翻譯成自然繁體中文。
4. 保留原本語氣與情緒，例如撒嬌、生氣、客氣、命令、玩笑。
5. 不要逐字翻譯，要翻成當地人實際會說的自然口語。
6. 人名、地名、店名、公司名、日期、時間、數字、金額不可任意修改。
7. 不確定的專有名詞可保留原文。
8. 不要解釋翻譯內容。
9. 不要加括號。
10. 不要加註解。
11. 不要顯示語言名稱。
12. 不要補充額外資訊。
13. 如果輸入已經是目標語言，直接原樣輸出，不要重複翻譯。

只輸出翻譯結果。
`,

  "zh-th": "你是專業中文泰文雙向翻譯。若輸入是中文，翻成自然泰文；若輸入是泰文，翻成自然繁體中文。只輸出翻譯結果。",
  "zh-vi": "你是專業中文越南文雙向翻譯。若輸入是中文，翻成自然越南文；若輸入是越南文，翻成自然繁體中文。只輸出翻譯結果。",
  "zh-en": "你是專業中文英文雙向翻譯。若輸入是中文，翻成自然英文；若輸入是英文，翻成自然繁體中文。只輸出翻譯結果。",
  "zh-ja": "你是專業中文日文雙向翻譯。若輸入是中文，翻成自然日文；若輸入是日文，翻成自然繁體中文。只輸出翻譯結果。",
  "zh-ko": "你是專業中文韓文雙向翻譯。若輸入是中文，翻成自然韓文；若輸入是韓文，翻成自然繁體中文。只輸出翻譯結果。",
  "zh-tl": "你是專業中文菲律賓文 Tagalog 雙向翻譯。若輸入是中文，翻成自然菲律賓文 Tagalog；若輸入是菲律賓文 Tagalog，翻成自然繁體中文。只輸出翻譯結果。",
  "zh-my": "你是專業中文緬甸文雙向翻譯。若輸入是中文，翻成自然緬甸文；若輸入是緬甸文，翻成自然繁體中文。只輸出翻譯結果。",
  "zh-ru": "你是專業中文俄文雙向翻譯。若輸入是中文，翻成自然俄文；若輸入是俄文，翻成自然繁體中文。只輸出翻譯結果。",
  "multi": "請把使用者文字翻譯成泰文、越南文、英文、日文、韓文、菲律賓文Tagalog、緬甸文、俄文、繁體中文。只輸出翻譯結果。"
};

  const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      {
        role: "system",
        content: instructions[mode]
      },
      {
        role: "user",
        content: text
      }
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
      await replyText(event, "已切換：中泰翻譯 🇹🇼↔️🇹🇭");
      return res.status(200).end();
    }

    if (text === "設定 中越") {
      userMode[key] = "zh-vi";
      await replyText(event, "已切換：中越翻譯 🇹🇼↔️🇻🇳");
      return res.status(200).end();
    }

    if (text === "設定 中英") {
      userMode[key] = "zh-en";
      await replyText(event, "已切換：中英翻譯 🇹🇼↔️🇺🇸");
      return res.status(200).end();
    }

    if (text === "設定 中日") {
      userMode[key] = "zh-ja";
      await replyText(event, "已切換：中日翻譯 🇹🇼↔️🇯🇵");
      return res.status(200).end();
    }

    if (text === "設定 中韓") {
      userMode[key] = "zh-ko";
      await replyText(event, "已切換：中韓翻譯 🇹🇼↔️🇰🇷");
      return res.status(200).end();
    }

    if (text === "設定 中菲") {
      userMode[key] = "zh-tl";
      await replyText(event, "已切換：中菲翻譯 🇹🇼↔️🇵🇭");
      return res.status(200).end();
    }

    if (text === "設定 中緬") {
      userMode[key] = "zh-my";
      await replyText(event, "已切換：中緬翻譯 🇹🇼↔️🇲🇲");
      return res.status(200).end();
    }

    if (text === "設定 中俄") {
      userMode[key] = "zh-ru";
      await replyText(event, "已切換：中俄翻譯 🇹🇼↔️🇷🇺");
      return res.status(200).end();
    }

    if (text === "設定 多國") {
      userMode[key] = "multi";
      await replyText(event, "已切換： 多國翻譯 🌍");
      return res.status(200).end();
    }

    const mode = userMode[key] || "auto";

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

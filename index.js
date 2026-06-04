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
const appUsage = {};

const FREE_DAILY_LIMIT = 20;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function checkDailyLimit(userId) {
  const today = todayKey();

  if (!appUsage[userId]) {
    appUsage[userId] = {
      date: today,
      count: 0
    };
  }

  if (appUsage[userId].date !== today) {
    appUsage[userId] = {
      date: today,
      count: 0
    };
  }

  if (appUsage[userId].count >= FREE_DAILY_LIMIT) {
    return false;
  }

  appUsage[userId].count += 1;
  return true;
}

function getRemainingCount(userId) {
  const today = todayKey();

  if (!appUsage[userId] || appUsage[userId].date !== today) {
    return FREE_DAILY_LIMIT;
  }

  return Math.max(0, FREE_DAILY_LIMIT - appUsage[userId].count);
}

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
          { type: "text", text: "🌏 MO 自動翻譯", weight: "bold", size: "xl", align: "center" },
          { type: "button", action: { type: "message", label: "🤖 自動翻譯", text: "設定 自動" } },
          { type: "button", action: { type: "message", label: "🇹🇭 中泰雙向", text: "設定 中泰" } },
          { type: "button", action: { type: "message", label: "🇻🇳 中越雙向", text: "設定 中越" } },
          { type: "button", action: { type: "message", label: "🇺🇸 中英雙向", text: "設定 中英" } },
          { type: "button", action: { type: "message", label: "🇯🇵 中日雙向", text: "設定 中日" } },
          { type: "button", action: { type: "message", label: "🇰🇷 中韓雙向", text: "設定 中韓" } },
          { type: "button", action: { type: "message", label: "🇵🇭 中菲雙向", text: "設定 中菲" } },
          { type: "button", action: { type: "message", label: "🇲🇲 中緬雙向", text: "設定 中緬" } },
          { type: "button", action: { type: "message", label: "🇷🇺 中俄雙向", text: "設定 中俄" } },
          { type: "button", style: "primary", action: { type: "message", label: "🌍 多國翻譯", text: "設定 多國" } }
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

async function gptTranslate(text, mode, targetLanguage) {
  const instructions = {
    auto: `
你是專業翻譯機。

規則：
1. 自動偵測輸入語言。
2. 中文翻譯成自然泰文。
3. 泰文、越南文、英文、日文、韓文、菲律賓文 Tagalog、緬甸文、俄文，一律翻譯成自然繁體中文。
4. 如果文字是人名、地名、店名、品牌名、數字、日期、時間、金額，請保留，不要亂改。
5. 保留原本語氣，例如客氣、生氣、撒嬌、命令、開玩笑。
6. 不要逐字硬翻，要翻成自然口語。
7. 不要解釋，不要加括號，不要加註解。
8. 如果是表情符號或無意義文字，不要翻譯，原樣輸出。
9. 只輸出翻譯結果。
`,
    "zh-th": "中文翻譯成自然泰文；泰文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-vi": "中文翻譯成自然越南文；越南文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-en": "中文翻譯成自然英文；英文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ja": "中文翻譯成自然日文；日文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ko": "中文翻譯成自然韓文；韓文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-tl": "中文翻譯成自然菲律賓文 Tagalog；菲律賓文 Tagalog 翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-my": "中文翻譯成自然緬甸文；緬甸文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ru": "中文翻譯成自然俄文；俄文翻譯成自然繁體中文。只輸出翻譯結果。",
    multi: `
請把使用者文字翻譯成以下語言，每種都要輸出：

🇹🇭 泰文：
🇻🇳 越文：
🇺🇸 英文：
🇯🇵 日文：
🇰🇷 韓文：
🇵🇭 菲律賓文：
🇲🇲 緬甸文：
🇷🇺 俄文：
🇹🇼 中文：

只輸出翻譯結果。
`,
    app: `你是專業翻譯 App。請把使用者文字翻譯成${targetLanguage}。
只輸出翻譯結果，不要解釋，不要加註解。`
  };

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: targetLanguage ? instructions.app : instructions[mode] || instructions.auto
      },
      {
        role: "user",
        content: text
      }
    ]
  });

  return response.output_text.trim();
}

app.post("/translate", express.json(), async (req, res) => {
  try {
    const {
      userId = "guest",
      text,
      targetLanguage = "繁體中文",
      isVip = false
    } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "缺少 text"
      });
    }

    if (!isVip) {
      const allowed = checkDailyLimit(userId);

      if (!allowed) {
        return res.status(429).json({
          error: "今日免費翻譯次數已用完",
          remaining: 0,
          limit: FREE_DAILY_LIMIT
        });
      }
    }

    const translatedText = await gptTranslate(text, "app", targetLanguage);

    return res.json({
      translatedText,
      remaining: isVip ? "VIP" : getRemainingCount(userId),
      limit: isVip ? "VIP" : FREE_DAILY_LIMIT
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "翻譯失敗"
    });
  }
});

app.post("/webhook", line.middleware(config), async (req, res) => {
    const event = req.body.events[0];

    if (!event || event.type !== "message" || event.message.type !== "text") {
      return res.status(200).end();
    }

    const text = event.message.text.trim();
    const key = getUserKey(event);

    if (!text) return res.status(200).end();

    if (["選單", "menu", "開始", "?"].includes(text)) {
      await client.replyMessage(event.replyToken, menuFlex());
      return res.status(200).end();
    }

    const modes = {
      "設定 自動": ["auto", "已切換：自動翻譯 🤖"],
      "設定 中泰": ["zh-th", "已切換：中泰翻譯 🇹🇼↔️🇹🇭"],
      "設定 中越": ["zh-vi", "已切換：中越翻譯 🇹🇼↔️🇻🇳"],
      "設定 中英": ["zh-en", "已切換：中英翻譯 🇹🇼↔️🇺🇸"],
      "設定 中日": ["zh-ja", "已切換：中日翻譯 🇹🇼↔️🇯🇵"],
      "設定 中韓": ["zh-ko", "已切換：中韓翻譯 🇹🇼↔️🇰🇷"],
      "設定 中菲": ["zh-tl", "已切換：中菲翻譯 🇹🇼↔️🇵🇭"],
      "設定 中緬": ["zh-my", "已切換：中緬翻譯 🇹🇼↔️🇲🇲"],
      "設定 中俄": ["zh-ru", "已切換：中俄翻譯 🇹🇼↔️🇷🇺"],
      "設定 多國": ["multi", "已切換：多國翻譯 🌍"]
    };

    if (modes[text]) {
      userMode[key] = modes[text][0];
      await replyText(event, modes[text][1]);
      return res.status(200).end();
    }

    const mode = userMode[key] || "auto";
    const translated = await gptTranslate(text, mode);

    if (!translated || translated === text) {
      return res.status(200).end();
    }

    await replyText(event, translated);
    return res.status(200).end();
  } catch (err) {
    console.error(err);
    return res.status(200).end();
  }
});

app.get("/", (req, res) => {
  res.send("LINE GPT Translator Bot + App API Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

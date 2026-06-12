const ADMIN_ID = "U99b4b9aca6199942608e0221b4dee60d";

const vipUsers = {};
const pendingPayments = {};
const userUsage = {};
const userMode = {};
const userLangs = {};

let lastPendingUserId = null;

const FREE_LIMIT = 5;

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

function getUserKey(event) {
  return event.source.groupId || event.source.roomId || event.source.userId;
}

async function replyText(event, text) {
  return client.replyMessage(event.replyToken, {
    type: "text",
    text
  });
}

function menuFlex() {
  return {
    type: "flex",
    altText: "MO 多語翻譯選單",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "🌏 MO 多語翻譯",
            weight: "bold",
            size: "xl",
            align: "center",
            color: "#1F3A5F"
          },
          {
            type: "text",
            text: "請選擇翻譯模式",
            size: "sm",
            align: "center",
            color: "#888888"
          },
          { type: "separator", margin: "md" },

          { type: "button", style: "primary", color: "#22C55E", action: { type: "message", label: "🤖 自動翻譯", text: "設定 自動" } },

          { type: "button", action: { type: "message", label: "🇹🇭 中泰翻譯", text: "設定 中泰" } },
          { type: "button", action: { type: "message", label: "🇻🇳 中越翻譯", text: "設定 中越" } },
          { type: "button", action: { type: "message", label: "🇺🇸 中英翻譯", text: "設定 中英" } },
          { type: "button", action: { type: "message", label: "🇯🇵 中日翻譯", text: "設定 中日" } },
          { type: "button", action: { type: "message", label: "🇰🇷 中韓翻譯", text: "設定 中韓" } },
          { type: "button", action: { type: "message", label: "🇵🇭 中菲翻譯", text: "設定 中菲" } },
          { type: "button", action: { type: "message", label: "🇲🇲 中緬翻譯", text: "設定 中緬" } },
          { type: "button", action: { type: "message", label: "🇷🇺 中俄翻譯", text: "設定 中俄" } },

          { type: "separator", margin: "md" },

          { type: "button", action: { type: "message", label: "🇹🇭🇺🇸 泰文＋英文", text: "設定 泰英" } },
          { type: "button", action: { type: "message", label: "🇹🇭🇺🇸🇻🇳 泰英越", text: "設定 泰英越" } },
          { type: "button", action: { type: "message", label: "🇹🇭🇺🇸🇯🇵 泰英日", text: "設定 泰英日" } },

          { type: "button", style: "primary", color: "#2563EB", action: { type: "message", label: "🌍 多國翻譯", text: "設定 多國" } },
          { type: "button", style: "secondary", action: { type: "message", label: "✅ 複選語言", text: "語言" } },
          { type: "button", style: "secondary", action: { type: "message", label: "💎 會員方案", text: "會員方案" } }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "輸入「選單」可再次開啟",
            size: "xs",
            color: "#999999",
            align: "center"
          }
        ]
      }
    }
  };
}

function languageFlex() {
  return {
    type: "flex",
    altText: "選擇翻譯語言",
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "🌐 複選翻譯語言", weight: "bold", size: "xl", align: "center" },
          { type: "text", text: "可連續選多個語言", size: "sm", align: "center", color: "#888888" },
          { type: "separator", margin: "md" },

          { type: "button", action: { type: "message", label: "🇹🇼 中文 zh-tw", text: "選語言 zh-tw" } },
          { type: "button", action: { type: "message", label: "🇹🇭 泰文 th", text: "選語言 th" } },
          { type: "button", action: { type: "message", label: "🇻🇳 越文 vi", text: "選語言 vi" } },
          { type: "button", action: { type: "message", label: "🇺🇸 英文 en", text: "選語言 en" } },
          { type: "button", action: { type: "message", label: "🇯🇵 日文 ja", text: "選語言 ja" } },
          { type: "button", action: { type: "message", label: "🇰🇷 韓文 ko", text: "選語言 ko" } },
          { type: "button", action: { type: "message", label: "🇵🇭 菲文 tl", text: "選語言 tl" } },
          { type: "button", action: { type: "message", label: "🇲🇲 緬文 my", text: "選語言 my" } },
          { type: "button", action: { type: "message", label: "🇷🇺 俄文 ru", text: "選語言 ru" } },

          { type: "separator", margin: "md" },

          { type: "button", style: "primary", color: "#22C55E", action: { type: "message", label: "✅ 完成選擇", text: "完成語言" } },
          { type: "button", style: "secondary", action: { type: "message", label: "🔄 重選", text: "重選語言" } }
        ]
      }
    }
  };
}

function memberMessage() {
  return `💎 MO翻譯 會員方案

✅ 支援中文、泰文、越南文、英文等多國語言翻譯
✅ 支援複選語言
✅ 即時翻譯，無需切換翻譯軟體

📌 會員方案

🔹 月費會員 NT$99 / 月
🔹 季費會員 NT$249 / 3個月
🔹 年費會員 NT$899 / 年

📌 付款方式

銀行轉帳 / ATM轉帳

付款後請輸入：
開通 99 12345

格式說明：
開通 金額 轉帳末五碼
若客服要求，請輸入「我的ID」取得會員ID。
客服確認後會立即開通會員權限。`;
}

function customLangInstruction(mode) {
  const langMap = {
    "zh-tw": "🇹🇼 中文",
    th: "🇹🇭 泰文",
    vi: "🇻🇳 越文",
    en: "🇺🇸 英文",
    ja: "🇯🇵 日文",
    ko: "🇰🇷 韓文",
    tl: "🇵🇭 菲律賓文 Tagalog",
    my: "🇲🇲 緬甸文",
    ru: "🇷🇺 俄文"
  };

  const langs = mode.split(",").map(x => x.trim()).filter(Boolean);
  const list = langs.map(code => langMap[code] || code).join("\n");

  return `
請把使用者文字翻譯成以下語言：

${list}

格式：
每個語言一行，前面加國旗與語言名稱。

只輸出翻譯結果，不要解釋。
`;
}

async function gptTranslate(text, mode) {
  const instructions = {
    auto: `
你是 LINE 群組專用翻譯機。

規則：
1. 自動判斷語言。
2. 中文翻譯成自然外語。
3. 泰文、越文、英文、日文、韓文、菲律賓文、緬甸文、俄文翻譯成繁體中文。
4. 不可輸出原文。
5. 不可增加解釋。
6. 優先忠實翻譯原文。
7. 保持原意與語氣。
8. 日期與數字保持原格式。
9. 代號、房號、日期代碼、編號不要翻譯。
10. 像 In5/40/2600、K2、B28、A123、LINE ID 等代碼直接保留原文。
11. 如果內容無法判斷意思，直接回傳原文。
12. 只輸出翻譯結果。
`,

    "zh-th": "中文翻譯成自然泰文；泰文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-vi": "中文翻譯成自然越南文；越南文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-en": "中文翻譯成自然英文；英文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ja": "中文翻譯成自然日文；日文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ko": "中文翻譯成自然韓文；韓文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-tl": "中文翻譯成自然菲律賓文 Tagalog；菲律賓文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-my": "中文翻譯成自然緬甸文；緬甸文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ru": "中文翻譯成自然俄文；俄文翻譯成自然繁體中文。只輸出翻譯結果。",

    "zh-th-en": `
請把文字翻譯成：
🇹🇭 泰文：
🇺🇸 英文：
只輸出翻譯結果。
`,

    "zh-th-en-vi": `
請把文字翻譯成：
🇹🇭 泰文：
🇺🇸 英文：
🇻🇳 越文：
只輸出翻譯結果。
`,

    "zh-th-en-ja": `
請把文字翻譯成：
🇹🇭 泰文：
🇺🇸 英文：
🇯🇵 日文：
只輸出翻譯結果。
`,

    multi: `
請把使用者文字翻譯成以下語言：
🇹🇭 泰文：
🇻🇳 越文：
🇺🇸 英文：
🇯🇵 日文：
🇰🇷 韓文：
🇵🇭 菲律賓文：
🇲🇲 緬甸文：
🇷🇺 俄文：
🇹🇼 中文：
只輸出翻譯結果，不要解釋。
`
  };

  let systemPrompt = instructions[mode] || instructions.auto;

  if (mode.includes(",")) {
    systemPrompt = customLangInstruction(mode);
  }

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: text
      }
    ]
  });

  return response.output_text?.trim() || text;
}

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const event = req.body.events[0];

    if (event && event.type === "join") {
      await client.replyMessage(event.replyToken, menuFlex());
      return res.status(200).end();
    }

    if (!event || event.type !== "message" || event.message.type !== "text") {
      return res.status(200).end();
    }

    const text = event.message.text.trim();
    const key = getUserKey(event);

    if (text.toLowerCase() === "vipok") {
  if (event.source.userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  if (!lastPendingUserId) {
    await replyText(event, "目前沒有待核准申請。");
    return res.status(200).end();
  }

  vipUsers[lastPendingUserId] = true;
  await replyText(event, "已開通會員。");
  lastPendingUserId = null;
  return res.status(200).end();
}

    if (text.startsWith("開通 ")) {
      const parts = text.split(/\s+/);
      const amount = parts[1] || "";
      const last5 = parts[2] || "";

      lastPendingUserId = key;

      pendingPayments[key] = {
        amount,
        last5,
        time: new Date().toISOString()
      };

      await replyText(event, "已收到申請，請等待管理員核准。");
      return res.status(200).end();
    }

    if (text === "我的ID" || text === "我的id" || text === "我id") {
      await replyText(event, "你的ID是：" + event.source.userId);
      return res.status(200).end();
    }

    if (text === "會員方案") {
      await replyText(event, memberMessage());
      return res.status(200).end();
    }

    if (text === "語言" || text.toLowerCase() === "language") {
      await client.replyMessage(event.replyToken, languageFlex());
      return res.status(200).end();
    }

    if (text.startsWith("選語言 ")) {
      const lang = text.replace("選語言 ", "").trim();

      if (!userLangs[key]) userLangs[key] = [];

      if (!userLangs[key].includes(lang)) {
        userLangs[key].push(lang);
      }

      await replyText(event, "語言(language)： " + userLangs[key].join(","));
      return res.status(200).end();
    }

    if (text === "重選語言") {
      userLangs[key] = [];
      await client.replyMessage(event.replyToken, languageFlex());
      return res.status(200).end();
    }

    if (text === "完成語言") {
      if (!userLangs[key] || userLangs[key].length === 0) {
        await replyText(event, "請至少選擇一個語言。");
        return res.status(200).end();
      }

      userMode[key] = userLangs[key].join(",");
      await replyText(event, "已設定語言： " + userLangs[key].join(","));
      return res.status(200).end();
    }

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
      "設定 泰英": ["zh-th-en", "已切換：泰文+英文 🇹🇭🇺🇸"],
      "設定 泰英越": ["zh-th-en-vi", "已切換：泰文+英文+越文 🇹🇭🇺🇸🇻🇳"],
      "設定 泰英日": ["zh-th-en-ja", "已切換：泰文+英文+日文 🇹🇭🇺🇸🇯🇵"],
      "設定 多國": ["multi", "已切換：多國翻譯 🌍"]
    };

    if (modes[text]) {
      userMode[key] = modes[text][0];
      userLangs[key] = [];
      await replyText(event, modes[text][1]);
      return res.status(200).end();
    }

    if (!vipUsers[key]) {
      if (!userUsage[key]) userUsage[key] = 0;

      if (userUsage[key] >= FREE_LIMIT) {
        await replyText(event, `免費試用次數已用完。

💎 請輸入「會員方案」查看開通方式
或聯絡客服繳費開通會員。
若客服要求，請輸入「我的ID」取得會員ID。

付款後請輸入：
開通 99 12345`);
        return res.status(200).end();
      }

      userUsage[key]++;

      const freeMode = userMode[key] || "auto";
      const freeTranslated = await gptTranslate(text, freeMode);

      await replyText(event, `免費試用中：剩餘 ${FREE_LIMIT - userUsage[key]} 次

${freeTranslated}`);
      return res.status(200).end();
    }

    const mode = userMode[key] || "auto";
    const translated = await gptTranslate(text, mode);

    if (!translated) {
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
  res.send("LINE GPT Translator Bot Running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

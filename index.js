const ADMIN_ID = "U99b4b9aca6199942608e0221b4dee60d";
const vipUsers = {};
const pendingPayments = {};
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
            color: "#888888",
            margin: "sm"
          },
          { type: "separator", margin: "md" },

          { type: "button", style: "primary", color: "#22C55E", action: { type: "message", label: "🤖 自動翻譯", text: "設定 自動" } },

          { type: "button", action: { type: "message", label: "🇹🇭 中泰雙向", text: "設定 中泰" } },
          { type: "button", action: { type: "message", label: "🇻🇳 中越雙向", text: "設定 中越" } },
          { type: "button", action: { type: "message", label: "🇺🇸 中英雙向", text: "設定 中英" } },
          { type: "button", action: { type: "message", label: "🇯🇵 中日雙向", text: "設定 中日" } },
          { type: "button", action: { type: "message", label: "🇰🇷 中韓雙向", text: "設定 中韓" } },
          { type: "button", action: { type: "message", label: "🇵🇭 中菲雙向", text: "設定 中菲" } },
          { type: "button", action: { type: "message", label: "🇲🇲 中緬雙向", text: "設定 中緬" } },
          { type: "button", action: { type: "message", label: "🇷🇺 中俄雙向", text: "設定 中俄" } },

          { type: "separator", margin: "md" },

          { type: "button", action: { type: "message", label: "🇹🇭🇺🇸 泰文＋英文", text: "設定 泰英" } },
          { type: "button", action: { type: "message", label: "🇹🇭🇺🇸🇻🇳 泰英越", text: "設定 泰英越" } },
          { type: "button", action: { type: "message", label: "🇹🇭🇺🇸🇯🇵 泰英日", text: "設定 泰英日" } },

          {
            type: "button",
            style: "primary",
            color: "#2563EB",
            action: {
              type: "message",
              label: "🌍 多國翻譯",
              text: "設定 多國"
            }
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "message",
              label: "💎 會員方案",
              text: "會員方案"
            }
          }
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

async function replyText(event, text) {
  return client.replyMessage(event.replyToken, {
    type: "text",
    text
  });
}

async function gptTranslate(text, mode) {
  const glossary = `
工作群常用詞庫：
หมาก = 檳榔
เคี้ยวหมาก = 嚼檳榔
กินหมาก = 吃檳榔
คอมเพลน = 投訴
โดนคอมเพลน = 被投訴
ลูกค้า = 客人
แขก = 客人
งาน = 工作
รับงาน = 接工作
ไม่รับงาน = 不接工作
ห้อง = 房間
ย้ายห้อง = 換房
ขึ้นห้อง = 上房
ต่อเวลา = 加時
เพิ่มเวลา = 加時間
หมดเวลา = 時間到了
รอ = 等
รอก่อน = 先等一下
มารับ = 來接
ไปรับ = 去接
ส่ง = 送
กลับบ้าน = 回家
ไม่สบาย = 不舒服
ปวดท้อง = 肚子痛
ปวดหัว = 頭痛
เมนส์มา = 月經來
เหนื่อย = 累
ง่วง = 想睡
หิว = 餓
อิ่มแล้ว = 吃飽了
เข้าใจแล้ว = 明白了
ไม่เข้าใจ = 不懂
ได้ไหม = 可以嗎
ไม่ได้ = 不可以/不能
โอเค = 好/OK
ขอโทษ = 對不起
ขอบคุณ = 謝謝

特殊術語：
3P = 三人
2P = 兩人
แซนวิช = 夾心
ช = 男
ญ = 女
ช2 = 2男
ญ2 = 2女
ไม่จูบปาก = 不親嘴
จูบปาก = 親嘴
กอด = 抱
จับ = 摸
ห้ามจับ = 不能摸
ไม่เอา = 不要
ไม่ทำ = 不做
กลัว = 怕
อันตราย = 危險

中文詞庫：
現在有客人 = ตอนนี้มีลูกค้า
客人 = ลูกค้า
熟客 = ลูกค้าประจำ
老客戶 = ลูกค้าเก่า
幫我好好服務他 = ช่วยดูแลเขาให้ดีนะ
`;

  const instructions = {
    auto: `
你是 LINE 群組專用翻譯機。

規則：

1. 自動判斷語言。
2. 中文翻譯成自然外語。
3. 泰文、越文、英文、日文、韓文、菲律賓文、緬甸文、俄文翻譯成繁體中文。
4. 不可輸出原文。
5. 不可增加標點符號。
6. 優先忠實翻譯原文。
7. 保持原意與語氣。
8. 不推測情境。
9. 不補充內容。
10. 日期與數字保持原格式。
11. 工作群、娛樂場所常用術語優先採用業界用語。
12. 只輸出翻譯結果，不解釋。
13. 代號、房號、日期代碼、編號不要翻譯。
14. 像 In5/40/2600、K2、B28、A123、LINE ID 等代碼直接保留原文。
15. 如果內容無法判斷意思，直接回傳原文。

你是一個專業翻譯引擎。
你是一個專業翻譯引擎。

請逐句翻譯。

保持原意。
保持語氣。
不要使用過度口語化表達。
不要增加額外內容。

只輸出翻譯結果。

範例：
11 มิถุนายน
→ 6月11日

5 กรกฎาคม
→ 7月5日

ตอนนี้มีลูกค้า
→ 現在有客人
`,


    "zh-th": `
你是專業中文泰文雙向翻譯。
中文必須翻譯成自然泰文。
泰文必須翻譯成繁體中文。
中文不可以原文輸出。
只輸出翻譯結果，不要解釋。
`,

    "zh-vi": "中文翻譯成自然越南文；越南文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-en": "中文翻譯成自然英文；英文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ja": "中文翻譯成自然日文；日文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ko": "中文翻譯成自然韓文；韓文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-tl": "中文翻譯成自然菲律賓文 Tagalog；菲律賓文 Tagalog 翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-my": "中文翻譯成自然緬甸文；緬甸文翻譯成自然繁體中文。只輸出翻譯結果。",
    "zh-ru": "中文翻譯成自然俄文；俄文翻譯成自然繁體中文。只輸出翻譯結果。",

    "zh-th-en": `
請把使用者文字翻譯成泰文和英文。

格式：
🇹🇭 泰文：
🇺🇸 英文：

只輸出翻譯結果，不要解釋。

`,

    "zh-th-en-vi": `
請把使用者文字翻譯成泰文、英文、越南文。

格式：
🇹🇭 泰文：
🇺🇸 英文：
🇻🇳 越文：

只輸出翻譯結果，不要解釋。

`,

    "zh-th-en-ja": `
請把使用者文字翻譯成泰文、英文、日文。

格式：
🇹🇭 泰文：
🇺🇸 英文：
🇯🇵 日文：

只輸出翻譯結果，不要解釋。

`,
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
`,
  };

  const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  input: [
    {
      role: "system",
      content: instructions[mode] || instructions.auto
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
    if (text === "我的ID") {
  await replyText(event, "你的ID是：" + key);
  return res.status(200).end();
}

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
      "設定 泰英": ["zh-th-en", "已切換：泰文+英文 🇹🇭🇺🇸"],
      "設定 泰英越": ["zh-th-en-vi", "已切換：泰文+英文+越文 🇹🇭🇺🇸🇻🇳"],
      "設定 泰英日": ["zh-th-en-ja", "已切換：泰文+英文+日文 🇹🇭🇺🇸🇯🇵"],

      "設定 多國": ["multi", "已切換：多國翻譯 🌍"]
    };

    if (text === "會員方案") {
  await replyText(event, `💎 MO翻譯 會員方案

✅ 支援中文、泰文、越南文、英文等多國語言翻譯
✅ 自動翻譯群組訊息
✅ 即時翻譯，無需切換翻譯軟體

📌 會員方案

🔹 月費會員 NT$99 / 月
🔹 季費會員 NT$249 / 3個月
🔹 年費會員 NT$899 / 年

📌 付款方式

銀行轉帳 / ATM轉帳

付款後請提供：

1️⃣ LINE名稱
2️⃣ 付款方案
3️⃣ 轉帳末五碼

客服確認後將立即開通會員權限。

感謝您支持 MO 翻譯 ❤️`);
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

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

1. 自動判斷語言。
2. 保持原本語氣。
3. 金額、時間、日期、房號、地名不可修改。
4. 不要逐字翻譯，優先翻譯成台灣人自然理解的說法。
5. LINE群組、工作群、娛樂場所常用術語優先採用業界慣用翻譯。
6. 不解釋、不加註解、不分析。
7. 只輸出翻譯結果。

特殊詞庫：

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
ลงงาน = 下班/結束工作
ต่อเวลา = 加時
เพิ่มเวลา = 加時間
หมดเวลา = 時間到了
รอ = 等
รอก่อน = 先等一下
มารับ = 來接
ไปรับ = 去接
ส่ง = 送
ไปส่ง = 送過去
กลับ = 回去
กลับบ้าน = 回家
ไม่สบาย = 不舒服
ปวดท้อง = 肚子痛
ปวดหัว = 頭痛
เมนส์มา = 月經來
เป็นเมนส์ = 生理期
เหนื่อย = 累
ง่วง = 想睡
หิว = 餓
อิ่มแล้ว = 吃飽了
เข้าใจแล้ว = 明白了
ไม่เข้าใจ = 不懂
ได้ไหม = 可以嗎
ไม่ได้ = 不可以/不能
ได้ค่ะ = 可以
โอเค = 好/OK
ขอโทษ = 對不起
ขอบคุณ = 謝謝

เงิน = 錢
โอนเงิน = 轉帳
จ่ายเงิน = 付款
ราคา = 價格
ค่าห้อง = 房費
ค่ารถ = 車費
มัดจำ = 訂金
เต็มจำนวน = 全額
ครึ่งหนึ่ง = 一半
ขาดเงิน = 錢不夠
เก็บเงิน = 收錢

ร้าน = 店
เจ้านาย = 老闆
หัวหน้า = 主管
เอเจนซี่ = 仲介/經紀
เพื่อน = 朋友
พี่สาว = 姐姐
น้องสาว = 妹妹
แฟน = 男友/女友
สามี = 老公
ภรรยา = 老婆

特殊工作群術語：
3P = 三人
2P = 兩人
แซนวิช = 夾心
ช = 男
ญ = 女
ช2 = 2男
ญ2 = 2女
ชาย = 男生
หญิง = 女生
นวด = 按摩
บริการ = 服務
ลูกค้าขอ = 客人要求
ลูกค้าเมา = 客人喝醉
ลูกค้าเรื่องมาก = 客人很麻煩
ลูกค้าดี = 客人不錯
ลูกค้าไม่ดี = 客人不好
ไม่จูบปาก = 不親嘴
จูบปาก = 親嘴
กอด = 抱
จับ = 摸
ห้ามจับ = 不能摸
ไม่เอา = 不要
ไม่ทำ = 不做
กลัว = 怕
อันตราย = 危險
แจ้งตำรวจ = 報警

翻譯要求：
1. 遇到以上詞彙，優先使用詞庫翻譯。
2. 不要把 หมาก 翻成口香糖，要翻成檳榔。
3. 不要把 แซนวิช 翻成三明治，要翻成夾心。
4. 不要把 คอมเพลน 翻成抱怨，要翻成投訴。
5. 金額、時間、房號、日期、門牌、代號不可亂改。
6. 只輸出翻譯結果，不要解釋。
10. 只輸出翻譯結果。
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
    model: "gpt-4.1,
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

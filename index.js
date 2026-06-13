const ADMIN_ID = "U99b4b9aca6199942608e0221b4dee60d";

const fs = require("fs");

const VIP_FILE = "/data/vipUsers.json";

function loadVipUsers() {
  try {
    if (fs.existsSync(VIP_FILE)) {
      return JSON.parse(fs.readFileSync(VIP_FILE, "utf8"));
    }
  }
  catch (err) {
    console.error("讀取 VIP 失敗", err);
  }
  return {};
}

const vipUsers = loadVipUsers();

function saveVipUsers() {
  fs.mkdirSync("/data", { recursive: true });
  fs.writeFileSync(VIP_FILE, JSON.stringify(vipUsers, null, 2));
}
function isVip(userId) {
  const vip = vipUsers[userId];

  if (!vip) return false;

  if (vip === true) return true;

  if (vip.permanent) return true;

  if (vip.expireAt && Date.now() > vip.expireAt) {
    delete vipUsers[userId];
    saveVipUsers();
    return false;
  }

  return true;
}
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

  const customModes = ["zh-tw", "th", "vi", "en", "ja", "ko", "tl", "my", "ru"];

if (customModes.includes(mode) || mode.includes(",")) {
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
    const userId = event.source.userId;

    if (text.startsWith("開通 ")) {
      const parts = text.split(/\s+/);
      const amount = parts[1] || "";
      const last5 = parts[2] || "";

      pendingPayments[userId] = {
        amount,
        last5,
        time: new Date().toISOString()
      };

      await replyText(event, "已收到申請，請等待管理員核准。");
      return res.status(200).end();
    }

    if (text === "我的ID" || text === "我的id" || text === "我id") {
      await replyText(event, "你的ID是：" + userId);
      return res.status(200).end();
    }

    if (text === "會員到期") {
      const vip = vipUsers[userId];

      if (!vip || !vip.expireAt) {
        await replyText(event, "你目前不是會員");
        return res.status(200).end();
      }

      const date = new Date(vip.expireAt);

      await replyText(event, "會員到期時間：\n" + date.toLocaleString("zh-TW"));
      return res.status(200).end();
    }
    if (text === "待審名單") {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const list = Object.entries(pendingPayments);

  if (list.length === 0) {
    await replyText(event, "目前沒有待審會員。");
    return res.status(200).end();
  }

  const msg = list.map(([id, p]) =>
    `ID：${id}\n金額：${p.amount}\n末五碼：${p.last5}\n時間：${p.time}`
  ).join("\n\n");

  await replyText(event, "待審名單：\n\n" + msg);
  return res.status(200).end();
}

if (text === "會員名單") {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const list = Object.entries(vipUsers);

  if (list.length === 0) {
    await replyText(event, "目前沒有會員。");
    return res.status(200).end();
  }

  const msg = list.map(([id, vip]) => {
    if (vip === true || vip.permanent) {
      return `ID：${id}\n到期：永久會員`;
    }

    return `ID：${id}\n到期：${new Date(vip.expireAt).toLocaleString("zh-TW")}`;
  }).join("\n\n");

  await replyText(event, "會員名單：\n\n" + msg);
  return res.status(200).end();
}

if (text.startsWith("續費 ")) {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const parts = text.split(/\s+/);
  const targetUserId = parts[1];
  const days = Number(parts[2] || 30);

  if (!targetUserId || !days) {
    await replyText(event, "格式：續費 會員ID 天數\n例如：續費 Uxxxx 30");
    return res.status(200).end();
  }

  const now = Date.now();
  const oldExpire = vipUsers[targetUserId]?.expireAt || now;
  const baseTime = oldExpire > now ? oldExpire : now;

  vipUsers[targetUserId] = {
    expireAt: baseTime + days * 24 * 60 * 60 * 1000
  };

  saveVipUsers();

  await replyText(
    event,
    `已續費會員：\n${targetUserId}\n新增天數：${days}天\n到期時間：\n${new Date(vipUsers[targetUserId].expireAt).toLocaleString("zh-TW")}`
  );

  return res.status(200).end();
}

if (text.startsWith("取消會員 ")) {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const targetUserId = text.replace("取消會員", "").trim();

  if (!targetUserId) {
    await replyText(event, "格式：取消會員 會員ID");
    return res.status(200).end();
  }
  if (text === "待審名單") {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const list = Object.entries(pendingPayments);

  if (list.length === 0) {
    await replyText(event, "目前沒有待審會員。");
    return res.status(200).end();
  }

  const msg = list.map(([id, p]) =>
    `ID：${id}\n金額：${p.amount}\n末五碼：${p.last5}\n時間：${p.time}`
  ).join("\n\n");

  await replyText(event, "待審名單：\n\n" + msg);
  return res.status(200).end();
}

if (text === "會員名單") {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const list = Object.entries(vipUsers);

  if (list.length === 0) {
    await replyText(event, "目前沒有會員。");
    return res.status(200).end();
  }

  const msg = list.map(([id, vip]) => {
    if (vip === true || vip.permanent) {
      return `ID：${id}\n到期：永久會員`;
    }

    return `ID：${id}\n到期：${new Date(vip.expireAt).toLocaleString("zh-TW")}`;
  }).join("\n\n");

  await replyText(event, "會員名單：\n\n" + msg);
  return res.status(200).end();
}

if (text.startsWith("續費 ")) {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const parts = text.split(/\s+/);
  const targetUserId = parts[1];
  const days = Number(parts[2] || 30);

  if (!targetUserId || !days) {
    await replyText(event, "格式：續費 會員ID 天數\n例如：續費 Uxxxx 30");
    return res.status(200).end();
  }

  const now = Date.now();
  const oldExpire = vipUsers[targetUserId]?.expireAt || now;
  const baseTime = oldExpire > now ? oldExpire : now;

  vipUsers[targetUserId] = {
    expireAt: baseTime + days * 24 * 60 * 60 * 1000
  };

  saveVipUsers();

  await replyText(
    event,
    `已續費會員：\n${targetUserId}\n新增天數：${days}天\n到期時間：\n${new Date(vipUsers[targetUserId].expireAt).toLocaleString("zh-TW")}`
  );

  return res.status(200).end();
}

if (text.startsWith("取消會員 ")) {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const targetUserId = text.replace("取消會員", "").trim();

  if (!targetUserId) {
    await replyText(event, "格式：取消會員 會員ID");
    return res.status(200).end();
  }

  delete vipUsers[targetUserId];
  saveVipUsers();

  await replyText(event, "已取消會員：\n" + targetUserId);
  return res.status(200).end();
}

if (text.startsWith("永久會員 ")) {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const targetUserId = text.replace("永久會員", "").trim();

  if (!targetUserId) {
    await replyText(event, "格式：永久會員 會員ID");
    return res.status(200).end();
  }

  vipUsers[targetUserId] = {
    permanent: true
  };

  saveVipUsers();

  await replyText(event, "已設為永久會員：\n" + targetUserId);
  return res.status(200).end();
}
  delete vipUsers[targetUserId];
  saveVipUsers();

  await replyText(event, "已取消會員：\n" + targetUserId);
  return res.status(200).end();
}

if (text.startsWith("永久會員 ")) {
  if (userId !== ADMIN_ID) {
    await replyText(event, "此指令限管理員使用。");
    return res.status(200).end();
  }

  const targetUserId = text.replace("永久會員", "").trim();

  if (!targetUserId) {
    await replyText(event, "格式：永久會員 會員ID");
    return res.status(200).end();
  }

  vipUsers[targetUserId] = {
    permanent: true
  };

  saveVipUsers();

  await replyText(event, "已設為永久會員：\n" + targetUserId);
  return res.status(200).end();
}
    if (text.startsWith("核准") || text.startsWith("核準")) {
      if (userId !== ADMIN_ID) {
        await replyText(event, "此指令限管理員使用。");
        return res.status(200).end();
      }

      const targetUserId = text
        .replace("核准", "")
        .replace("核準", "")
        .trim();

      if (!targetUserId) {
        await replyText(event, "請輸入要核准的會員ID");
        return res.status(200).end();
      }

      vipUsers[targetUserId] = {
        expireAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      };

      saveVipUsers();

      const expireDate = new Date(vipUsers[targetUserId].expireAt).toLocaleString("zh-TW");

      await replyText(
        event,
        "已開通會員：\n" + targetUserId + "\n到期時間：\n" + expireDate
      );

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

    if (["選單", "menu", "開始", "?"].includes(text)) {
      await client.replyMessage(event.replyToken, menuFlex());
      return res.status(200).end();
    }

      if (text === "設定 自動") {
  userMode[key] = "auto";
  await replyText(event, "已切換為自動翻譯");
  return res.status(200).end();
}

if (text === "設定 中泰") {
  userMode[key] = "zh-th";
  await replyText(event, "已切換為中泰翻譯");
  return res.status(200).end();
}

if (text === "設定 中越") {
  userMode[key] = "zh-vi";
  await replyText(event, "已切換為中越翻譯");
  return res.status(200).end();
}

if (text === "設定 中英") {
  userMode[key] = "zh-en";
  await replyText(event, "已切換為中英翻譯");
  return res.status(200).end();
}

if (text === "設定 中日") {
  userMode[key] = "zh-ja";
  await replyText(event, "已切換為中日翻譯");
  return res.status(200).end();
}

if (text === "設定 中韓") {
  userMode[key] = "zh-ko";
  await replyText(event, "已切換為中韓翻譯");
  return res.status(200).end();
}

if (text === "設定 中菲") {
  userMode[key] = "zh-tl";
  await replyText(event, "已切換為中菲翻譯");
  return res.status(200).end();
}

if (text === "設定 中緬") {
  userMode[key] = "zh-my";
  await replyText(event, "已切換為中緬翻譯");
  return res.status(200).end();
}

if (text === "設定 中俄") {
  userMode[key] = "zh-ru";
  await replyText(event, "已切換為中俄翻譯");
  return res.status(200).end();
}
    if (text.startsWith("選語言 ")) {
  const code = text.replace("選語言", "").trim();

  if (!userLangs[key]) userLangs[key] = [];

  if (!userLangs[key].includes(code)) {
    userLangs[key].push(code);
  }

  userMode[key] = userLangs[key].join(",");

  await replyText(
    event,
    "已設定語言：\n" + userMode[key]
  );

  return res.status(200).end();
    }

if (text === "重選語言") {
  userLangs[key] = [];
  delete userMode[key];

  await replyText(
    event,
    "已清空，請重新選擇語言。"
  );

  return res.status(200).end();
}

    if (!isVip(userId)) {
      if (!userUsage[key]) userUsage[key] = 0;

      if (userUsage[key] >= FREE_LIMIT) {
        await replyText(
          event,
          `免費試用次數已用完。

💎 請輸入「會員方案」查看開通方式
或聯絡客服繳費開通會員。
若客服要求，請輸入「我的ID」取得會員ID。

付款後請輸入：
開通 99 12345`
        );
        return res.status(200).end();
      }

      userUsage[key]++;

      const freeMode = userMode[key] || "auto";
      const freeTranslated = await gptTranslate(text, freeMode);

      await replyText(
        event,
        `免費試用中：剩餘 ${FREE_LIMIT - userUsage[key]} 次

${freeTranslated}`
      );

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

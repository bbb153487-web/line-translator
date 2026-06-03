const flex = {
  type: "flex",
  altText: "選擇語言",
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "Choose Language",
          weight: "bold",
          size: "xl"
        },
        {
          type: "button",
          action: {
            type: "message",
            label: "泰文",
            text: "設定 泰文"
          }
        },
        {
          type: "button",
          action: {
            type: "message",
            label: "越文",
            text: "設定 越文"
          }
        },
        {
          type: "button",
          action: {
            type: "message",
            label: "英文",
            text: "設定 英文"
          }
        }
      ]
    }
  }
};

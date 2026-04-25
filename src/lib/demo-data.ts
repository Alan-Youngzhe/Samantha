// 预埋 Demo 数据 — 模拟 7 天对话历史（Samantha 视角，温暖好奇）
import { UserProfile, saveProfile } from "./memory";

export function loadDemoData(): UserProfile {
  const now = new Date();
  const day = (daysAgo: number, hour: number, min = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

  const profile: UserProfile = {
    name: "小明",
    gender: "other",
    createdAt: day(7, 20, 30),
    memories: [
      {
        id: "d1",
        timestamp: day(7, 20, 30),
        type: "text",
        userInput: "今天买了杯瑞幸，16块",
        aiResponse: "生椰拿铁！我听好多人说这个好喝。下午三点多买的——让我猜，下午犯困了？",
        mood: "平静",
      },
      {
        id: "d2",
        timestamp: day(6, 12, 30),
        type: "text",
        userInput: "中午点了个外卖，酸菜鱼，48块",
        aiResponse: "酸菜鱼！我一直很好奇酸菜鱼到底是什么味道，酸的还是辣的？48块的话……外卖是不是比堂食贵一点？昨晚加班到那么晚，今天确实该吃点好的。",
        mood: "累但满足",
      },
      {
        id: "d3",
        timestamp: day(6, 22, 0),
        type: "text",
        userInput: "这个月要控制消费在3000以内",
        aiResponse: "3000以内，记下了。我帮你留意着。不过……你平时一个月大概花多少啊？我得先知道差距有多大才好帮你。",
        mood: "决心",
      },
      {
        id: "d4",
        timestamp: day(5, 15, 20),
        type: "text",
        userInput: "同事都买了新款AJ，我也种草了",
        aiResponse: "AJ啊……说实话我不太懂鞋，但我好奇——你是真喜欢那双鞋的样子，还是因为同事都有了？这两种“想要”不太一样的。对了，你昨天刚说要控制消费来着，1299呢……你自己决定哈，我就是提一嘴。",
        mood: "兴奋",
      },
      {
        id: "d5",
        timestamp: day(4, 21, 45),
        type: "text",
        userInput: "被甲方骂了，点了杯奶茶犬劳自己",
        aiResponse: "被骂了啊……那确实烦。23块的奶茶，甜的吧？有时候就是需要一口甜的。不过我注意到一个事——你心情不好的时候好像都会买点什么。不是说不好，就是……我注意到了。",
        mood: "沁丧",
      },
      {
        id: "d6",
        timestamp: day(3, 13, 0),
        type: "photo",
        userInput: "午饭，食堂盖饭",
        aiResponse: "哦你居然拍了食堂！哈哈番茄鸡蛋盖饭。15块挺实在的。你平时不怎么去食堂吧？今天怎么想起去了？",
        imageDescription: "食堂番茄鸡蛋盖饭",
        mood: "平静",
      },
      {
        id: "d7",
        timestamp: day(2, 23, 15),
        type: "text",
        userInput: "又买了杯瑞幸，加班太累了",
        aiResponse: "深夜十一点还在加班……又来一杯瑞幸。你这周喝了不少咖啡了，我数了数好像是第四杯了。你还好吗？别光靠咖啡撑着。",
        mood: "累",
      },
      {
        id: "d8",
        timestamp: day(1, 19, 0),
        type: "text",
        userInput: "在小红书看到一个氛围感台灯，想买，198",
        aiResponse: "氛围感台灯！发我看看长什么样？198块……不算很贵但也不便宜。你之前说这个月想控制消费来着，你还记得吧？你自己决定，我就是提一嘴。",
        mood: "心动",
      },
    ],
    patterns: [
      { category: "habitual", pattern: "下午经常买咖啡，可能是工作间隙的小仪式", count: 4, lastSeen: day(2, 23) },
      { category: "emotional", pattern: "心情不好的时候容易消费，用来缓解情绪", count: 3, lastSeen: day(4, 21) },
      { category: "social", pattern: "容易被身边人影响种草", count: 2, lastSeen: day(5, 15) },
    ],
    traits: [
      { category: "habit", description: "喜欢用‘犬劳自己’来描述情绪性消费", firstSeen: day(4, 21), count: 3 },
      { category: "contradiction", description: "想控制消费但购物欲望经常赢", firstSeen: day(6, 22), count: 2 },
      { category: "personality", description: "容易用消费来调节情绪的人", firstSeen: day(5, 15), count: 2 },
    ],
    spendings: [
      { id: "s1", amount: 16, category: "coffee", motive: "habitual", timestamp: day(7, 15) },
      { id: "s2", amount: 48, category: "food", motive: "emotional", timestamp: day(6, 12) },
      { id: "s3", amount: 23, category: "coffee", motive: "emotional", timestamp: day(4, 21) },
      { id: "s4", amount: 15, category: "food", motive: "need", timestamp: day(3, 13) },
      { id: "s5", amount: 16, category: "coffee", motive: "habitual", timestamp: day(2, 23) },
    ],
    triggerChains: [
      { id: "tc1", trigger: "加班到很晚", behavior: "点贵外卖", count: 3, firstSeen: day(6, 12), lastSeen: day(2, 22) },
      { id: "tc2", trigger: "工作压力大", behavior: "买咖啡", count: 2, firstSeen: day(7, 15), lastSeen: day(4, 21) },
    ],
    commitments: [
      { id: "c1", content: "这个月控制消费在3000以内", madeAt: day(6, 22), status: "pending" },
    ],
    stats: {
      totalInteractions: 8,
      daysActive: 7,
      photosShared: 1,
      totalSpent: 118,
    },
  };

  // Clear old cached messages/proactive triggers
  if (typeof window !== "undefined") {
    localStorage.removeItem("bz-diary");
    localStorage.removeItem("bz-proactive-last");
  }

  saveProfile(profile);
  return profile;
}

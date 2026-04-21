// 预埋 Demo 数据 — 模拟 7 天消费审视历史
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
    gender: "male",
    createdAt: day(7, 20, 30),
    memories: [
      {
        id: "d1",
        timestamp: day(7, 20, 30),
        type: "text",
        userInput: "今天买了杯瑞幸，16块",
        aiResponse: "下午三点十七分。他走进瑞幸。生椰拿铁，16块。不是因为困——他的工位离茶水间只有五步。他需要的不是咖啡因，是一个离开工位的理由。这是这周的第一杯。让我们看看不会是最后一杯。",
      },
      {
        id: "d2",
        timestamp: day(6, 12, 30),
        type: "text",
        userInput: "中午点了个外卖，酸菜鱼，48块",
        aiResponse: "48块的酸菜鱼外卖。他完全可以在食堂吃15块的盖饭。但他不会。因为酸菜鱼不是午餐，是补偿——昨晚加班到11点的补偿。他用48块买了一个'我还是对自己挺好的'的错觉。",
      },
      {
        id: "d3",
        timestamp: day(6, 22, 0),
        type: "text",
        userInput: "这个月要控制消费在3000以内",
        aiResponse: "他说这个月要控制在3000以内。这个决心来得很突然——大概率是刚看完上个月的账单。让我们记录下这个时刻。根据经验，这类承诺的保质期通常不超过72小时。",
      },
      {
        id: "d4",
        timestamp: day(5, 15, 20),
        type: "text",
        userInput: "同事都买了新款AJ，我也种草了",
        aiResponse: "他种草了一双AJ。不是因为喜欢，是因为同事都有了。1299块，他管这叫'投资穿搭'。距离他说的'控制在3000以内'才过了一天。购物车里多了一双鞋，不是脚需要，是社交焦虑需要。",
      },
      {
        id: "d5",
        timestamp: day(4, 21, 45),
        type: "text",
        userInput: "被甲方骂了，点了杯奶茶犒劳自己",
        aiResponse: "晚上九点四十五。被甲方骂了。他的解决方案是：一杯23块的奶茶。不是渴，是在用糖分平复情绪。'犒劳自己'——这四个字是他最常用的消费合理化话术。被骂了买奶茶，加班了点外卖，焦虑了刷购物车。情绪的出口，全都标着价格。",
      },
      {
        id: "d6",
        timestamp: day(3, 13, 0),
        type: "photo",
        userInput: "午饭，食堂盖饭",
        aiResponse: "他居然去食堂了。15块的番茄鸡蛋盖饭，不锈钢盘子，荧光灯。没有滤镜，没有仪式感。但这是本周唯一一笔不含情绪溢价的餐饮消费。进步是微小的，但它存在。",
        imageDescription: "食堂番茄鸡蛋盖饭",
      },
      {
        id: "d7",
        timestamp: day(2, 23, 15),
        type: "text",
        userInput: "又买了杯瑞幸，加班太累了",
        aiResponse: "深夜十一点十五。又一杯瑞幸。'加班太累了'——他的理由和上次一样。但真相是：这是本周第四杯。每杯16块，本周咖啡消费64块。他不是在买清醒，是在买一个合理的'休息5分钟'的理由。距离3000元预算承诺已经过去3天，目前已知消费已经超过了预算的十分之一。",
      },
      {
        id: "d8",
        timestamp: day(1, 19, 0),
        type: "text",
        userInput: "在小红书看到一个氛围感台灯，想买，198",
        aiResponse: "他在小红书上看到了一个台灯。198块。他说'氛围感'——这个词是营销发明的，意思是'你不需要，但我们让你觉得你需要'。他的工位已经有一盏灯了。他需要的不是光源，是'我的生活精致了一点'这个感觉。198块买一个感觉，他觉得值。",
      },
    ],
    patterns: [
      { category: "habitual", pattern: "每天下午一杯瑞幸，不是困，是逃避工作", count: 4, lastSeen: day(2, 23) },
      { category: "emotional", pattern: "被骂/加班后用消费补偿情绪", count: 3, lastSeen: day(4, 21) },
      { category: "social", pattern: "因同事/社交压力种草商品", count: 2, lastSeen: day(5, 15) },
    ],
    traits: [
      { category: "excuse", description: "总说'犒劳自己'来合理化情绪消费", firstSeen: day(4, 21), count: 3 },
      { category: "contradiction", description: "嘴上说要控制消费，购物车每天都在膨胀", firstSeen: day(6, 22), count: 2 },
      { category: "persona", description: "情绪补偿型消费者", firstSeen: day(5, 15), count: 2 },
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

  saveProfile(profile);
  return profile;
}

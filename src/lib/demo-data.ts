// 预埋 Demo 数据 — 模拟 7 天用户历史
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
    createdAt: day(7, 23, 42),
    memories: [
      {
        id: "d1",
        timestamp: day(7, 23, 42),
        type: "text",
        userInput: "今天加班到11点，吃了桶泡面",
        aiResponse: "深夜十一点四十二分，他终于想起要跟一个App倾诉。小明今天的晚餐是一桶泡面——在办公室吃的。一个成年人的营养摄入，此刻全靠味精和棕榈油维持。",
      },
      {
        id: "d2",
        timestamp: day(6, 12, 30),
        type: "photo",
        userInput: "午饭",
        aiResponse: "小明拍了一张午饭的照片。看得出来是外卖，塑料盒装的回锅肉盖饭，汤汁已经把米饭泡成了黏糊状。28块钱的午餐，他吃得很认真。这是他本周第四次点外卖了。",
        imageDescription: "外卖回锅肉盖饭",
      },
      {
        id: "d3",
        timestamp: day(6, 22, 15),
        type: "text",
        userInput: "我决定明天开始跑步，每天5公里",
        aiResponse: "他说他要跑步了。每天5公里。这个决心来得很突然，大概是刚刷完某个健身博主的视频。让我们记录下这个时刻——因为根据经验，这类宣言的保质期通常不超过72小时。",
      },
      {
        id: "d4",
        timestamp: day(5, 13, 0),
        type: "text",
        userInput: "今天中午又吃了外卖，麻辣烫",
        aiResponse: "他没有跑步。倒是又点了外卖。麻辣烫，汤底大概率是浓缩料兑的。距离他信誓旦旦说要'每天跑5公里'才过了不到15个小时。不过没关系，我们都习惯了。",
      },
      {
        id: "d5",
        timestamp: day(4, 8, 30),
        type: "text",
        userInput: "昨晚失眠了，三点才睡着",
        aiResponse: "三点才睡。他没有提为什么失眠，但根据过去几天的模式——加班、泡面、外卖、没运动——他的身体大概在用失眠的方式表达抗议。一个人可以忽视自己的健康，但身体不会忽视他。",
      },
      {
        id: "d6",
        timestamp: day(3, 19, 45),
        type: "photo",
        userInput: "终于自己做饭了",
        aiResponse: "他居然做饭了。一盘西红柿炒鸡蛋，卖相说不上好，但至少是真正的食物。锅边还能看到溅出来的油渍，说明他确实是亲自动手了。这是本周第一次没吃外卖或泡面。进步是微小的，但它存在。",
        imageDescription: "自己做的西红柿炒鸡蛋",
      },
      {
        id: "d7",
        timestamp: day(2, 21, 0),
        type: "text",
        userInput: "今天走了8000步，算运动了吧",
        aiResponse: "8000步。不是跑步，是走路。距离他承诺的'每天5公里跑步'有着本质区别。但他试图把走路重新定义为运动，这种自我说服的能力倒是不错。不过说实话，至少他动了。从泡面到炒鸡蛋，从零步到八千步——他在用自己的节奏往前挪。",
      },
      {
        id: "d8",
        timestamp: day(1, 23, 30),
        type: "text",
        userInput: "又加班了，不过今天带了饭",
        aiResponse: "加班到深夜，但这次他带了饭。一个微小的、不值得大肆庆祝的变化。他没有跑那个5公里，但他学会了给自己带饭。也许改变从来不是那种戏剧性的转折——它只是一个人在深夜加班时，打开饭盒而不是泡面桶盖的那个瞬间。别装了，他需要找到一种更好的方式。",
      },
    ],
    patterns: [
      { category: "eating", pattern: "工作日依赖外卖和泡面", count: 4, lastSeen: day(4, 13) },
      { category: "mood", pattern: "深夜独处时倾诉欲强", count: 3, lastSeen: day(1, 23) },
      { category: "activity", pattern: "承诺运动但实际执行打折", count: 2, lastSeen: day(2, 21) },
    ],
    traits: [
      { category: "excuse", description: "总用'太累了'回避真实原因", firstSeen: day(7, 23), count: 3 },
      { category: "contradiction", description: "嘴上说要改变，但从不做第一步", firstSeen: day(6, 22), count: 2 },
      { category: "habit", description: "深夜倾诉欲强，白天假装没事", firstSeen: day(5, 8), count: 2 },
    ],
    commitments: [
      { id: "c1", content: "明天开始每天跑5公里", madeAt: day(6, 22), status: "broken", evidence: "从未跑过，只走了8000步" },
      { id: "c2", content: "自己做饭", madeAt: day(3, 19), status: "fulfilled", evidence: "做了西红柿炒鸡蛋" },
      { id: "c3", content: "带饭上班", madeAt: day(1, 23), status: "pending" },
    ],
    stats: {
      totalInteractions: 8,
      daysActive: 7,
      photosShared: 2,
    },
  };

  saveProfile(profile);
  return profile;
}

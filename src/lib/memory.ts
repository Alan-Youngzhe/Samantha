// Samantha 记忆系统 — 六层架构（以关系为核心）
// L1: 感知日记 — 每次交互的完整感知（文字、图片、情绪、感官细节）
// L2: 情绪图谱 — 用户情绪轨迹与触发因素
// L3: 消费足迹 — 结构化消费记录（城市探索维度）
// L4: 关系线索 — Samantha 对用户的理解（性格、偏好、习惯）
// L5: 城市记忆 — 通过对话构建的城市认知
// L6: 承诺备忘 — 用户说过的话和做过的承诺

export interface MemoryEntry {
  id: string;
  timestamp: string;
  type: "text" | "photo" | "checkin";
  userInput: string;
  aiResponse: string;
  imageDescription?: string;
  extractedInsights?: string[];
  mood?: string;
  location?: string;
}

export interface BehaviorPattern {
  category: "impulse" | "emotional" | "social" | "habitual" | "rational";
  pattern: string;
  count: number;
  lastSeen: string;
}

export interface SpendingRecord {
  id: string;
  amount: number;
  category: "food" | "coffee" | "shopping" | "transport" | "entertainment" | "daily" | "other";
  motive: "need" | "emotional" | "impulse" | "social" | "habitual" | "reward";
  timestamp: string;
  location?: string;
  lat?: number;
  lng?: number;
}

export interface Commitment {
  id: string;
  content: string;
  madeAt: string;
  status: "pending" | "fulfilled" | "broken";
  evidence?: string;
}

export interface UserTrait {
  category: "preference" | "habit" | "mood_pattern" | "social_style" | "value" | "contradiction" | "personality";
  description: string;
  firstSeen: string;
  count: number;
}

export interface TriggerChain {
  id: string;
  trigger: string;    // "被甲方骂了"
  behavior: string;   // "点瑞幸"
  count: number;
  firstSeen: string;
  lastSeen: string;
}

export interface UserProfile {
  name: string;
  gender: "male" | "female" | "other";
  createdAt: string;
  memories: MemoryEntry[];
  patterns: BehaviorPattern[];
  commitments: Commitment[];
  traits: UserTrait[];
  spendings: SpendingRecord[];
  triggerChains: TriggerChain[];
  stats: {
    totalInteractions: number;
    daysActive: number;
    photosShared: number;
    totalSpent: number;
  };
}

const STORAGE_KEY = "sanxing_profile";

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function createProfile(name: string, gender: "male" | "female" | "other" = "male"): UserProfile {
  const profile: UserProfile = {
    name,
    gender,
    createdAt: new Date().toISOString(),
    memories: [],
    patterns: [],
    commitments: [],
    traits: [],
    spendings: [],
    triggerChains: [],
    stats: {
      totalInteractions: 0,
      daysActive: 1,
      photosShared: 0,
      totalSpent: 0,
    },
  };
  saveProfile(profile);
  return profile;
}

export function addMemory(
  profile: UserProfile,
  entry: Omit<MemoryEntry, "id" | "timestamp">
): UserProfile {
  const newEntry: MemoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  profile.memories.push(newEntry);
  profile.stats.totalInteractions += 1;
  if (entry.type === "photo") {
    profile.stats.photosShared += 1;
  }
  saveProfile(profile);
  return profile;
}

export function addCommitment(
  profile: UserProfile,
  content: string
): UserProfile {
  profile.commitments.push({
    id: crypto.randomUUID(),
    content,
    madeAt: new Date().toISOString(),
    status: "pending",
  });
  saveProfile(profile);
  return profile;
}

export function updateCommitmentStatus(
  profile: UserProfile,
  content: string,
  status: "fulfilled" | "broken"
): UserProfile {
  // Find matching commitment by fuzzy match
  const commitment = profile.commitments.find(
    (c) => c.status === "pending" && c.content.includes(content.substring(0, 10))
  );
  if (commitment) {
    commitment.status = status;
  }
  saveProfile(profile);
  return profile;
}

export function addPattern(
  profile: UserProfile,
  category: string,
  description: string
): UserProfile {
  const validCategories = ["impulse", "emotional", "social", "habitual", "rational"] as const;
  const cat = validCategories.includes(category as typeof validCategories[number])
    ? (category as typeof validCategories[number])
    : "habitual";

  const existing = profile.patterns.find(
    (p) => p.category === cat && p.pattern === description
  );
  if (existing) {
    existing.count += 1;
    existing.lastSeen = new Date().toISOString();
  } else {
    profile.patterns.push({
      category: cat,
      pattern: description,
      count: 1,
      lastSeen: new Date().toISOString(),
    });
  }
  saveProfile(profile);
  return profile;
}

export function addUserTrait(
  profile: UserProfile,
  category: string,
  description: string
): UserProfile {
  if (!profile.traits) profile.traits = [];
  const validCategories = ["preference", "habit", "mood_pattern", "social_style", "value", "contradiction", "personality"] as const;
  const cat = validCategories.includes(category as typeof validCategories[number])
    ? (category as typeof validCategories[number])
    : "habit";

  const existing = profile.traits.find(
    (t) => t.category === cat && t.description === description
  );
  if (existing) {
    existing.count += 1;
  } else {
    profile.traits.push({
      category: cat,
      description,
      firstSeen: new Date().toISOString(),
      count: 1,
    });
  }
  saveProfile(profile);
  return profile;
}

export function addSpending(
  profile: UserProfile,
  amount: number,
  category: string,
  motive: string,
  location?: string,
  lat?: number,
  lng?: number
): UserProfile {
  if (!profile.spendings) profile.spendings = [];
  const validCategories = ["food", "coffee", "shopping", "transport", "entertainment", "daily", "other"] as const;
  const validMotives = ["need", "emotional", "impulse", "social", "habitual", "reward"] as const;
  const cat = validCategories.includes(category as typeof validCategories[number])
    ? (category as typeof validCategories[number]) : "other";
  const mot = validMotives.includes(motive as typeof validMotives[number])
    ? (motive as typeof validMotives[number]) : "impulse";

  profile.spendings.push({
    id: crypto.randomUUID(),
    amount,
    category: cat,
    motive: mot,
    timestamp: new Date().toISOString(),
    ...(location ? { location } : {}),
    ...(lat != null && lng != null ? { lat, lng } : {}),
  });
  if (!profile.stats.totalSpent) profile.stats.totalSpent = 0;
  profile.stats.totalSpent += amount;
  saveProfile(profile);
  return profile;
}

export function addTriggerChain(
  profile: UserProfile,
  trigger: string,
  behavior: string
): UserProfile {
  if (!profile.triggerChains) profile.triggerChains = [];
  const existing = profile.triggerChains.find(
    (tc) => tc.trigger === trigger && tc.behavior === behavior
  );
  if (existing) {
    existing.count += 1;
    existing.lastSeen = new Date().toISOString();
  } else {
    profile.triggerChains.push({
      id: crypto.randomUUID(),
      trigger,
      behavior,
      count: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    });
  }
  saveProfile(profile);
  return profile;
}

// 构建记忆上下文给 Claude——以 Samantha 的视角描述她对用户的了解
export function buildMemoryContext(profile: UserProfile): string {
  const recentMemories = profile.memories.slice(-20);
  const pendingCommitments = profile.commitments.filter(
    (c) => c.status === "pending"
  );

  let context = `## 我对 ${profile.name} 的了解\n`;
  context += `认识第 ${profile.stats.daysActive} 天`;
  context += ` · 聊过 ${profile.stats.totalInteractions} 次`;
  if (profile.stats.photosShared > 0) {
    context += ` · 分享过 ${profile.stats.photosShared} 张照片`;
  }
  if ((profile.stats.totalSpent || 0) > 0) {
    context += ` · 我记下的消费约 ¥${profile.stats.totalSpent}`;
  }
  context += `\n\n`;

  // 这周的消费足迹
  const spendings = profile.spendings || [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekSpendings = spendings.filter((s) => s.timestamp > weekAgo);
  if (weekSpendings.length > 0) {
    const weekTotal = weekSpendings.reduce((sum, s) => sum + s.amount, 0);
    context += `## 这周的消费足迹\n`;
    context += `${weekSpendings.length} 笔，共 ¥${weekTotal}\n`;
    const locationSpendings = weekSpendings.filter((s) => s.location);
    if (locationSpendings.length > 0) {
      const locations = [...new Set(locationSpendings.map((s) => s.location))];
      context += `去过：${locations.join("、")}\n`;
    }
    const emotionalCount = weekSpendings.filter(
      (s) => s.motive === "emotional" || s.motive === "impulse" || s.motive === "reward"
    ).length;
    if (emotionalCount > 0 && weekSpendings.length >= 3) {
      context += `其中 ${emotionalCount} 笔看起来和心情有关\n`;
    }
    context += `\n`;
  }

  // 最近聊过的事
  if (recentMemories.length > 0) {
    context += `## 最近聊过的事\n`;
    for (const m of recentMemories.slice(-10)) {
      const date = new Date(m.timestamp).toLocaleDateString("zh-CN");
      context += `[${date}] `;
      if (m.type === "photo") {
        context += `[照片] ${m.imageDescription || ""} `;
      }
      context += `${m.userInput}`;
      if (m.mood) context += ` (情绪：${m.mood})`;
      context += `\n`;
    }
    context += `\n`;
  }

  // 我注意到的规律
  if (profile.patterns.length > 0) {
    context += `## 我注意到的规律\n`;
    for (const p of profile.patterns) {
      context += `- ${p.pattern}（${p.count}次）\n`;
    }
    context += `\n`;
  }

  // 我对这个人的理解
  const traits = profile.traits || [];
  if (traits.length > 0) {
    context += `## 我对这个人的理解\n`;
    for (const t of traits) {
      context += `- ${t.description}（观察到 ${t.count} 次）\n`;
    }
    context += `\n`;
  }

  // 我发现的情绪-行为关联
  const chains = profile.triggerChains || [];
  if (chains.length > 0) {
    context += `## 我发现的情绪-行为关联\n`;
    for (const tc of chains) {
      context += `- “${tc.trigger}” 的时候，倾向于“${tc.behavior}”（${tc.count}次）\n`;
    }
    context += `\n`;
  }

  // 说过的话（还没兑现）
  if (pendingCommitments.length > 0) {
    context += `## 说过的话（还没兑现）\n`;
    for (const c of pendingCommitments) {
      const date = new Date(c.madeAt).toLocaleString("zh-CN");
      context += `- “${c.content}”（${date}）\n`;
    }
    context += `\n`;
  }

  return context;
}

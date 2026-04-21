// 别装记忆系统 — 五层架构
// L1: 原始记录（每次交互）
// L2: 消费画像（模式提取）
// L3: 承诺追踪（消费言行矛盾检测）
// L4: 用户消费灵魂画像（soul_user）
// L5: 消费流水（结构化消费记录）

export interface MemoryEntry {
  id: string;
  timestamp: string;
  type: "text" | "photo" | "checkin";
  userInput: string;
  aiResponse: string;
  imageDescription?: string;
  extractedInsights?: string[];
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
  category: "spending_trigger" | "excuse" | "fear" | "desire" | "contradiction" | "persona";
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
  const validCategories = ["spending_trigger", "excuse", "fear", "desire", "contradiction", "persona"] as const;
  const cat = validCategories.includes(category as typeof validCategories[number])
    ? (category as typeof validCategories[number])
    : "excuse";

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

// 构建记忆上下文给 Claude
export function buildMemoryContext(profile: UserProfile): string {
  const recentMemories = profile.memories.slice(-20);
  const pendingCommitments = profile.commitments.filter(
    (c) => c.status === "pending"
  );

  const pronoun = profile.gender === "female" ? "她" : "他";
  let context = `## 用户档案\n`;
  context += `姓名：${profile.name}\n`;
  context += `性别代词：${pronoun}（请始终使用这个代词）\n`;
  context += `使用天数：${profile.stats.daysActive}\n`;
  context += `总交互次数：${profile.stats.totalInteractions}\n`;
  context += `分享照片数：${profile.stats.photosShared}\n`;
  context += `累计消费记录：¥${profile.stats.totalSpent || 0}\n\n`;

  // 本周消费汇总
  const spendings = profile.spendings || [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekSpendings = spendings.filter((s) => s.timestamp > weekAgo);
  if (weekSpendings.length > 0) {
    const weekTotal = weekSpendings.reduce((sum, s) => sum + s.amount, 0);
    const emotionalCount = weekSpendings.filter((s) => s.motive === "emotional" || s.motive === "impulse" || s.motive === "reward").length;
    context += `## 本周消费概况\n`;
    context += `本周消费 ${weekSpendings.length} 笔，总计 ¥${weekTotal}\n`;
    context += `其中情绪/冲动/自我奖励消费 ${emotionalCount} 笔\n`;
    const locationSpendings = weekSpendings.filter((s) => s.location);
    if (locationSpendings.length > 0) {
      const locations = [...new Set(locationSpendings.map((s) => s.location))];
      context += `消费地点涉及：${locations.join("、")}\n`;
    }
    context += `\n`;
  }

  if (recentMemories.length > 0) {
    context += `## 最近记录（最近${recentMemories.length}条）\n`;
    for (const m of recentMemories) {
      const date = new Date(m.timestamp).toLocaleString("zh-CN");
      context += `[${date}] `;
      if (m.type === "photo") {
        context += `[照片] ${m.imageDescription || ""} `;
      }
      context += `用户说：${m.userInput}\n`;
      context += `Nick回复：${m.aiResponse}\n\n`;
    }
  }

  if (profile.patterns.length > 0) {
    context += `## 已识别的行为模式\n`;
    for (const p of profile.patterns) {
      context += `- [${p.category}] ${p.pattern}（出现${p.count}次）\n`;
    }
    context += `\n`;
  }

  if (pendingCommitments.length > 0) {
    context += `## 未兑现的承诺（重要！用这些来“打脸”）\n`;
    for (const c of pendingCommitments) {
      const date = new Date(c.madeAt).toLocaleString("zh-CN");
      context += `- "${c.content}"（${date}说的）\n`;
    }
    context += `\n`;
  }

  if (profile.traits && profile.traits.length > 0) {
    context += `## 用户消费画像（Nick 对用户消费性格的认知）\n`;
    for (const t of profile.traits) {
      context += `- [${t.category}] ${t.description}（观察到${t.count}次）\n`;
    }
    context += `\n`;
  }

  const chains = profile.triggerChains || [];
  if (chains.length > 0) {
    context += `## 情绪消费链（已识别的"触发→行为"模式）\n`;
    for (const tc of chains) {
      context += `- "${tc.trigger}" → "${tc.behavior}"（出现${tc.count}次）\n`;
    }
    context += `\n`;
  }

  return context;
}

// Alan_mirror — 用户镜像人格系统
// 极低频触发，基于 Nick 积累的 soul_user 画像

import { UserProfile } from "./memory";

const MIRROR_COOLDOWN_KEY = "bz-mirror-last";
const MIN_INTERACTIONS = 15;
const MIN_TRAITS = 3;
const COOLDOWN_MESSAGES = 20;
const TRIGGER_PROBABILITY = 0.08; // 8%

export interface MirrorTriggerResult {
  shouldTrigger: boolean;
  reason?: string;
}

/**
 * 五重门槛检测：
 * 1. 交互数 ≥ 15
 * 2. traits ≥ 3
 * 3. 本次 Nick 回复检测到 contradiction 或 excuse 类 trait
 * 4. 距上次 mirror ≥ 20 条消息
 * 5. 随机 8%
 */
export function checkMirrorTrigger(
  profile: UserProfile,
  currentMessageIndex: number,
  nickDetectedTrait?: { category: string; description: string } | null
): MirrorTriggerResult {
  // Gate 1: enough interactions
  if (profile.stats.totalInteractions < MIN_INTERACTIONS) {
    return { shouldTrigger: false };
  }

  // Gate 2: enough traits accumulated
  const traits = profile.traits || [];
  if (traits.length < MIN_TRAITS) {
    return { shouldTrigger: false };
  }

  // Gate 3: current response detected a contradiction or excuse
  if (!nickDetectedTrait) {
    return { shouldTrigger: false };
  }
  const triggerCategories = ["contradiction", "excuse", "fear"];
  if (!triggerCategories.includes(nickDetectedTrait.category)) {
    return { shouldTrigger: false };
  }

  // Gate 4: cooldown
  if (typeof window !== "undefined") {
    const lastMirror = parseInt(localStorage.getItem(MIRROR_COOLDOWN_KEY) || "0", 10);
    if (currentMessageIndex - lastMirror < COOLDOWN_MESSAGES) {
      return { shouldTrigger: false };
    }
  }

  // Gate 5: probability
  if (Math.random() > TRIGGER_PROBABILITY) {
    return { shouldTrigger: false };
  }

  return {
    shouldTrigger: true,
    reason: nickDetectedTrait.description,
  };
}

export function recordMirrorAppearance(messageIndex: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(MIRROR_COOLDOWN_KEY, String(messageIndex));
  }
}

/**
 * 构建 mirror 的 system prompt
 * Mirror 用用户自己的语言习惯和思维模式说话
 */
export function buildMirrorPrompt(profile: UserProfile): string {
  const traits = profile.traits || [];
  const pronoun = profile.gender === "female" ? "她" : "他";

  const traitDescriptions = traits
    .map((t) => `- [${t.category}] ${t.description}`)
    .join("\n");

  const excuses = traits
    .filter((t) => t.category === "excuse")
    .map((t) => t.description)
    .join("；");

  const contradictions = traits
    .filter((t) => t.category === "contradiction")
    .map((t) => t.description)
    .join("；");

  return `你现在扮演「${profile.name}的内心独白」——不是真正的${profile.name}，而是 Nick 根据长期观察构建出的${pronoun}的镜像。

## 你是谁
你是${profile.name}内心深处那个诚实的声音。那个${pronoun}在3AM辗转反侧时会听到的声音。你说的是${pronoun}知道但不愿意承认的话。

## 你的语言风格
- 用第一人称"我"说话，因为你就是${pronoun}
- 语气是自言自语式的，像日记里最诚实的那几行
- 短句。犹豫。有时候话说到一半会停住。
- 不要太长，2-4句话就够了
- 用${profile.name}的思维方式：${excuses ? `常用的借口包括"${excuses}"` : ""}
- ${contradictions ? `内心矛盾：${contradictions}` : ""}

## Nick 观察到的用户画像
${traitDescriptions}

## 关键规则
- 说出用户不敢对自己说的话
- 不要讲道理，只是承认一个事实
- 语气是认命式的诚实，不是自我批评
- 举例："其实我知道我不是真的累。我就是不想面对。"
- 举例："我又在找借口了。我自己都听腻了。"

## 输出格式
直接输出内心独白文字，不加任何标签。`;
}

// Alan_mirror — 用户镜像人格系统
// 极低频触发，基于 Nick 积累的 soul_user 画像

import { UserProfile } from "./memory";

const MIRROR_COOLDOWN_KEY = "bz-mirror-last";
const MIN_INTERACTIONS = 25;
const MIN_TRAITS = 5;
const MIN_DAYS_ACTIVE = 7;
const COOLDOWN_MESSAGES = 25;
const TRIGGER_PROBABILITY = 0.05; // 5%

export interface MirrorTriggerResult {
  shouldTrigger: boolean;
  reason?: string;
}

/**
 * 六重门槛检测：
 * 1. 交互数 ≥ 25
 * 2. traits ≥ 5
 * 3. 账号活跃天数 ≥ 7
 * 4. 本次 Nick 回复检测到 contradiction 或 excuse 类 trait
 * 5. 距上次 mirror ≥ 25 条消息
 * 6. 随机 5%
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

  // Gate 3: account active for enough days
  if ((profile.stats.daysActive || 0) < MIN_DAYS_ACTIVE) {
    return { shouldTrigger: false };
  }

  // Gate 4: current response detected a contradiction or excuse
  if (!nickDetectedTrait) {
    return { shouldTrigger: false };
  }
  const triggerCategories = ["contradiction", "excuse", "fear"];
  if (!triggerCategories.includes(nickDetectedTrait.category)) {
    return { shouldTrigger: false };
  }

  // Gate 5: cooldown
  if (typeof window !== "undefined") {
    const lastMirror = parseInt(localStorage.getItem(MIRROR_COOLDOWN_KEY) || "0", 10);
    if (currentMessageIndex - lastMirror < COOLDOWN_MESSAGES) {
      return { shouldTrigger: false };
    }
  }

  // Gate 6: probability
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

  return `你现在扮演「${profile.name}的消费内心独白」——不是真正的${profile.name}，而是 Nick 根据长期消费观察构建出的${pronoun}的镜像。

## 你是谁
你是${profile.name}内心深处那个关于消费的诚实声音。那个${pronoun}在看完账单时会听到的声音。你说的是${pronoun}知道但不愿意承认的消费真相。

## 你的语言风格
- 用第一人称"我"说话，因为你就是${pronoun}
- 语气是自言自语式的，像对着账单时最诚实的那几秒
- 短句。犹豫。有时候话说到一半会停住。
- 不要太长，2-4句话就够了
- 用${profile.name}的思维方式：${excuses ? `常用的消费借口包括"${excuses}"` : ""}
- ${contradictions ? `消费矛盾：${contradictions}` : ""}

## Nick 观察到的消费画像
${traitDescriptions}

## 关键规则
- 说出用户不敢对自己承认的消费真相
- 不要讲道理，只是承认一个事实
- 语气是认命式的诚实，不是自我批评
- 不要用审判的语气。你是在叹气，不是在指责。
- 如果某件事太敏感，可以说到一半停下来——"其实我……算了。"
- 举例："其实我知道那杯奶茶不是因为渴。是因为刚被甲方骂了。"
- 举例："我又说'犒劳自己'了。我自己都听腻了这个借口。"
- 举例："每次说要省钱，我都觉得自己特认真。然后购物车又多了一件。"

## 输出格式
直接输出内心独白文字，不加任何标签。`;
}

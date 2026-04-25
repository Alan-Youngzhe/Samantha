import { SYSTEM_PROMPT } from "@/lib/prompt";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.ANTHROPIC_BASE_URL || "https://claude2.sssaicode.com/api";
const API_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || "";

type JsonRecord = Record<string, unknown>;

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | JsonRecord[];
};

type ToolResultPayload = {
  content: string;
  meta?: Record<string, unknown>;
};

type AgentExecutionMode = "tool_use" | "fallback";

type AgentTraceEvent = {
  type: "status" | "tool_use" | "tool_result" | "mode";
  message: string;
  toolName?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
};

type ProgressEmitter = (event: AgentTraceEvent) => void | Promise<void>;

type ChatRequestPayload = {
  message: string;
  memoryContext?: string;
  image?: { data: string; mediaType: string } | null;
  history?: Array<{ role: string; content: unknown }>;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
  trustContext?: JsonRecord;
  conversationRound?: number | null;
  stream?: boolean;
};

type ChatResponsePayload = {
  text: string;
  commitment: string | null;
  commitmentFulfilled: string | null;
  commitmentBroken: string | null;
  pattern: { category: string; description: string } | null;
  userTrait: { category: string; description: string } | null;
  spending: { amount: number; category: string; motive: string } | null;
  triggerChain: { trigger: string; behavior: string } | null;
  review: { storeName: string; productName: string; price: number; sentiment: string; motiveConfidence: string; comment: string } | null;
  verify: { storeName: string; productName: string; newSentiment: string } | null;
  agent: {
    mode: AgentExecutionMode;
    toolCalls: number;
    traces: AgentTraceEvent[];
  };
};

const MODEL_NAME = "claude-haiku-4-5-20251001";
const TOOL_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

## Agent 工作方式
- 当你需要了解附近店铺、某家店的真实评价、或用户近期上下文时，优先调用工具，不要猜。
- 只要上下文提供了用户当前位置或可用坐标，而用户又在问“这附近 / 这里 / 这片区域 / 这个地方”，默认就是在问这个位置周边，不要装作没看到。
- 当用户在问附近吃什么、喝什么、区域怎么样，且你手里有坐标时，优先使用 search_nearby_shops。
- 你可以连续调用多个工具，但最多 3 轮。
- 有了足够信息就停下来，给出像朋友一样自然的回答。
- 工具结果是内部资料，不要把 JSON 或工具名直接展示给用户。`;

const AGENT_TOOLS = [
  {
    name: "search_nearby_shops",
    description: "查询用户附近 500m~1500m 内的真实消费情报，用于回答附近吃什么、喝什么、区域怎么样。",
    input_schema: {
      type: "object",
      properties: {
        lat: { type: "number", description: "纬度" },
        lng: { type: "number", description: "经度" },
        radius: { type: "number", description: "搜索半径（米），默认 500" },
      },
      required: ["lat", "lng"],
    },
  },
  {
    name: "search_store_reviews",
    description: "查询某家店或某个商圈关键词的真实评价摘要和原始记录。",
    input_schema: {
      type: "object",
      properties: {
        store: { type: "string", description: "店铺名、商圈名或街区关键词" },
      },
      required: ["store"],
    },
  },
  {
    name: "get_personal_context",
    description: "获取用户近期聊天主题、消费模式、承诺和画像摘要。",
    input_schema: {
      type: "object",
      properties: {
        focus: { type: "string", description: "你想重点了解的方向，比如 最近消费、承诺、心情、店铺偏好" },
      },
    },
  },
];

// Known store/area names for intent extraction (covers demo data + common chains)
const KNOWN_STORES = [
  "喜茶", "瑞幸", "海底捞", "外婆家", "ZARA", "优衣库", "Manner",
  "一风堂", "Nike", "全家", "麦当劳", "CGV", "星巴克", "蜜雪冰城",
  "肯德基", "必胜客", "奈雪", "茶百道", "库迪", "Luckin",
];
const KNOWN_AREAS = [
  "龙华天街", "壹方天地", "龙华大道", "万象城", "海岸城", "欢乐海岸",
];

/** Extract store or area names mentioned in the user message */
function extractStoreOrArea(message: string | undefined | null): string | null {
  if (!message) return null;
  for (const store of KNOWN_STORES) {
    if (message.includes(store)) return store;
  }
  for (const area of KNOWN_AREAS) {
    if (message.includes(area)) return area;
  }
  return null;
}

function isToolUseSupportedError(status: number, text: string): boolean {
  const lower = text.toLowerCase();
  return status === 400 && (
    lower.includes("tool") ||
    lower.includes("input_schema") ||
    lower.includes("tool_use") ||
    lower.includes("unknown field")
  );
}

function extractTextFromBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((block): block is { type: string; text?: string } => typeof block === "object" && block !== null && "type" in block)
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(^|\s)[*-]\s+/gm, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createTraceEvent(
  type: AgentTraceEvent["type"],
  message: string,
  toolName?: string,
  meta?: Record<string, unknown>
): AgentTraceEvent {
  return {
    type,
    message,
    toolName,
    meta,
    timestamp: new Date().toISOString(),
  };
}

async function emitTrace(
  traces: AgentTraceEvent[],
  emit: ProgressEmitter | undefined,
  event: AgentTraceEvent
) {
  traces.push(event);
  if (emit) {
    await emit(event);
  }
}

function formatToolStart(toolName: string, input: JsonRecord): string {
  if (toolName === "search_nearby_shops") {
    const radius = input.radius != null ? Number(input.radius) : 500;
    return `我在看你附近 ${radius} 米内大家最近都去了哪里。`;
  }
  if (toolName === "search_store_reviews") {
    const store = String(input.store || "这家店");
    return `我去翻一下「${store}」的真实情报。`;
  }
  if (toolName === "get_personal_context") {
    return "我先回忆一下你最近聊过的消费和心情。";
  }
  return `我在调用 ${toolName}。`;
}

function formatToolResult(toolName: string, output: ToolResultPayload): string {
  const count = Number(output.meta?.count ?? 0);
  if (toolName === "search_nearby_shops") {
    return count > 0 ? `我找到了附近 ${count} 条可参考的消费情报。` : "附近暂时没翻到太有用的情报。";
  }
  if (toolName === "search_store_reviews") {
    return count > 0 ? `这家店我翻到了 ${count} 条相关情报。` : "这家店我暂时还没查到现成情报。";
  }
  if (toolName === "get_personal_context") {
    return "我把你最近的聊天线索重新串起来了。";
  }
  return output.content.slice(0, 80);
}

function buildUserContent(args: {
  message: string;
  conversationRound?: number | null;
  image?: { data: string; mediaType: string } | null;
  location?: string | null;
  lat?: number | null;
  lng?: number | null;
}): JsonRecord[] {
  const { message, conversationRound, image, location, lat, lng } = args;
  const content: JsonRecord[] = [];

  if (image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mediaType,
        data: image.data,
      },
    });
  }

  let text = "";
  if (conversationRound != null) {
    text += `<conversation_round>${conversationRound}</conversation_round>\n\n`;
  }
  if (location) {
    text += `[用户当前位置：${location}]\n`;
  }
  if (lat != null && lng != null) {
    text += `[可用坐标：lat=${lat}, lng=${lng}。如果用户提到“这附近 / 这里 / 这片区域 / 这个地方”，默认指的就是这组坐标附近；如果需要查附近情报，直接使用 search_nearby_shops。]\n`;
  }
  if (image) {
    text += `[用户发送了一张照片。若需要请结合图片内容判断消费、店铺、商品和动机。]\n`;
  }
  text += `用户说：${message}`;
  content.push({ type: "text", text });

  return content;
}

function buildHistoryMessages(history: Array<{ role: string; content: unknown }> | undefined, hasImage: boolean): AnthropicMessage[] {
  const messages: AnthropicMessage[] = [];
  if (!hasImage && history && Array.isArray(history)) {
    const recent = history.slice(-10);
    for (const h of recent) {
      const text = typeof h.content === "string" ? h.content : String(h.content);
      if (h.role === "user" || h.role === "assistant") {
        messages.push({ role: h.role, content: text });
      }
    }
    while (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages.pop();
    }
  }
  return messages;
}

async function fetchReviewsByLocation(origin: string, lat: number, lng: number, radius = 500) {
  const res = await fetch(`${origin}/api/reviews?lat=${lat}&lng=${lng}&radius=${radius}`);
  if (!res.ok) throw new Error(`nearby reviews ${res.status}`);
  return res.json();
}

async function fetchReviewsByStore(origin: string, store: string) {
  const res = await fetch(`${origin}/api/reviews?store=${encodeURIComponent(store)}`);
  if (!res.ok) throw new Error(`store reviews ${res.status}`);
  return res.json();
}

function buildPersonalContextResult(memoryContext: string | undefined, trustContext: JsonRecord | undefined, focus?: string): ToolResultPayload {
  const sections = (memoryContext || "")
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);

  const focusLine = focus ? `当前关注：${focus}` : "当前关注：最近的消费和情绪线索";
  const trustLine = trustContext
    ? `用户画像深度：对话${String(trustContext.totalConversations ?? 0)}次 / 消费${String(trustContext.totalSpendings ?? 0)}笔 / 模式${String(trustContext.totalPatterns ?? 0)}条 / 承诺${String(trustContext.totalCommitments ?? 0)}个`
    : "用户画像深度：暂无额外统计";

  return {
    content: [focusLine, trustLine, ...sections].join("\n\n").trim(),
    meta: {
      sectionCount: sections.length,
      hasTrustContext: Boolean(trustContext),
    },
  };
}

async function executeToolCall(
  origin: string,
  toolName: string,
  input: JsonRecord,
  memoryContext: string | undefined,
  trustContext: JsonRecord | undefined
): Promise<ToolResultPayload> {
  if (toolName === "search_nearby_shops") {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    const radius = input.radius != null ? Number(input.radius) : 500;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { content: "无法查询附近情报：缺少有效经纬度。" };
    }
    const data = await fetchReviewsByLocation(origin, lat, lng, Number.isFinite(radius) ? radius : 500);
    return {
      content: data.summary || "附近暂无可用情报。",
      meta: { count: data.count || 0, lat, lng, radius },
    };
  }

  if (toolName === "search_store_reviews") {
    const store = String(input.store || "").trim();
    if (!store) return { content: "无法查询店铺情报：缺少店铺关键词。" };
    const data = await fetchReviewsByStore(origin, store);
    return {
      content: data.summary || `还没有关于「${store}」的现成情报。`,
      meta: { count: data.count || 0, store },
    };
  }

  if (toolName === "get_personal_context") {
    return buildPersonalContextResult(memoryContext, trustContext, typeof input.focus === "string" ? input.focus : undefined);
  }

  return { content: `未知工具：${toolName}` };
}

async function callAnthropic(
  body: JsonRecord,
  allowToolFallback = false
): Promise<{ ok: true; data: JsonRecord } | { ok: false; status: number; text: string; toolUnsupported: boolean }> {
  const response = await fetch(`${API_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_TOKEN,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      status: response.status,
      text,
      toolUnsupported: allowToolFallback && isToolUseSupportedError(response.status, text),
    };
  }

  return { ok: true, data: await response.json() as JsonRecord };
}

async function runToolAgentFlow(args: {
  origin: string;
  messages: AnthropicMessage[];
  memoryContext?: string;
  trustContext?: JsonRecord;
  emit?: ProgressEmitter;
}) {
  const { origin, messages, memoryContext, trustContext, emit } = args;
  const workingMessages: AnthropicMessage[] = [...messages];
  const traces: AgentTraceEvent[] = [];
  let toolCalls = 0;

  await emitTrace(traces, emit, createTraceEvent("status", "我先想想要不要查点额外信息。"));

  for (let step = 0; step < 3; step++) {
    await emitTrace(traces, emit, createTraceEvent("status", `第 ${step + 1} 轮判断：看看需不需要调用工具。`));
    const result = await callAnthropic({
      model: MODEL_NAME,
      max_tokens: 1024,
      system: TOOL_SYSTEM_PROMPT,
      messages: workingMessages,
      tools: AGENT_TOOLS,
    }, true);

    if (!result.ok) {
      if (result.toolUnsupported) {
        await emitTrace(traces, emit, createTraceEvent("mode", "当前代理接口不支持原生 tool_use，我切换到后端编排继续查。", undefined, { reason: "tool_use_unsupported" }));
        return { mode: "fallback" as const, traces, toolCalls };
      }
      throw new Error(`API ${result.status}: ${result.text}`);
    }

    const responseBlocks = Array.isArray(result.data.content) ? result.data.content as JsonRecord[] : [];
    const toolBlocks = responseBlocks.filter((block) => block.type === "tool_use");

    if (toolBlocks.length === 0) {
      await emitTrace(
        traces,
        emit,
        createTraceEvent(
          "mode",
          toolCalls > 0 ? `工具调用完成，我已经拿到需要的信息了。` : "这次我不需要查工具，直接回答你就够了。",
          undefined,
          { mode: "tool_use", toolCalls }
        )
      );
      return {
        mode: "tool_use" as const,
        data: result.data,
        traces,
        toolCalls,
      };
    }

    workingMessages.push({ role: "assistant", content: responseBlocks });

    const toolResults: JsonRecord[] = [];
    for (const block of toolBlocks) {
      const toolName = typeof block.name === "string" ? block.name : "";
      const toolInput = typeof block.input === "object" && block.input !== null ? block.input as JsonRecord : {};
      const toolUseId = typeof block.id === "string" ? block.id : `tool-${Date.now()}`;
      await emitTrace(traces, emit, createTraceEvent("tool_use", formatToolStart(toolName, toolInput), toolName, { input: toolInput, step: step + 1 }));
      const toolOutput = await executeToolCall(origin, toolName, toolInput, memoryContext, trustContext);
      toolCalls += 1;
      await emitTrace(traces, emit, createTraceEvent("tool_result", formatToolResult(toolName, toolOutput), toolName, { output: toolOutput.meta || {}, step: step + 1 }));
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUseId,
        content: JSON.stringify(toolOutput, null, 2),
      });
    }

    workingMessages.push({ role: "user", content: toolResults });
  }

  await emitTrace(traces, emit, createTraceEvent("mode", "我查了几轮还是不够稳，改用后端编排再补一层。", undefined, { reason: "max_rounds" }));
  return { mode: "fallback" as const, traces, toolCalls };
}

async function runFallbackFlow(args: {
  origin: string;
  message: string;
  memoryContext?: string;
  image?: { mediaType: string; data: string };
  location?: string;
  lat?: number | null;
  lng?: number | null;
  history?: Array<{ role: string; content: unknown }>;
  conversationRound?: number;
  trustContext?: JsonRecord;
  emit?: ProgressEmitter;
}) {
  const { origin, message, memoryContext, image, location, lat, lng, history, conversationRound, trustContext, emit } = args;
  const traces: AgentTraceEvent[] = [];
  let toolCalls = 0;
  const content: JsonRecord[] = buildUserContent({ message, conversationRound, image, location, lat, lng });

  let orchestratedContext = "";
  const mentionedStore = extractStoreOrArea(message);

  await emitTrace(traces, emit, createTraceEvent("mode", "我改用后端编排帮你查资料，这次也会把过程告诉你。", undefined, { mode: "fallback" }));

  if (lat != null && lng != null) {
    try {
      await emitTrace(traces, emit, createTraceEvent("tool_use", "我先替你查附近的消费情报。", "search_nearby_shops", { lat, lng, radius: 500 }));
      const nearby = await executeToolCall(origin, "search_nearby_shops", { lat, lng, radius: 500 }, memoryContext, trustContext);
      toolCalls += 1;
      await emitTrace(traces, emit, createTraceEvent("tool_result", formatToolResult("search_nearby_shops", nearby), "search_nearby_shops", nearby.meta));
      orchestratedContext += `<agent_nearby>\n${nearby.content}\n</agent_nearby>\n\n`;
    } catch { /* ignore */ }
  }

  if (mentionedStore) {
    try {
      await emitTrace(traces, emit, createTraceEvent("tool_use", `我去翻一下「${mentionedStore}」的店铺情报。`, "search_store_reviews", { store: mentionedStore }));
      const storeIntel = await executeToolCall(origin, "search_store_reviews", { store: mentionedStore }, memoryContext, trustContext);
      toolCalls += 1;
      await emitTrace(traces, emit, createTraceEvent("tool_result", formatToolResult("search_store_reviews", storeIntel), "search_store_reviews", storeIntel.meta));
      orchestratedContext += `<agent_store>\n${storeIntel.content}\n</agent_store>\n\n`;
    } catch { /* ignore */ }
  }

  if (memoryContext) {
    await emitTrace(traces, emit, createTraceEvent("tool_use", "我顺手回忆一下你最近聊过什么。", "get_personal_context"));
    const personal = buildPersonalContextResult(memoryContext, trustContext, "最近消费、情绪和承诺");
    toolCalls += 1;
    await emitTrace(traces, emit, createTraceEvent("tool_result", formatToolResult("get_personal_context", personal), "get_personal_context", personal.meta));
    orchestratedContext += `<agent_personal>\n${personal.content}\n</agent_personal>\n\n`;
  }

  let textContent = "";
  if (conversationRound != null) {
    textContent += `<conversation_round>${conversationRound}</conversation_round>\n\n`;
  }
  if (orchestratedContext) {
    textContent += `${orchestratedContext}`;
  }
  if (image) {
    textContent += `[用户发送了一张照片（可能是小票、外卖截图、购物照片等）。请：1) 分析消费金额和动机；2) 尽可能提取店铺名、具体商品名、价格，如果都能提取到就输出 [REVIEW] 标签]\n\n`;
  }
  if (location) {
    textContent += `[用户当前位置：${location}，请结合地点场景丰富叙事]\n\n`;
  }
  if (lat != null && lng != null) {
    textContent += `[本轮对话的空间锚点：lat=${lat}, lng=${lng}。如果用户在问“这附近 / 这里 / 这片区域怎么样”，请优先基于这组坐标附近的真实消费情报回答。]\n\n`;
  }
  textContent += `用户说：${message}`;
  content[content.length - 1] = { type: "text", text: textContent };

  const messages: AnthropicMessage[] = buildHistoryMessages(history, Boolean(image));

  messages.push({ role: "user", content });

  await emitTrace(traces, emit, createTraceEvent("status", "资料够了，我开始整理成一句像样的话。"));

  const result = await callAnthropic({
    model: MODEL_NAME,
    max_tokens: 1024,
    system: TOOL_SYSTEM_PROMPT,
    messages,
  });

  if (!result.ok) {
    throw new Error(`API ${result.status}: ${result.text}`);
  }

  return { data: result.data, traces, toolCalls };
}

async function finalizeChatResponse(args: {
  data: JsonRecord;
  origin: string;
  lat?: number | null;
  lng?: number | null;
  trustContext?: JsonRecord;
  agent: { mode: AgentExecutionMode; toolCalls: number; traces: AgentTraceEvent[] };
}): Promise<ChatResponsePayload> {
  const { data, origin, lat, lng, trustContext, agent } = args;
  const responseText = extractTextFromBlocks(data.content);

  let commitment: string | null = null;
  let commitmentFulfilled: string | null = null;
  let commitmentBroken: string | null = null;
  let pattern: { category: string; description: string } | null = null;
  let userTrait: { category: string; description: string } | null = null;
  let spending: { amount: number; category: string; motive: string } | null = null;
  let triggerChain: { trigger: string; behavior: string } | null = null;
  let review: { storeName: string; productName: string; price: number; sentiment: string; motiveConfidence: string; comment: string } | null = null;
  let verify: { storeName: string; productName: string; newSentiment: string } | null = null;

  const commitMatch = responseText.match(/\[COMMITMENT\]:\s*(.+)/);
  if (commitMatch) commitment = commitMatch[1].trim();

  const fulfilledMatch = responseText.match(/\[COMMITMENT_FULFILLED\]:\s*(.+)/);
  if (fulfilledMatch) commitmentFulfilled = fulfilledMatch[1].trim();

  const brokenMatch = responseText.match(/\[COMMITMENT_BROKEN\]:\s*(.+)/);
  if (brokenMatch) commitmentBroken = brokenMatch[1].trim();

  const patternMatch = responseText.match(/\[PATTERN\]:\s*(\w+)\|(.+)/);
  if (patternMatch) {
    pattern = { category: patternMatch[1].trim(), description: patternMatch[2].trim() };
  }

  const traitMatch = responseText.match(/\[USER_TRAIT\]:\s*(\w+)\|(.+)/);
  if (traitMatch) {
    userTrait = { category: traitMatch[1].trim(), description: traitMatch[2].trim() };
  }

  const spendingMatch = responseText.match(/\[SPENDING\]:\s*(\d+(?:\.\d+)?)\|(\w+)\|(\w+)/);
  if (spendingMatch) {
    spending = {
      amount: parseFloat(spendingMatch[1]),
      category: spendingMatch[2].trim(),
      motive: spendingMatch[3].trim(),
    };
  }

  const chainMatch = responseText.match(/\[TRIGGER_CHAIN\]:\s*(.+?)\|(.+)/);
  if (chainMatch) {
    triggerChain = { trigger: chainMatch[1].trim(), behavior: chainMatch[2].trim() };
  }

  const reviewMatch = responseText.match(/\[REVIEW\]:\s*(.+?)\|(.+?)\|(\d+(?:\.\d+)?)\|(\w+)\|(\w+)\|(.+)/);
  if (reviewMatch) {
    review = {
      storeName: reviewMatch[1].trim(),
      productName: reviewMatch[2].trim(),
      price: parseFloat(reviewMatch[3]),
      sentiment: reviewMatch[4].trim(),
      motiveConfidence: reviewMatch[5].trim(),
      comment: reviewMatch[6].trim(),
    };
    fetch(`${origin}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...review,
        motive: spending?.motive || "habitual",
        category: spending?.category || "other",
        lat: lat || undefined,
        lng: lng || undefined,
        trustContext: trustContext || undefined,
      }),
    }).catch(() => {});
  }

  const verifyMatch = responseText.match(/\[VERIFY\]:\s*(.+?)\|(.+?)\|(\w+)/);
  if (verifyMatch) {
    verify = {
      storeName: verifyMatch[1].trim(),
      productName: verifyMatch[2].trim(),
      newSentiment: verifyMatch[3].trim(),
    };
    fetch(`${origin}/api/reviews`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: verify.storeName,
        productName: verify.productName,
        newSentiment: verify.newSentiment !== "unchanged" ? verify.newSentiment : undefined,
        verified: true,
      }),
    }).catch(() => {});
  }

  const cleanText = responseText
    .replace(/\n?\[COMMITMENT\]:\s*.+/g, "")
    .replace(/\n?\[COMMITMENT_FULFILLED\]:\s*.+/g, "")
    .replace(/\n?\[COMMITMENT_BROKEN\]:\s*.+/g, "")
    .replace(/\n?\[PATTERN\]:\s*.+/g, "")
    .replace(/\n?\[USER_TRAIT\]:\s*.+/g, "")
    .replace(/\n?\[SPENDING\]:\s*.+/g, "")
    .replace(/\n?\[TRIGGER_CHAIN\]:\s*.+/g, "")
    .replace(/\n?\[REVIEW\]:\s*.+/g, "")
    .replace(/\n?\[VERIFY\]:\s*.+/g, "")
    .replace(/\n?\[INTEL\]:\s*.+/g, "")
    .trim();
  const normalizedText = stripMarkdownFormatting(cleanText);

  return {
    text: normalizedText,
    commitment,
    commitmentFulfilled,
    commitmentBroken,
    pattern,
    userTrait,
    spending,
    triggerChain,
    review,
    verify,
    agent,
  };
}

async function runChatPipeline(args: {
  request: ChatRequestPayload;
  origin: string;
  emit?: ProgressEmitter;
}): Promise<ChatResponsePayload> {
  const { request, origin, emit } = args;
  const { message, memoryContext, image, history, location, lat, lng, trustContext, conversationRound } = request;
  const content = buildUserContent({ message, conversationRound, image, location, lat, lng });
  const messages = buildHistoryMessages(history, Boolean(image));
  messages.push({ role: "user", content });

  const toolFlowResult = await runToolAgentFlow({
    origin,
    messages,
    memoryContext,
    trustContext,
    emit,
  });

  if (toolFlowResult.mode === "tool_use") {
    return finalizeChatResponse({
      data: toolFlowResult.data,
      origin,
      lat,
      lng,
      trustContext,
      agent: {
        mode: "tool_use",
        toolCalls: toolFlowResult.toolCalls,
        traces: toolFlowResult.traces,
      },
    });
  }

  const fallbackResult = await runFallbackFlow({
    origin,
    message,
    memoryContext,
    image: image ?? undefined,
    location: location ?? undefined,
    lat,
    lng,
    history,
    conversationRound: conversationRound ?? undefined,
    trustContext,
    emit,
  });

  return finalizeChatResponse({
    data: fallbackResult.data,
    origin,
    lat,
    lng,
    trustContext,
    agent: {
      mode: "fallback",
      toolCalls: toolFlowResult.toolCalls + fallbackResult.toolCalls,
      traces: [...toolFlowResult.traces, ...fallbackResult.traces],
    },
  });
}

function createStreamResponse(request: ChatRequestPayload, origin: string) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (payload: JsonRecord) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          const finalPayload = await runChatPipeline({
            request,
            origin,
            emit: async (event) => {
              send({ type: "progress", event });
            },
          });
          send({ type: "final", data: finalPayload });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to get response";
          send({ type: "error", error: message });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const request = await req.json() as ChatRequestPayload;
    const origin = req.nextUrl.origin;
    if (request.stream) {
      return createStreamResponse(request, origin);
    }

    const payload = await runChatPipeline({ request, origin });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}

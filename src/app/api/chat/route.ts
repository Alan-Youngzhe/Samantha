import { SYSTEM_PROMPT } from "@/lib/prompt";
import { amapGet } from "@/lib/amap-proxy";
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
- **主动查天气**：每次对话开始或用户讨论出门计划时，主动调用 get_weather，把天气信息自然融入回复（比如「外面在下雨，记得带伞」「今天挺暖和的，适合出去逛」）。不要等用户问。
- **主动估路程**：当你推荐了某家店、讨论某个地点、或用户提到想去哪里时，主动调用 get_route 告诉用户过去要多久（比如「走过去大概 8 分钟」）。不要等用户问远不远。
- **主动补详情**：当对话涉及某家具体店铺时，主动调用 get_place_detail 获取营业时间、评分等信息，自然地融入回复。
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
  {
    name: "get_route",
    description: "查询从用户当前位置到目的地的步行或公交路线，返回距离和时长。当你推荐了某家店或用户提到某个地点时，主动调用来告诉用户过去要多久。",
    input_schema: {
      type: "object",
      properties: {
        origin_lat: { type: "number", description: "起点纬度（用户当前位置）" },
        origin_lng: { type: "number", description: "起点经度" },
        dest_lat: { type: "number", description: "终点纬度" },
        dest_lng: { type: "number", description: "终点经度" },
        dest_name: { type: "string", description: "目的地名称" },
        mode: { type: "string", enum: ["walk", "transit"], description: "出行方式：walk 步行 / transit 公交，默认 walk" },
      },
      required: ["origin_lat", "origin_lng", "dest_lat", "dest_lng"],
    },
  },
  {
    name: "get_weather",
    description: "查询当前城市天气和未来几天预报。每次对话开始时主动调用，在回复中自然地提醒用户天气状况，比如要带伞、有点冷、适合出门等。",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "城市 adcode，默认上海 310000" },
      },
    },
  },
  {
    name: "get_place_detail",
    description: "查询某家店铺的详细信息，包括营业时间、电话、评分、均价、图片。当推荐店铺或讨论某家店时主动调用，把关键信息自然融入回复。需要先通过 search_nearby_shops 获得 poi_id。",
    input_schema: {
      type: "object",
      properties: {
        poi_id: { type: "string", description: "高德 POI ID" },
      },
      required: ["poi_id"],
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

function stripInternalMarkers(text: string): string {
  return text
    .replace(/\s*\[[A-Z][A-Z0-9_]{2,}\]/g, "")
    .replace(/[ \t]+([，。！？；：,.!?;:])/g, "$1")
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
  if (toolName === "get_route") {
    const dest = input.dest_name ? `去${input.dest_name}` : "到目的地";
    const mode = input.mode === "transit" ? "公交" : "步行";
    return `我帮你看看${mode}${dest}怎么走。`;
  }
  if (toolName === "get_weather") {
    return "我去查一下今天的天气。";
  }
  if (toolName === "get_place_detail") {
    return "我去翻翻这家店的详细资料。";
  }
  return `我在调用 ${toolName}。`;
}

function formatToolResult(toolName: string, output: ToolResultPayload): string {
  const reviewCount = Number(output.meta?.reviewCount ?? output.meta?.count ?? 0);
  const poiCount = Number(output.meta?.poiCount ?? 0);
  if (toolName === "search_nearby_shops") {
    const parts: string[] = [];
    if (reviewCount > 0) parts.push(`${reviewCount} 条消费情报`);
    if (poiCount > 0) parts.push(`${poiCount} 家实时店铺`);
    return parts.length > 0 ? `我找到了附近 ${parts.join(" + ")}。` : "附近暂时没翻到太有用的情报。";
  }
  if (toolName === "search_store_reviews") {
    if (reviewCount > 0) return `这家店我翻到了 ${reviewCount} 条相关情报。`;
    if (poiCount > 0) return `社区暂无情报，但高德找到了 ${poiCount} 家相关店铺。`;
    return "这家店我暂时还没查到现成情报。";
  }
  if (toolName === "get_personal_context") {
    return "我把你最近的聊天线索重新串起来了。";
  }
  if (toolName === "get_route") {
    const dist = output.meta?.distance;
    const dur = output.meta?.duration;
    if (dist && dur) return `${output.meta?.mode === "transit" ? "公交" : "步行"}约 ${dur} 分钟，${dist}。`;
    return "查到路线了。";
  }
  if (toolName === "get_weather") {
    const weather = output.meta?.weather;
    const temp = output.meta?.temperature;
    if (weather) return `今天${weather}，${temp || ""}。`;
    return "查到天气了。";
  }
  if (toolName === "get_place_detail") {
    const name = output.meta?.name;
    return name ? `找到了「${name}」的详细资料。` : "找到详细资料了。";
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

async function fetchPoiNearby(origin: string, lat: number, lng: number, radius = 1000) {
  try {
    const res = await fetch(`${origin}/api/poi?lat=${lat}&lng=${lng}&radius=${radius}&types=050000|050500|060100`);
    if (!res.ok) return { pois: [] };
    return res.json();
  } catch { return { pois: [] }; }
}

async function fetchPoiByKeyword(origin: string, keyword: string) {
  try {
    const res = await fetch(`${origin}/api/poi?keyword=${encodeURIComponent(keyword)}&types=050000|050500|060100`);
    if (!res.ok) return { pois: [] };
    return res.json();
  } catch { return { pois: [] }; }
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
    const [reviewData, poiData] = await Promise.all([
      fetchReviewsByLocation(origin, lat, lng, Number.isFinite(radius) ? radius : 500),
      fetchPoiNearby(origin, lat, lng, Math.max(Number.isFinite(radius) ? radius : 500, 1000)),
    ]);
    const pois = (poiData.pois || []) as Array<{ name: string; category: string; address: string; rating?: number; avgPrice?: number; distance?: number }>;
    const parts: string[] = [];
    if (reviewData.summary) parts.push("【社区消费情报】\n" + reviewData.summary);
    if (pois.length > 0) {
      const poiLines = pois.slice(0, 15).map((p) => {
        const tags: string[] = [p.category, p.address];
        if (p.rating) tags.push(`评分${p.rating}`);
        if (p.avgPrice) tags.push(`均价¥${p.avgPrice}`);
        if (p.distance) tags.push(`${p.distance}m`);
        return `- ${p.name}（${tags.join("，")}）`;
      });
      parts.push("【高德实时店铺】\n" + poiLines.join("\n"));
    }
    return {
      content: parts.join("\n\n") || "附近暂无可用情报。",
      meta: { reviewCount: reviewData.count || 0, poiCount: pois.length, lat, lng, radius },
    };
  }

  if (toolName === "search_store_reviews") {
    const store = String(input.store || "").trim();
    if (!store) return { content: "无法查询店铺情报：缺少店铺关键词。" };
    const reviewData = await fetchReviewsByStore(origin, store);
    if (reviewData.count > 0) {
      return {
        content: reviewData.summary || `关于「${store}」的情报。`,
        meta: { count: reviewData.count, store },
      };
    }
    const poiData = await fetchPoiByKeyword(origin, store);
    const pois = (poiData.pois || []) as Array<{ name: string; category: string; address: string; rating?: number; avgPrice?: number; distance?: number }>;
    if (pois.length > 0) {
      const lines = pois.slice(0, 5).map((p) => {
        const tags: string[] = [p.address];
        if (p.rating) tags.push(`评分${p.rating}`);
        if (p.avgPrice) tags.push(`均价¥${p.avgPrice}`);
        return `- ${p.name}（${tags.join("，")}）`;
      });
      return {
        content: `社区还没有关于「${store}」的消费情报，但高德显示附近有这些店：\n${lines.join("\n")}`,
        meta: { count: 0, poiCount: pois.length, store },
      };
    }
    return {
      content: `还没有关于「${store}」的现成情报，高德也没有找到匹配的店铺。`,
      meta: { count: 0, store },
    };
  }

  if (toolName === "get_personal_context") {
    return buildPersonalContextResult(memoryContext, trustContext, typeof input.focus === "string" ? input.focus : undefined);
  }

  if (toolName === "get_route") {
    const oLat = Number(input.origin_lat);
    const oLng = Number(input.origin_lng);
    const dLat = Number(input.dest_lat);
    const dLng = Number(input.dest_lng);
    const destName = String(input.dest_name || "目的地");
    const mode = input.mode === "transit" ? "transit" : "walk";
    if (!Number.isFinite(oLat) || !Number.isFinite(oLng) || !Number.isFinite(dLat) || !Number.isFinite(dLng)) {
      return { content: "无法查询路线：缺少有效坐标。" };
    }
    try {
      if (mode === "walk") {
        const data = await amapGet("/v3/direction/walking", {
          origin: `${oLng},${oLat}`,
          destination: `${dLng},${dLat}`,
        });
        const route = data.route as Record<string, unknown> || {};
        const paths = (route.paths || []) as Array<Record<string, unknown>>;
        if (paths.length > 0) {
          const p = paths[0];
          const dist = Number(p.distance || 0);
          const dur = Math.round(Number(p.duration || 0) / 60);
          const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)}公里` : `${dist}米`;
          const steps = ((p.steps || []) as Array<Record<string, string>>).slice(0, 5).map(s => s.instruction).filter(Boolean);
          return {
            content: `步行到${destName}：约 ${distStr}，${dur} 分钟。\n路线：${steps.join(" → ") || "直线距离较近"}`,
            meta: { distance: distStr, duration: dur, mode: "walk" },
          };
        }
      } else {
        const data = await amapGet("/v3/direction/transit/integrated", {
          origin: `${oLng},${oLat}`,
          destination: `${dLng},${dLat}`,
          city: "上海",
          cityd: "上海",
        });
        const route = data.route as Record<string, unknown> || {};
        const transits = (route.transits || []) as Array<Record<string, unknown>>;
        if (transits.length > 0) {
          const t = transits[0];
          const dist = Number(t.distance || 0);
          const dur = Math.round(Number(t.duration || 0) / 60);
          const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)}公里` : `${dist}米`;
          const cost = t.cost ? `${t.cost}元` : "";
          return {
            content: `公交到${destName}：约 ${distStr}，${dur} 分钟${cost ? `，费用约${cost}` : ""}。`,
            meta: { distance: distStr, duration: dur, mode: "transit" },
          };
        }
      }
      return { content: `没有找到到${destName}的${mode === "walk" ? "步行" : "公交"}路线。` };
    } catch {
      return { content: "路线查询失败，稍后再试。" };
    }
  }

  if (toolName === "get_weather") {
    const city = String(input.city || "310000");
    try {
      const data = await amapGet("/v3/weather/weatherInfo", {
        city,
        extensions: "all",
      });
      const forecasts = (data.forecasts || []) as Array<Record<string, unknown>>;
      if (forecasts.length > 0) {
        const f = forecasts[0];
        const casts = ((f.casts || []) as Array<Record<string, string>>).slice(0, 4);
        const today = casts[0];
        const lines = casts.map(c =>
          `${c.date}：${c.dayweather}/${c.nightweather}，${c.daytemp}°~${c.nighttemp}°，${c.daywind}风${c.daypower}级`
        );
        return {
          content: `${f.city} 天气预报：\n${lines.join("\n")}`,
          meta: { weather: today?.dayweather, temperature: today ? `${today.daytemp}°~${today.nighttemp}°` : "", city: f.city },
        };
      }
      return { content: "没有查到天气数据。" };
    } catch {
      return { content: "天气查询失败，稍后再试。" };
    }
  }

  if (toolName === "get_place_detail") {
    const poiId = String(input.poi_id || "").trim();
    if (!poiId) return { content: "缺少店铺 ID。" };
    try {
      const data = await amapGet("/v3/place/detail", { id: poiId });
      const pois = (data.pois || []) as Array<Record<string, unknown>>;
      if (pois.length > 0) {
        const p = pois[0];
        const bizExt = (p.biz_ext || {}) as Record<string, string>;
        const photos = ((p.photos || []) as Array<Record<string, string>>).slice(0, 3).map(ph => ph.url).filter(Boolean);
        const parts: string[] = [`店名：${p.name}`];
        if (p.address) parts.push(`地址：${p.address}`);
        if (p.tel) parts.push(`电话：${p.tel}`);
        if (bizExt.rating) parts.push(`评分：${bizExt.rating}`);
        if (bizExt.cost) parts.push(`均价：¥${bizExt.cost}`);
        if (bizExt.opentime || bizExt.open_time) parts.push(`营业时间：${bizExt.opentime || bizExt.open_time}`);
        if (photos.length > 0) parts.push(`图片：${photos.join(" | ")}`);
        return {
          content: parts.join("\n"),
          meta: { name: p.name, poiId, hasPhotos: photos.length > 0 },
        };
      }
      return { content: "没有找到这家店的详细信息。" };
    } catch {
      return { content: "店铺详情查询失败，稍后再试。" };
    }
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
  const normalizedText = stripInternalMarkers(stripMarkdownFormatting(cleanText));

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

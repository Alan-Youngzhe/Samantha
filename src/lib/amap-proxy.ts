const BASE_URL = "https://amap.bangban.cc/_AMapService";
const DEFAULT_KEY = "b66d4f5c2505a4f6199fb53d39f696d9";

function buildCommonParams(): Record<string, string> {
  return {
    platform: "JS",
    s: "rsv3",
    logversion: "2.0",
    key: DEFAULT_KEY,
    sdkversion: "2.3.5.6",
    appname: "https%3A%2F%2Famap.bangban.cc%2Fdt.html",
    language: "zh_cn",
    csid: crypto.randomUUID().replace(/-/g, ""),
  };
}

function buildHeaders(): Record<string, string> {
  return {
    Referer: `https://amap.bangban.cc/dt.html?time=${Math.floor(Date.now() / 1000)}`,
    "User-Agent": "Mozilla/5.0",
    "X-Requested-With": "com.bangban.cc",
  };
}

function parseBody(text: string): Record<string, unknown> {
  const body = text.trim();
  if (body.startsWith("{") || body.startsWith("[")) {
    return JSON.parse(body);
  }
  if (body.includes("(") && body.endsWith(")")) {
    const left = body.indexOf("(");
    return JSON.parse(body.slice(left + 1, -1).trim());
  }
  throw new Error("response is neither JSON nor JSONP");
}

export async function amapGet(
  path: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const allParams = { ...buildCommonParams(), ...params };
  const qs = new URLSearchParams(allParams).toString();
  const url = `${BASE_URL}${path}?${qs}`;

  const res = await fetch(url, {
    headers: buildHeaders(),
  });

  const text = await res.text();
  const payload = parseBody(text);

  if (String(payload.status) !== "1") {
    throw new Error(String(payload.info || "amap proxy error"));
  }

  return payload;
}

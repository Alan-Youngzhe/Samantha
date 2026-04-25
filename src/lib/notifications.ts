// Samantha 推送通知系统 — 主动找用户

const SW_PATH = "/sw.js";

/** 注册 Service Worker */
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH);
    return reg;
  } catch {
    return null;
  }
}

/** 请求通知权限 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/** 发送本地推送（不需要服务器，直接通过 SW 显示） */
export async function sendLocalNotification(
  title: string,
  body: string,
  url: string = "/"
): Promise<void> {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg) return;
  await reg.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "sam-proactive",
    data: { url },
  } as NotificationOptions);
}

/** 
 * 调度 Samantha 的定时推送
 * 基于用户的消费模式，在高风险时段推送
 */
export function scheduleSamNotifications(): void {
  if (typeof window === "undefined") return;

  // 每小时检查一次是否应该推送
  const INTERVAL = 60 * 60 * 1000; // 1h
  const CHECK_KEY = "bz-notif-last-check";

  function check() {
    const lastCheck = localStorage.getItem(CHECK_KEY);
    const now = Date.now();
    if (lastCheck && now - parseInt(lastCheck) < INTERVAL) return;
    localStorage.setItem(CHECK_KEY, String(now));

    const hour = new Date().getHours();
    const day = new Date().getDay();

    // 高风险时段推送
    const messages: { hour: number[]; day?: number[]; text: string }[] = [
      { hour: [12, 13], text: "午饭时间。我猜你正在看外卖 App？" },
      { hour: [22, 23], text: "深夜了。购物车打开了吗？" },
      { hour: [17, 18], day: [5], text: "周五下班了。你打算怎么'犒劳自己'？" },
      { hour: [14, 15], day: [6, 0], text: "周末下午。逛街的欲望开始了吧。" },
    ];

    for (const m of messages) {
      if (!m.hour.includes(hour)) continue;
      if (m.day && !m.day.includes(day)) continue;

      // 每个消息类型每天只推一次
      const msgKey = `bz-notif-${m.text.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`;
      if (localStorage.getItem(msgKey)) continue;
      localStorage.setItem(msgKey, "1");

      sendLocalNotification("Samantha", m.text);
      break; // 每次最多推一条
    }
  }

  // 立即检查一次，然后每 30 分钟检查
  check();
  setInterval(check, 30 * 60 * 1000);
}

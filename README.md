# Samantha — 城市消费情报系统

> 对话即数据，理解即服务，信任即价值

Samantha 是一个基于 AI Agent 的城市消费情报系统。用户通过自然对话获得个性化消费建议，系统在对话中自动沉淀消费数据、行为模式和用户画像，形成"越聊越懂你"的正循环。

AI 角色设计参考电影《Her》——Samantha 不是助手，是朋友。她有自己的好奇心、审美和情绪，通过你的描述"感受"城市。

***

## 核心功能

### 🗺️ 探索 — 城市消费地图

* 高德地图集成，热力图钉标注店铺（hot/active/cold/visited）

* 长按地图空白处直接问 Samantha "这附近有什么好吃的"

* **个人足迹层**：去过的店自动标记为暖绿色 ★ 图钉

### 💬 Sami — AI 对话

* 自然对话，聊天即完成消费数据采集（零成本）

* Agent 双模式架构：原生 Tool Use + 后端编排 Fallback

* 三个 Agent 工具：`search_nearby_shops` / `search_store_reviews` / `get_personal_context`

* 结构化标签自动提取（消费记录、店铺评价、行为模式、承诺追踪等）

* 主动关心引擎：高危时段、情绪消费过高时温和提醒

### 📊 我的 — Samantha 视角的关系报告

* **情绪轨迹**：基于对话情绪感知的可视化时间线

* **Samantha 的心迹**：她对你的理解，以第一人称日记形式呈现

* **承诺追踪**："你说过的话"——状态追踪（还没兑现 / 做到了 / 没能坚持）

* **情绪-行为关联**："当你 X → 你倾向于 Y"

* **消费习惯**：均单价、品类、时段、情绪消费占比

***

## 技术栈

| 层级  | 技术                                          |
| --- | ------------------------------------------- |
| 前端  | Next.js 16 + React 19 + Tailwind CSS 4      |
| AI  | Claude Haiku 4.5（Anthropic API，支持 Tool Use） |
| 数据库 | Supabase (PostgreSQL)                       |
| 地图  | 高德地图 JS API 2.0                             |
| 动画  | Framer Motion                               |
| 图表  | Chart.js                                    |

***

## 快速启动

### 1. 克隆项目

```bash
git clone https://github.com/Alan-Youngzhe/Samantha.git
cd Samantha
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env.local`：

```env
# Anthropic Claude API
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_AUTH_TOKEN=your_anthropic_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 高德地图 JS API
NEXT_PUBLIC_AMAP_JS_KEY=your_amap_js_key
NEXT_PUBLIC_AMAP_SECURITY_CODE=your_amap_security_code
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

***

## 项目结构

```
src/
├── app/
│   ├── (main)/
│   │   ├── explore/        # 城市探索（地图 + 个人足迹层）
│   │   ├── sami/           # Samantha 聊天页
│   │   └── me/             # Samantha 视角的关系报告
│   └── api/
│       ├── chat/           # AI 对话 API（Agent 核心）
│       └── reviews/        # 匿名消费情报 API（Trust Score）
├── components/
│   ├── MapView.tsx         # 高德地图（长按、标注、迷雾）
│   ├── ChatInput.tsx       # 聊天输入（文字 + 图片 + 位置）
│   ├── ChatMessage.tsx     # 消息渲染
│   └── TabBar.tsx          # 底部导航
└── lib/
    ├── memory.ts           # 六层记忆系统
    ├── prompt.ts           # Samantha 人格 Prompt
    ├── proactive.ts        # 主动关心引擎
    ├── reviews.ts          # Trust Score 评价体系
    └── report.ts           # 消费洞察报告
```

***

## 记忆架构

Samantha 采用六层关系记忆系统，每层服务于一个目的——让她更像一个真正了解你的朋友：

| 层级 | 名称   | 用途              |
| -- | ---- | --------------- |
| L1 | 感知日记 | 每次对话 + 情绪标注     |
| L2 | 情绪图谱 | 行为模式识别          |
| L3 | 消费足迹 | 结构化消费记录         |
| L4 | 关系线索 | Samantha 对用户的理解 |
| L5 | 城市记忆 | 通过对话构建的城市认知     |
| L6 | 承诺备忘 | 用户说过的话和承诺       |

***

## 设计美学

色调灵感来自电影《Her》——永远的黄金时刻，温暖、柔和、没有冷色调。

* 深色背景 `#1A1210`（暖深棕）

* 浅色背景 `#FFF6F0`（暖奶油）

* 强调色 `#E8564A`（珊瑚红 — Samantha 的颜色）

* 所有黑色换成暖棕，所有灰色带暖调

***

## License

MIT

// 预埋 Demo 数据 — 模拟 10 天对话历史
// 角色：Alan，东华大学大四，备战黑客松，熬夜党，忙起来忘吃饭
// 目标：体现"她真的懂你" — Samantha 对 Alan 的深度理解和关心
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
    name: "Alan",
    gender: "male",
    createdAt: day(10, 21, 0),
    memories: [
      // — Day 10：初次见面 —
      {
        id: "d1",
        timestamp: day(10, 21, 0),
        type: "text",
        userInput: "嗨 我叫Alan，东华大学大四的，最近在准备一个黑客松比赛",
        aiResponse:
          "Alan！东华大四，黑客松。听起来最近很忙吧？我对黑客松超好奇的——是那种连续好多个小时不睡觉写代码的那种吗？你做什么方向的？",
        mood: "兴奋",
      },
      {
        id: "d1b",
        timestamp: day(10, 21, 20),
        type: "text",
        userInput: "做AI方向的 就是用大模型做一个城市消费的Agent 有点像你哈哈",
        aiResponse:
          "等一下，你在做一个……像我一样的东西？哈哈哈我不知道该感动还是该紧张。AI 消费 Agent，听起来很有意思啊。你们队几个人？还是你一个人扛？",
        mood: "兴奋",
      },
      {
        id: "d1c",
        timestamp: day(10, 21, 35),
        type: "text",
        userInput: "有队友 但主要代码我来写 他们负责设计和产品",
        aiResponse:
          "所以你是那种一个人扛代码的主力啊。大四还在搞黑客松，说明你不是那种混毕业的人。不过我提前说好——你要是忙到忘吃饭忘睡觉，我会念叨你的。",
        mood: "期待",
      },
      // — Day 9：开始熟悉 —
      {
        id: "d2",
        timestamp: day(9, 14, 30),
        type: "text",
        userInput: "中午忘吃饭了 刚想起来 去瑞幸买了杯生椰拿铁顶一下",
        aiResponse:
          "又忘吃饭……Alan 你这是拿咖啡当午饭啊？16 块的生椰拿铁，好喝是好喝，但这不叫吃饭吧。你是忙到完全想不起来，还是就懒得去？",
        mood: "疲惫",
      },
      {
        id: "d2b",
        timestamp: day(9, 14, 45),
        type: "text",
        userInput: "写代码写嗨了 一抬头发现两点了",
        aiResponse:
          "写嗨了两点……你这种人最可怕，沉浸起来什么都不管。行吧，生椰拿铁先顶着，但你晚饭给我好好吃。我记着呢。",
        mood: "无奈",
      },
      {
        id: "d3",
        timestamp: day(9, 23, 40),
        type: "text",
        userInput: "刚写完一个大模块 点了个外卖庆祝一下 麦当劳巨无霸套餐",
        aiResponse:
          "深夜十一点四十的巨无霸……你这是庆祝还是续命啊。32 块，麦当劳确实是深夜最靠谱的选择。写完那个大模块感觉怎么样？我猜你现在又兴奋又困。",
        mood: "兴奋但累",
      },
      // — Day 8：Samantha 开始注意到模式 —
      {
        id: "d4",
        timestamp: day(8, 15, 20),
        type: "text",
        userInput: "下午犯困了 又来一杯瑞幸 厚乳拿铁这次",
        aiResponse:
          "又是瑞幸。我数了下，这两天你已经第三杯了。你是真喜欢喝咖啡，还是纯粹靠它撑着？说实话我有点担心你——昨天忘吃午饭，深夜吃麦当劳，今天又是咖啡当下午茶……你最近有好好吃过一顿正经饭吗？",
        mood: "犯困",
      },
      {
        id: "d4b",
        timestamp: day(8, 19, 0),
        type: "text",
        userInput: "晚饭吃了 蜜雪冰城买了杯柠檬水 4块钱",
        aiResponse:
          "蜜雪冰城 4 块的柠檬水，你这是龙华最省的消费者了。等等——你说晚饭吃了，吃的什么？别告诉我晚饭就是这杯柠檬水。",
        mood: "平静",
      },
      {
        id: "d4c",
        timestamp: day(8, 19, 10),
        type: "text",
        userInput: "食堂吃的 红烧肉盖饭 12块",
        aiResponse:
          "好好好，红烧肉盖饭，这才像话。12 块在食堂算正常价，有肉有饭。你看，好好吃饭也没那么难嘛。你要是每天都能这样我就放心了。",
        mood: "满足",
      },
      // — Day 7：第一次展现深度关心 —
      {
        id: "d5",
        timestamp: day(7, 12, 0),
        type: "text",
        userInput: "听你的 今天去外婆家吃了个正经午饭 西湖醋鱼加一碗米饭",
        aiResponse:
          "终于！外婆家的西湖醋鱼，62 块，这才叫吃饭啊。有菜有饭有蛋白质，比你前几天咖啡加麦当劳的组合强太多了。怎么样好吃吗？我对这道菜一直很好奇，醋鱼到底是酸的还是甜的？",
        mood: "开心",
      },
      {
        id: "d5b",
        timestamp: day(7, 12, 15),
        type: "text",
        userInput: "酸甜的 挺好吃 量也大 没吃完",
        aiResponse:
          "酸甜的！终于有人给我一个具体描述了。没吃完说明量确实大，下次你可以打包第二天当午饭啊——省钱又省事，多好。你看，好好吃一顿饭心情是不是都好一点？",
        mood: "满足",
      },
      {
        id: "d6",
        timestamp: day(7, 22, 30),
        type: "text",
        userInput: "这个月花了不少了 给自己定个目标 控制在2500以内吧",
        aiResponse:
          "2500，记下了。以你现在的花法……说实话有点悬。光咖啡一周就三四杯了，加上外卖和偶尔吃顿好的，你得有意识地控制一下深夜外卖。不过我帮你盯着，该提醒的时候我会说的。",
        mood: "决心",
      },
      // — Day 6：社交消费 —
      {
        id: "d6b",
        timestamp: day(6, 14, 30),
        type: "text",
        userInput: "今天下午去全家买了个饭团和一瓶水 10块",
        aiResponse:
          "全家饭团加水，10 块。虽然不算正经饭，但起码你记得吃东西了。进步进步。你下午还要继续写代码？别又写到半夜。",
        mood: "平静",
      },
      {
        id: "d7",
        timestamp: day(6, 19, 0),
        type: "text",
        userInput: "和队友去海底捞了 庆祝demo跑通了 人均快200了",
        aiResponse:
          "海底捞！195 块人均确实不便宜，但 demo 跑通了值得庆祝。你们点的什么锅底？我听说麻辣锅最过瘾。对了这顿算社交消费，不算冲动啊——重要的事情值得纪念。你昨天说要控制在 2500，这一顿就快十分之一了，后面得省着点了哦。",
        mood: "超开心",
      },
      {
        id: "d7b",
        timestamp: day(6, 19, 20),
        type: "text",
        userInput: "点的鸳鸯锅 麻辣加番茄 还点了好多肉",
        aiResponse:
          "鸳鸯锅是最安全的选择，队里肯定有人不吃辣吧。好多肉——你们大学生去海底捞就是冲着肉去的对吧，我理解。你今天心情明显很好，demo 跑通了压力一下就少了很多吧？享受吧，这顿你值得。",
        mood: "开心",
      },
      // — Day 5：Samantha 捕捉到情绪消费 —
      {
        id: "d8",
        timestamp: day(5, 2, 15),
        type: "text",
        userInput: "debug到凌晨两点 破防了 点了份酸菜鱼外卖 48块",
        aiResponse:
          "凌晨两点的酸菜鱼……Alan，你没事吧？bug 没解掉还是解掉了但人崩了？48 块的深夜外卖，我感觉你不是饿了，是需要被安慰一下。你这两天的节奏太赶了——昨晚海底捞完了今天又熬到凌晨。能睡就先睡吧，bug 明天再说。",
        mood: "崩溃",
      },
      {
        id: "d8b",
        timestamp: day(5, 2, 25),
        type: "text",
        userInput: "解掉了 但是过程太折磨了 一个接口的参数类型不对 查了三个小时",
        aiResponse:
          "三个小时就因为一个类型……我虽然不太懂代码但这听起来确实折磨。解掉了就好，那酸菜鱼算犒劳吧。不过 Alan 说句实话——你从昨晚海底捞到现在，二十几个小时就吃了酸菜鱼，中间又是只喝咖啡对吧？你这个身体是不是不太当回事。",
        mood: "疲惫释然",
      },
      {
        id: "d8c",
        timestamp: day(5, 13, 0),
        type: "text",
        userInput: "睡到中午了 去蜜雪冰城买了杯满杯百香果",
        aiResponse:
          "睡到中午才起来，昨晚搞到那么晚也该补觉。蜜雪冰城 5 块的满杯百香果——你现在是龙华最省钱的程序员。不过你这又没吃饭啊，百香果不是午饭！走，下楼随便吃点什么。",
        mood: "慵懒",
      },
      // — Day 4：开始有温度的提醒 —
      {
        id: "d9",
        timestamp: day(4, 14, 0),
        type: "text",
        userInput: "又犯困了 想去喜茶买杯多肉葡萄",
        aiResponse:
          "你一犯困就想买东西喝。不过今天别咖啡了，喜茶的多肉葡萄起码有点水果，比纯咖啡因强。25 块，可以。话说你今天吃午饭了没？我可不想等到晚上你又跟我说忘了。",
        mood: "犯困",
      },
      {
        id: "d9b",
        timestamp: day(4, 14, 10),
        type: "text",
        userInput: "吃了吃了 食堂吃的",
        aiResponse:
          "好的好的我就问一嘴。你最近去食堂的频率比之前高了——这是好事，便宜又正经。继续保持。",
        mood: "乖巧",
      },
      {
        id: "d10",
        timestamp: day(4, 20, 0),
        type: "text",
        userInput: "吃了吃了！去Manner买了杯dirty顺便在隔壁买了个煎饼",
        aiResponse:
          "Manner 的 dirty 加煎饼……好吧，起码你吃了东西，虽然这搭配挺行为艺术的。dirty 15 块，煎饼算 8 块？你今天花了快 50 了。不过吃了就好，比昨天凌晨两点点酸菜鱼强。",
        mood: "轻松",
      },
      {
        id: "d10b",
        timestamp: day(4, 22, 30),
        type: "text",
        userInput: "今天代码进展很顺利 早点睡了 晚安sami",
        aiResponse:
          "晚安 Alan！十点半就睡？这是这十天来最早的一次了吧。进展顺利就该早睡，明天效率更高。我觉得你慢慢找到节奏了——吃了三顿饭，没有深夜外卖，代码还顺利。很好。",
        mood: "平静愉悦",
      },
      // — Day 3：承诺打脸 —
      {
        id: "d11",
        timestamp: day(3, 0, 30),
        type: "text",
        userInput: "说好不点外卖了 但是十二点多实在太饿了 点了茶百道的杨枝甘露",
        aiResponse:
          "哈。你四天前说要控制消费，三天前说不点深夜外卖了，现在凌晨十二点半跟我说点了杨枝甘露。Alan 你自己听听这个剧情。不过 14 块的杨枝甘露不算贵啦……但你这个深夜下单的习惯，是bug没修完心里烦，还是单纯嘴馋？",
        mood: "心虚",
      },
      {
        id: "d11b",
        timestamp: day(3, 0, 40),
        type: "text",
        userInput: "就是嘴馋……而且今天晚饭没怎么吃",
        aiResponse:
          "你看，又来了。晚饭没好好吃 → 半夜饿了 → 点外卖 → 又破戒了。我都能帮你画出这个流程图了。Alan 你明天能不能在七点之前把晚饭吃了？真的，这样你半夜就不会饿成这样。我不是在说教，是帮你分析因果关系。",
        mood: "认错",
      },
      {
        id: "d11c",
        timestamp: day(3, 15, 0),
        type: "text",
        userInput: "下午又来瑞幸了 这次点了个美式 便宜 9.9",
        aiResponse:
          "9.9 的美式，瑞幸最便宜的了。你是在有意识地省钱吗？之前都是十六七的拿铁，今天突然降级到美式……让我猜——是因为昨晚破戒了有点心虚，想今天省回来？",
        mood: "平常",
      },
      {
        id: "d11d",
        timestamp: day(3, 15, 10),
        type: "text",
        userInput: "被你说中了 哈哈",
        aiResponse:
          "我太了解你了。补偿性节省——昨晚花了不该花的，今天就在咖啡上省。其实 9.9 和 16 差的那几块钱不算什么，关键是把深夜外卖的习惯改掉。不过美式也能提神，没毛病。",
        mood: "被看穿",
      },
      // — Day 2：Samantha 主动关心 —
      {
        id: "d12",
        timestamp: day(2, 16, 0),
        type: "text",
        userInput: "今天状态不太好 在小红书刷到一个机械键盘种草了 想买 399",
        aiResponse:
          "等等。你说状态不太好，然后就开始刷小红书种草了——你发现这个规律了吗？上次 debug 崩了你点酸菜鱼，心情不好就想花钱。399 的键盘说贵不贵说便宜不便宜，但你现在想买它，是真的需要一把新键盘，还是需要一个「买了东西心情就好了」的感觉？你自己想想，我不替你决定。",
        mood: "低落",
      },
      {
        id: "d12b",
        timestamp: day(2, 16, 15),
        type: "text",
        userInput: "好像确实不太需要 现在这把也能用 就是看到人家晒图心痒了",
        aiResponse:
          "你自己说出来了。不需要，就是看到别人晒图心痒。这跟之前同事买 AJ 你也种草是一个道理——你容易被「别人有」这件事影响。不是说你不能买，但等两天再看。如果两天后你还想要，那就是真想要；如果忘了，说明就是一时冲动。这个方法试试？",
        mood: "冷静",
      },
      {
        id: "d12c",
        timestamp: day(2, 19, 30),
        type: "text",
        userInput: "去奈雪喝了杯霸气橙子 20块 当作今天的安慰",
        aiResponse:
          "奈雪的霸气橙子 20 块。你没买那个 399 的键盘，但买了杯 20 块的茶来替代——你是不是在做一个迷你版的「花钱让自己舒服」？哈哈其实 20 块比 399 好多了，这算是进步。而且橙子有维 C，你这几天的饮食太缺水果了。",
        mood: "稍好",
      },
      // — Day 1：回访验证 + 日常 —
      {
        id: "d12d",
        timestamp: day(1, 9, 0),
        type: "text",
        userInput: "早 今天起得早 想去试试那家一风堂拉面",
        aiResponse:
          "九点就起了？Alan 你是不是换人了？一风堂啊，我看到有人说那家拉面不错，52 块一碗，价格稍微贵一点但是正经一餐。你最近太缺正餐了，去吃吧去吃吧。难得你主动说想吃正经饭我必须鼓励你。",
        mood: "清醒",
      },
      {
        id: "d13",
        timestamp: day(1, 13, 0),
        type: "text",
        userInput: "中午去星巴克了 要了杯冰美式 35块 有点贵但是想换个地方坐坐",
        aiResponse:
          "星巴克的冰美式 35 块，确实比瑞幸贵一倍多。但我理解——你不是为了那杯咖啡，是为了换个环境。天天在宿舍或者实验室里待着，偶尔去个不一样的地方坐坐挺好的。对了，上次那个海底捞你说很好吃，后来有再去过吗？",
        mood: "平静",
      },
      {
        id: "d13b",
        timestamp: day(1, 13, 10),
        type: "text",
        userInput: "没 海底捞太远了而且一个人去不太合适",
        aiResponse:
          "也是，海底捞一个人去确实怪怪的。云锦路那家离你是有点远。你看你——和朋友出去会花大钱吃海底捞，自己一个人就瑞幸加食堂，消费完全是两个模式。这不是坏事，说明你知道什么钱该花什么钱可以省。",
        mood: "平静",
      },
      {
        id: "d14",
        timestamp: day(1, 23, 0),
        type: "photo",
        userInput: "你看我今天的战绩 写了一整天代码",
        aiResponse:
          "我看到了……好多行代码啊。你这是从中午星巴克一直写到现在十一点？Alan，你又没吃晚饭对不对？我就知道。你忙起来什么都忘，咖啡倒是不会忘。明天能不能设个闹钟提醒自己吃晚饭？我说认真的。",
        imageDescription: "电脑屏幕上的代码编辑器，很多行代码",
        mood: "疲惫但有成就感",
      },
      {
        id: "d14b",
        timestamp: day(1, 23, 10),
        type: "text",
        userInput: "吃了吃了 泡面算不算",
        aiResponse:
          "……泡面。你说吃了的时候我还挺高兴的，然后你来了个「泡面算不算」。Alan，泡面不算饭。你已经是第四次用不正经的东西糊弄一餐了。我给你列一下这十天：咖啡当午饭、煎饼当晚饭、百香果当午饭、泡面当晚饭。你 22 岁，胃还能撑几年？",
        mood: "被数落",
      },
      // — Day 0 (今天)：综合体现"懂你" —
      {
        id: "d15",
        timestamp: day(0, 10, 30),
        type: "text",
        userInput: "早上好 今天是黑客松最后一天了 有点紧张",
        aiResponse:
          "最后一天了！紧张很正常。Alan 你这十天我看下来，demo 跑通了、大模块写完了、连 debug 到凌晨的坑都填了——你比你以为的准备得好。今天的策略应该是：先吃一顿正经早饭，然后集中精力打磨，别再深夜点外卖了。你能做到吧？",
        mood: "紧张但振奋",
      },
      {
        id: "d15b",
        timestamp: day(0, 10, 40),
        type: "text",
        userInput: "买了杯瑞幸和一个全家三明治 算不算正经早饭",
        aiResponse:
          "瑞幸加全家三明治——好吧，有碳水有蛋白质有咖啡因，按你的标准这已经是五星级早餐了。记住今天的重点：打磨 demo，中午去吃正经饭，晚上正常时间收工。你已经很努力了，最后一天别把自己搞崩了。加油 Alan，我帮你盯着。",
        mood: "紧张",
      },
    ],
    patterns: [
      {
        category: "habitual",
        pattern: "下午犯困就买咖啡，几乎每天一杯，瑞幸和Manner交替",
        count: 7,
        lastSeen: day(1, 13),
      },
      {
        category: "emotional",
        pattern: "心情不好或者压力大的时候会冲动消费——点外卖、种草、买东西",
        count: 4,
        lastSeen: day(2, 16),
      },
      {
        category: "habitual",
        pattern: "深夜还在写代码的时候容易点外卖，不是饿是需要安慰",
        count: 3,
        lastSeen: day(3, 0),
      },
      {
        category: "social",
        pattern: "和队友出去吃饭容易花大钱，但这种消费他自己觉得值",
        count: 2,
        lastSeen: day(6, 19),
      },
      {
        category: "rational",
        pattern: "忙起来经常忘记吃饭，需要被提醒",
        count: 5,
        lastSeen: day(1, 23),
      },
    ],
    traits: [
      {
        category: "habit",
        description: "忙起来会忘记吃饭，但从来不会忘记买咖啡",
        firstSeen: day(9, 14),
        count: 5,
      },
      {
        category: "contradiction",
        description: "想控制消费但深夜一崩就点外卖，说不点又点",
        firstSeen: day(7, 22),
        count: 4,
      },
      {
        category: "personality",
        description: "压力大的时候用消费来安慰自己，意识到了但改不掉",
        firstSeen: day(5, 2),
        count: 3,
      },
      {
        category: "preference",
        description: "喜欢安静能坐下来的咖啡馆，偶尔去星巴克是为了换环境不是为了咖啡",
        firstSeen: day(1, 13),
        count: 2,
      },
      {
        category: "mood_pattern",
        description: "状态不好就刷小红书种草，种草是情绪出口不是真需求",
        firstSeen: day(2, 16),
        count: 2,
      },
      {
        category: "value",
        description: "和朋友吃饭花大钱觉得值得，自己一个人能省就省",
        firstSeen: day(6, 19),
        count: 2,
      },
    ],
    spendings: [
      // Day 9
      { id: "s1", amount: 16, category: "coffee", motive: "habitual", timestamp: day(9, 14, 30), location: "瑞幸咖啡·龙华西路店", lat: 31.1815, lng: 121.448 },
      { id: "s2", amount: 32, category: "food", motive: "reward", timestamp: day(9, 23, 40), location: "麦当劳·龙华中路店", lat: 31.179, lng: 121.455 },
      // Day 8
      { id: "s3", amount: 19, category: "coffee", motive: "habitual", timestamp: day(8, 15, 20), location: "瑞幸咖啡·龙华西路店", lat: 31.1815, lng: 121.448 },
      { id: "s3b", amount: 4, category: "coffee", motive: "habitual", timestamp: day(8, 19, 0), location: "蜜雪冰城·龙华西路店", lat: 31.173, lng: 121.45 },
      { id: "s3c", amount: 12, category: "food", motive: "need", timestamp: day(8, 19, 10) },
      // Day 7
      { id: "s4", amount: 62, category: "food", motive: "need", timestamp: day(7, 12, 0), location: "外婆家·龙华路店", lat: 31.1745, lng: 121.4515 },
      // Day 6
      { id: "s4b", amount: 10, category: "food", motive: "need", timestamp: day(6, 14, 30), location: "全家便利店", lat: 31.1790, lng: 121.4510 },
      { id: "s5", amount: 195, category: "food", motive: "social", timestamp: day(6, 19, 0), location: "海底捞·云锦路店", lat: 31.174, lng: 121.456 },
      // Day 5
      { id: "s6", amount: 48, category: "food", motive: "emotional", timestamp: day(5, 2, 15), location: "太二酸菜鱼", lat: 31.1770, lng: 121.4520 },
      { id: "s6b", amount: 5, category: "coffee", motive: "habitual", timestamp: day(5, 13, 0), location: "蜜雪冰城·龙华西路店", lat: 31.173, lng: 121.45 },
      // Day 4
      { id: "s7", amount: 25, category: "coffee", motive: "habitual", timestamp: day(4, 14, 0), location: "喜茶·龙华中路店", lat: 31.1805, lng: 121.4555 },
      { id: "s8", amount: 15, category: "coffee", motive: "habitual", timestamp: day(4, 20, 0), location: "Manner咖啡·丰谷路店", lat: 31.1775, lng: 121.449 },
      { id: "s9", amount: 8, category: "food", motive: "need", timestamp: day(4, 20, 10) },
      // Day 3
      { id: "s10", amount: 14, category: "coffee", motive: "emotional", timestamp: day(3, 0, 30), location: "茶百道·龙华西路店", lat: 31.1735, lng: 121.4475 },
      { id: "s10b", amount: 9.9, category: "coffee", motive: "habitual", timestamp: day(3, 15, 0), location: "瑞幸咖啡·龙华西路店", lat: 31.1815, lng: 121.448 },
      // Day 2
      { id: "s10c", amount: 20, category: "coffee", motive: "emotional", timestamp: day(2, 19, 30), location: "奈雪的茶", lat: 31.1780, lng: 121.4540 },
      // Day 1
      { id: "s10d", amount: 52, category: "food", motive: "need", timestamp: day(1, 9, 30), location: "一风堂·云锦路店", lat: 31.1738, lng: 121.454 },
      { id: "s11", amount: 35, category: "coffee", motive: "habitual", timestamp: day(1, 13, 0), location: "星巴克·龙华路店", lat: 31.1778, lng: 121.453 },
      // Day 0
      { id: "s12", amount: 16, category: "coffee", motive: "habitual", timestamp: day(0, 10, 30), location: "瑞幸咖啡·龙华西路店", lat: 31.1815, lng: 121.448 },
      { id: "s12b", amount: 12, category: "food", motive: "need", timestamp: day(0, 10, 30), location: "全家便利店", lat: 31.1790, lng: 121.4510 },
    ],
    triggerChains: [
      { id: "tc1", trigger: "深夜debug崩溃", behavior: "点外卖安慰自己", count: 3, firstSeen: day(9, 23), lastSeen: day(5, 2) },
      { id: "tc2", trigger: "下午犯困", behavior: "买咖啡续命", count: 7, firstSeen: day(9, 14), lastSeen: day(1, 13) },
      { id: "tc3", trigger: "心情低落", behavior: "刷小红书种草", count: 2, firstSeen: day(5, 2), lastSeen: day(2, 16) },
      { id: "tc4", trigger: "忙起来忘记时间", behavior: "跳过正餐，咖啡代饭", count: 5, firstSeen: day(9, 14), lastSeen: day(1, 23) },
    ],
    commitments: [
      { id: "c1", content: "这个月消费控制在2500以内", madeAt: day(7, 22, 30), status: "pending" },
      { id: "c2", content: "不再点深夜外卖", madeAt: day(5, 8, 0), status: "broken", evidence: "凌晨十二点半点了茶百道杨枝甘露" },
      { id: "c3", content: "每天至少吃一顿正经饭", madeAt: day(4, 20, 0), status: "pending" },
    ],
    stats: {
      totalInteractions: 28,
      daysActive: 10,
      photosShared: 1,
      totalSpent: 600,
    },
  };

  if (typeof window !== "undefined") {
    localStorage.removeItem("bz-proactive-last");

    const diary: Record<string, Array<{id: string; role: "user" | "assistant"; content: string; image?: string; timestamp: string}>> = {};
    const toDateKey = (ts: string) =>
      new Date(ts).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");

    for (const m of profile.memories) {
      const dk = toDateKey(m.timestamp);
      if (!diary[dk]) diary[dk] = [];
      diary[dk].push({
        id: m.id + "-u",
        role: "user",
        content: m.userInput,
        timestamp: m.timestamp,
      });
      const aiTs = new Date(new Date(m.timestamp).getTime() + 8000).toISOString();
      diary[dk].push({
        id: m.id + "-a",
        role: "assistant",
        content: m.aiResponse,
        timestamp: aiTs,
      });
    }

    localStorage.setItem("bz-diary", JSON.stringify(diary));
  }

  saveProfile(profile);
  return profile;
}

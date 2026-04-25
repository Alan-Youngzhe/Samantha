/**
 * Seed data for 上海徐汇龙华街道 shops — ~25 stores, ~63 reviews
 * Coordinates spread across 龙华街道 bounding box:
 *   lat: 31.1725 ~ 31.1825, lng: 121.4465 ~ 121.4575
 */

export interface SeedReview {
  storeName: string;
  storeLocation?: string;
  productName: string;
  category: string;
  price: number;
  sentiment: "positive" | "neutral" | "negative";
  comment: string;
  motive: string;
  motiveConfidence: "high" | "medium" | "low";
  lat: number;
  lng: number;
  hour: number;
  dayOfWeek: number;
}

// --- Hot stores (≥8 reviews) ---
const hotStores: SeedReview[] = [
  // 瑞幸咖啡 — NW area (31.1815, 121.4480)
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "生椰拿铁", category: "coffee", price: 16, sentiment: "positive", comment: "下午续命必备", motive: "habitual", motiveConfidence: "high", lat: 31.1815, lng: 121.4480, hour: 15, dayOfWeek: 1 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "生椰拿铁", category: "coffee", price: 16, sentiment: "positive", comment: "稳定好喝", motive: "habitual", motiveConfidence: "high", lat: 31.1815, lng: 121.4480, hour: 14, dayOfWeek: 2 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "厚乳拿铁", category: "coffee", price: 18, sentiment: "positive", comment: "比星巴克性价比高太多", motive: "habitual", motiveConfidence: "high", lat: 31.1815, lng: 121.4480, hour: 9, dayOfWeek: 3 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "美式", category: "coffee", price: 12, sentiment: "neutral", comment: "普通美式", motive: "need", motiveConfidence: "high", lat: 31.1815, lng: 121.4480, hour: 8, dayOfWeek: 4 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "生椰拿铁", category: "coffee", price: 16, sentiment: "positive", comment: "用券9.9真香", motive: "habitual", motiveConfidence: "high", lat: 31.1815, lng: 121.4480, hour: 15, dayOfWeek: 5 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "冰美式", category: "coffee", price: 12, sentiment: "neutral", comment: "中规中矩", motive: "need", motiveConfidence: "medium", lat: 31.1815, lng: 121.4480, hour: 10, dayOfWeek: 0 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "椰云拿铁", category: "coffee", price: 19, sentiment: "positive", comment: "新品不错", motive: "impulse", motiveConfidence: "medium", lat: 31.1815, lng: 121.4480, hour: 16, dayOfWeek: 6 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "生椰拿铁", category: "coffee", price: 16, sentiment: "positive", comment: "一周三杯", motive: "habitual", motiveConfidence: "high", lat: 31.1815, lng: 121.4480, hour: 14, dayOfWeek: 3 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "厚乳拿铁", category: "coffee", price: 18, sentiment: "positive", comment: "奶味很浓", motive: "habitual", motiveConfidence: "high", lat: 31.1815, lng: 121.4480, hour: 15, dayOfWeek: 1 },
  { storeName: "瑞幸咖啡", storeLocation: "龙华西路店", productName: "生椰拿铁", category: "coffee", price: 9.9, sentiment: "positive", comment: "券价yyds", motive: "habitual", motiveConfidence: "high", lat: 31.1815, lng: 121.4480, hour: 14, dayOfWeek: 2 },

  // 海底捞 — SE area (31.1740, 121.4560)
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "麻辣锅底", category: "food", price: 158, sentiment: "positive", comment: "服务一如既往好", motive: "social", motiveConfidence: "high", lat: 31.1740, lng: 121.4560, hour: 19, dayOfWeek: 6 },
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "番茄锅底", category: "food", price: 142, sentiment: "positive", comment: "番茄锅底真好喝", motive: "social", motiveConfidence: "high", lat: 31.1740, lng: 121.4560, hour: 18, dayOfWeek: 0 },
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "鸳鸯锅", category: "food", price: 186, sentiment: "positive", comment: "朋友聚餐首选", motive: "social", motiveConfidence: "high", lat: 31.1740, lng: 121.4560, hour: 19, dayOfWeek: 5 },
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "麻辣锅底", category: "food", price: 165, sentiment: "neutral", comment: "人均有点高了", motive: "social", motiveConfidence: "medium", lat: 31.1740, lng: 121.4560, hour: 20, dayOfWeek: 6 },
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "番茄锅底", category: "food", price: 138, sentiment: "positive", comment: "小料免费选很爽", motive: "social", motiveConfidence: "high", lat: 31.1740, lng: 121.4560, hour: 12, dayOfWeek: 0 },
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "麻辣锅底", category: "food", price: 172, sentiment: "positive", comment: "等位送零食", motive: "social", motiveConfidence: "high", lat: 31.1740, lng: 121.4560, hour: 18, dayOfWeek: 6 },
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "鸳鸯锅", category: "food", price: 195, sentiment: "negative", comment: "太贵了这次", motive: "social", motiveConfidence: "medium", lat: 31.1740, lng: 121.4560, hour: 19, dayOfWeek: 5 },
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "番茄锅底", category: "food", price: 148, sentiment: "positive", comment: "生日去的有惊喜", motive: "emotional", motiveConfidence: "high", lat: 31.1740, lng: 121.4560, hour: 19, dayOfWeek: 3 },
  { storeName: "海底捞", storeLocation: "云锦路店", productName: "麻辣锅底", category: "food", price: 155, sentiment: "positive", comment: "冬天吃火锅太爽了", motive: "need", motiveConfidence: "medium", lat: 31.1740, lng: 121.4560, hour: 18, dayOfWeek: 6 },

  // 喜茶 — NE area (31.1805, 121.4555)
  { storeName: "喜茶", storeLocation: "龙华中路店", productName: "多肉葡萄", category: "coffee", price: 25, sentiment: "positive", comment: "葡萄很新鲜", motive: "impulse", motiveConfidence: "high", lat: 31.1805, lng: 121.4555, hour: 15, dayOfWeek: 0 },
  { storeName: "喜茶", storeLocation: "龙华中路店", productName: "芝芝莓莓", category: "coffee", price: 27, sentiment: "positive", comment: "颜值超高", motive: "impulse", motiveConfidence: "medium", lat: 31.1805, lng: 121.4555, hour: 14, dayOfWeek: 6 },
  { storeName: "喜茶", storeLocation: "龙华中路店", productName: "多肉葡萄", category: "coffee", price: 25, sentiment: "positive", comment: "每次路过必买", motive: "habitual", motiveConfidence: "high", lat: 31.1805, lng: 121.4555, hour: 16, dayOfWeek: 2 },
  { storeName: "喜茶", storeLocation: "龙华中路店", productName: "酷黑莓桑", category: "coffee", price: 23, sentiment: "neutral", comment: "味道一般", motive: "impulse", motiveConfidence: "medium", lat: 31.1805, lng: 121.4555, hour: 15, dayOfWeek: 4 },
  { storeName: "喜茶", storeLocation: "龙华中路店", productName: "多肉葡萄", category: "coffee", price: 25, sentiment: "positive", comment: "永远的神", motive: "habitual", motiveConfidence: "high", lat: 31.1805, lng: 121.4555, hour: 14, dayOfWeek: 1 },
  { storeName: "喜茶", storeLocation: "龙华中路店", productName: "纯绿妍茶", category: "coffee", price: 15, sentiment: "positive", comment: "低卡之选", motive: "need", motiveConfidence: "high", lat: 31.1805, lng: 121.4555, hour: 10, dayOfWeek: 3 },
  { storeName: "喜茶", storeLocation: "龙华中路店", productName: "芝芝莓莓", category: "coffee", price: 27, sentiment: "positive", comment: "送给同事她很开心", motive: "social", motiveConfidence: "high", lat: 31.1805, lng: 121.4555, hour: 15, dayOfWeek: 5 },
  { storeName: "喜茶", storeLocation: "龙华中路店", productName: "多肉葡萄", category: "coffee", price: 25, sentiment: "positive", comment: "加料加量", motive: "impulse", motiveConfidence: "medium", lat: 31.1805, lng: 121.4555, hour: 16, dayOfWeek: 0 },
];

// --- Active stores (4-7 reviews) ---
const activeStores: SeedReview[] = [
  // Manner咖啡 — center-west (31.1775, 121.4490)
  { storeName: "Manner咖啡", storeLocation: "丰谷路店", productName: "拿铁", category: "coffee", price: 15, sentiment: "positive", comment: "自带杯减5块", motive: "habitual", motiveConfidence: "high", lat: 31.1775, lng: 121.4490, hour: 9, dayOfWeek: 1 },
  { storeName: "Manner咖啡", storeLocation: "丰谷路店", productName: "美式", category: "coffee", price: 10, sentiment: "positive", comment: "便宜又好喝", motive: "need", motiveConfidence: "high", lat: 31.1775, lng: 121.4490, hour: 8, dayOfWeek: 2 },
  { storeName: "Manner咖啡", storeLocation: "丰谷路店", productName: "拿铁", category: "coffee", price: 15, sentiment: "positive", comment: "豆子品质很好", motive: "habitual", motiveConfidence: "high", lat: 31.1775, lng: 121.4490, hour: 10, dayOfWeek: 3 },
  { storeName: "Manner咖啡", storeLocation: "丰谷路店", productName: "dirty", category: "coffee", price: 18, sentiment: "positive", comment: "颜值口感都在线", motive: "impulse", motiveConfidence: "medium", lat: 31.1775, lng: 121.4490, hour: 15, dayOfWeek: 5 },
  { storeName: "Manner咖啡", storeLocation: "丰谷路店", productName: "拿铁", category: "coffee", price: 15, sentiment: "neutral", comment: "今天出品一般", motive: "habitual", motiveConfidence: "high", lat: 31.1775, lng: 121.4490, hour: 9, dayOfWeek: 4 },
  { storeName: "Manner咖啡", storeLocation: "丰谷路店", productName: "美式", category: "coffee", price: 10, sentiment: "positive", comment: "10块钱咖啡无敌", motive: "need", motiveConfidence: "high", lat: 31.1775, lng: 121.4490, hour: 8, dayOfWeek: 0 },

  // 外婆家 — center-south (31.1745, 121.4515)
  { storeName: "外婆家", storeLocation: "龙华路店", productName: "西湖醋鱼", category: "food", price: 68, sentiment: "positive", comment: "分量很大", motive: "social", motiveConfidence: "high", lat: 31.1745, lng: 121.4515, hour: 12, dayOfWeek: 0 },
  { storeName: "外婆家", storeLocation: "龙华路店", productName: "麻婆豆腐", category: "food", price: 58, sentiment: "positive", comment: "性价比不错", motive: "need", motiveConfidence: "high", lat: 31.1745, lng: 121.4515, hour: 12, dayOfWeek: 3 },
  { storeName: "外婆家", storeLocation: "龙华路店", productName: "茶香鸡", category: "food", price: 72, sentiment: "positive", comment: "招牌菜名不虚传", motive: "social", motiveConfidence: "high", lat: 31.1745, lng: 121.4515, hour: 18, dayOfWeek: 6 },
  { storeName: "外婆家", storeLocation: "龙华路店", productName: "西湖醋鱼", category: "food", price: 68, sentiment: "neutral", comment: "等位太久了", motive: "social", motiveConfidence: "medium", lat: 31.1745, lng: 121.4515, hour: 18, dayOfWeek: 5 },
  { storeName: "外婆家", storeLocation: "龙华路店", productName: "麻婆豆腐", category: "food", price: 58, sentiment: "positive", comment: "下饭神器", motive: "need", motiveConfidence: "high", lat: 31.1745, lng: 121.4515, hour: 12, dayOfWeek: 1 },

  // 茶百道 — SW area (31.1735, 121.4475)
  { storeName: "茶百道", storeLocation: "龙华西路店", productName: "杨枝甘露", category: "coffee", price: 16, sentiment: "positive", comment: "芒果很甜", motive: "impulse", motiveConfidence: "high", lat: 31.1735, lng: 121.4475, hour: 14, dayOfWeek: 2 },
  { storeName: "茶百道", storeLocation: "龙华西路店", productName: "西瓜啵啵", category: "coffee", price: 14, sentiment: "positive", comment: "夏天最爱", motive: "impulse", motiveConfidence: "medium", lat: 31.1735, lng: 121.4475, hour: 15, dayOfWeek: 0 },
  { storeName: "茶百道", storeLocation: "龙华西路店", productName: "杨枝甘露", category: "coffee", price: 16, sentiment: "positive", comment: "外卖也好喝", motive: "habitual", motiveConfidence: "high", lat: 31.1735, lng: 121.4475, hour: 16, dayOfWeek: 4 },
  { storeName: "茶百道", storeLocation: "龙华西路店", productName: "珍珠奶茶", category: "coffee", price: 12, sentiment: "neutral", comment: "珍珠有点硬", motive: "habitual", motiveConfidence: "medium", lat: 31.1735, lng: 121.4475, hour: 14, dayOfWeek: 6 },
  { storeName: "茶百道", storeLocation: "龙华西路店", productName: "杨枝甘露", category: "coffee", price: 16, sentiment: "positive", comment: "回购率最高", motive: "habitual", motiveConfidence: "high", lat: 31.1735, lng: 121.4475, hour: 15, dayOfWeek: 1 },

  // 麦当劳 — center-east (31.1790, 121.4550)
  { storeName: "麦当劳", storeLocation: "龙华中路店", productName: "麦辣鸡腿堡套餐", category: "food", price: 32, sentiment: "positive", comment: "深夜救星", motive: "need", motiveConfidence: "high", lat: 31.1790, lng: 121.4550, hour: 22, dayOfWeek: 3 },
  { storeName: "麦当劳", storeLocation: "龙华中路店", productName: "巨无霸", category: "food", price: 28, sentiment: "neutral", comment: "永远不会出错", motive: "need", motiveConfidence: "high", lat: 31.1790, lng: 121.4550, hour: 12, dayOfWeek: 1 },
  { storeName: "麦当劳", storeLocation: "龙华中路店", productName: "薯条", category: "food", price: 12, sentiment: "positive", comment: "刚出锅最香", motive: "impulse", motiveConfidence: "medium", lat: 31.1790, lng: 121.4550, hour: 15, dayOfWeek: 6 },
  { storeName: "麦当劳", storeLocation: "龙华中路店", productName: "麦辣鸡腿堡套餐", category: "food", price: 32, sentiment: "positive", comment: "加班完必吃", motive: "emotional", motiveConfidence: "high", lat: 31.1790, lng: 121.4550, hour: 21, dayOfWeek: 4 },

  // 优衣库 — center-north (31.1800, 121.4510)
  { storeName: "优衣库", storeLocation: "龙华路店", productName: "UT联名T恤", category: "shopping", price: 99, sentiment: "positive", comment: "联名款好看", motive: "impulse", motiveConfidence: "high", lat: 31.1800, lng: 121.4510, hour: 14, dayOfWeek: 6 },
  { storeName: "优衣库", storeLocation: "龙华路店", productName: "AIRism内衣", category: "shopping", price: 79, sentiment: "positive", comment: "夏天必备", motive: "need", motiveConfidence: "high", lat: 31.1800, lng: 121.4510, hour: 11, dayOfWeek: 0 },
  { storeName: "优衣库", storeLocation: "龙华路店", productName: "牛仔裤", category: "shopping", price: 149, sentiment: "neutral", comment: "版型一般", motive: "need", motiveConfidence: "medium", lat: 31.1800, lng: 121.4510, hour: 16, dayOfWeek: 5 },
  { storeName: "优衣库", storeLocation: "龙华路店", productName: "轻羽绒", category: "shopping", price: 299, sentiment: "positive", comment: "性价比之王", motive: "need", motiveConfidence: "high", lat: 31.1800, lng: 121.4510, hour: 15, dayOfWeek: 3 },
];

// --- Cold stores (1-3 reviews) ---
const coldStores: SeedReview[] = [
  // 星巴克 — center (31.1778, 121.4530)
  { storeName: "星巴克", storeLocation: "龙华路店", productName: "抹茶拿铁", category: "coffee", price: 38, sentiment: "neutral", comment: "太贵了", motive: "social", motiveConfidence: "high", lat: 31.1778, lng: 121.4530, hour: 14, dayOfWeek: 0 },
  { storeName: "星巴克", storeLocation: "龙华路店", productName: "美式", category: "coffee", price: 32, sentiment: "negative", comment: "瑞幸平替", motive: "need", motiveConfidence: "medium", lat: 31.1778, lng: 121.4530, hour: 9, dayOfWeek: 2 },
  { storeName: "星巴克", storeLocation: "龙华路店", productName: "焦糖玛奇朵", category: "coffee", price: 36, sentiment: "positive", comment: "偶尔奢侈一下", motive: "emotional", motiveConfidence: "high", lat: 31.1778, lng: 121.4530, hour: 15, dayOfWeek: 5 },

  // 蜜雪冰城 — south-west (31.1730, 121.4500)
  { storeName: "蜜雪冰城", storeLocation: "龙华西路店", productName: "柠檬水", category: "coffee", price: 4, sentiment: "positive", comment: "4块钱真的够了", motive: "need", motiveConfidence: "high", lat: 31.1730, lng: 121.4500, hour: 14, dayOfWeek: 1 },
  { storeName: "蜜雪冰城", storeLocation: "龙华西路店", productName: "珍珠奶茶", category: "coffee", price: 7, sentiment: "neutral", comment: "便宜够喝", motive: "need", motiveConfidence: "high", lat: 31.1730, lng: 121.4500, hour: 15, dayOfWeek: 4 },

  // 一风堂 — south (31.1738, 121.4540)
  { storeName: "一风堂", storeLocation: "云锦路店", productName: "赤丸拉面", category: "food", price: 58, sentiment: "positive", comment: "汤底浓郁", motive: "need", motiveConfidence: "high", lat: 31.1738, lng: 121.4540, hour: 12, dayOfWeek: 3 },
  { storeName: "一风堂", storeLocation: "云锦路店", productName: "白丸拉面", category: "food", price: 52, sentiment: "positive", comment: "清淡但有味", motive: "need", motiveConfidence: "medium", lat: 31.1738, lng: 121.4540, hour: 18, dayOfWeek: 6 },

  // 全家便利店 — east (31.1760, 121.4565)
  { storeName: "全家便利店", storeLocation: "龙华中路店", productName: "关东煮", category: "food", price: 15, sentiment: "positive", comment: "深夜温暖", motive: "need", motiveConfidence: "high", lat: 31.1760, lng: 121.4565, hour: 23, dayOfWeek: 4 },

  // 奈雪的茶 — north (31.1820, 121.4520)
  { storeName: "奈雪的茶", storeLocation: "龙华路店", productName: "霸气芝士草莓", category: "coffee", price: 28, sentiment: "positive", comment: "颜值控必买", motive: "impulse", motiveConfidence: "medium", lat: 31.1820, lng: 121.4520, hour: 15, dayOfWeek: 0 },

  // Nike — north-east (31.1810, 121.4570)
  { storeName: "Nike", storeLocation: "龙华中路店", productName: "Air Force 1", category: "shopping", price: 799, sentiment: "positive", comment: "经典款永不过时", motive: "impulse", motiveConfidence: "high", lat: 31.1810, lng: 121.4570, hour: 16, dayOfWeek: 6 },
  { storeName: "Nike", storeLocation: "龙华中路店", productName: "运动T恤", category: "shopping", price: 199, sentiment: "neutral", comment: "质量还行", motive: "need", motiveConfidence: "medium", lat: 31.1810, lng: 121.4570, hour: 14, dayOfWeek: 0 },

  // ZARA — west (31.1755, 121.4470)
  { storeName: "ZARA", storeLocation: "龙华西路店", productName: "连衣裙", category: "shopping", price: 299, sentiment: "positive", comment: "版型好看", motive: "impulse", motiveConfidence: "medium", lat: 31.1755, lng: 121.4470, hour: 15, dayOfWeek: 6 },
];

// --- Unknown stores (pins with no reviews — gray '?' pins) ---
export const unknownStoreLocations = [
  { storeName: "库迪咖啡", storeLocation: "龙华西路店", lat: 31.1795, lng: 121.4475, category: "coffee" },
  { storeName: "肯德基", storeLocation: "龙华路店", lat: 31.1760, lng: 121.4535, category: "food" },
  { storeName: "CGV影院", storeLocation: "云锦路店", lat: 31.1730, lng: 121.4470, category: "entertainment" },
  { storeName: "名创优品", storeLocation: "龙华中路店", lat: 31.1820, lng: 121.4545, category: "shopping" },
  { storeName: "太二酸菜鱼", storeLocation: "龙华路店", lat: 31.1765, lng: 121.4505, category: "food" },
  { storeName: "必胜客", storeLocation: "云锦路店", lat: 31.1748, lng: 121.4555, category: "food" },
  { storeName: "盒马鲜生", storeLocation: "龙华路店", lat: 31.1785, lng: 121.4565, category: "daily" },
  { storeName: "大润发", storeLocation: "龙华西路店", lat: 31.1728, lng: 121.4490, category: "daily" },
];

export const allSeedReviews: SeedReview[] = [
  ...hotStores,
  ...activeStores,
  ...coldStores,
];

-- Samantha — Demo 数据灌入
-- 在 schema.sql 执行成功后，再执行此文件

insert into reviews (id, store_name, store_location, product_name, category, price, sentiment, comment, motive, motive_confidence, lat, lng, hour, day_of_week, trust_score, verified, has_matching_spending, has_location_match, profile_depth, created_at) values
-- 喜茶（龙华天街）
('demo-1', '喜茶', '龙华天街店', '多肉葡萄', 'coffee', 22, 'positive', '每次路过都忍不住，葡萄很新鲜', 'habitual', 'high', 22.6540, 114.0255, 15, 3, 85, true, true, true, 82, now() - interval '1 day'),
('demo-2', '喜茶', '龙华天街店', '多肉葡萄', 'coffee', 22, 'positive', '比上次好喝，冰度刚好', 'emotional', 'medium', 22.6538, 114.0259, 20, 5, 65, false, true, true, 48, now() - interval '2 days'),
('demo-3', '喜茶', '龙华天街店', '多肉葡萄', 'coffee', 22, 'negative', '今天太甜了，是不是换了配方', 'impulse', 'low', 22.6545, 114.0252, 22, 6, 28, false, false, false, 18, now() - interval '3 days'),
('demo-4', '喜茶', '龙华天街店', '芝芝莓莓', 'coffee', 25, 'positive', '草莓季限定，必买', 'social', 'high', 22.6545, 114.0253, 14, 0, 90, true, true, true, 80, now() - interval '1 day'),
('demo-5', '喜茶', '龙华天街店', '芝芝莓莓', 'coffee', 25, 'neutral', '排了20分钟就这？', 'social', 'medium', 22.6541, 114.0256, 15, 0, 62, false, true, true, 55, now() - interval '4 days'),
('demo-6', '喜茶', '龙华天街店', '烤黑糖波波牛乳', 'coffee', 19, 'positive', '便宜又好喝，波波很Q', 'habitual', 'high', 22.6538, 114.0258, 16, 2, 88, true, true, true, 85, now() - interval '5 days'),

-- 瑞幸（龙华天街）
('demo-7', '瑞幸', '龙华天街店', '生椰拿铁', 'coffee', 16, 'positive', '永远的神，9.9活动太香了', 'habitual', 'high', 22.6540, 114.0255, 9, 1, 86, true, true, true, 80, now() - interval '1 day'),
('demo-8', '瑞幸', '龙华天街店', '生椰拿铁', 'coffee', 16, 'positive', '续命咖啡，每天一杯', 'habitual', 'high', 22.6540, 114.0255, 10, 2, 84, true, true, true, 78, now() - interval '2 days'),
('demo-9', '瑞幸', '龙华天街店', '生椰拿铁', 'coffee', 9.9, 'positive', '9块9还要什么自行车', 'habitual', 'medium', 22.6540, 114.0255, 8, 3, 60, false, true, true, 50, now() - interval '3 days'),
('demo-10', '瑞幸', '龙华天街店', '橙C美式', 'coffee', 13, 'neutral', '一般般，还是生椰好喝', 'need', 'medium', 22.6540, 114.0255, 14, 4, 58, false, true, true, 48, now() - interval '4 days'),
('demo-11', '瑞幸', '龙华天街店', '厚乳拿铁', 'coffee', 16, 'negative', '甜到齁，下次不点了', 'impulse', 'low', 22.6540, 114.0255, 15, 5, 25, false, false, false, 15, now() - interval '1 day'),

-- 海底捞（龙华天街）
('demo-12', '海底捞', '龙华天街店', '番茄锅底', 'food', 158, 'positive', '番茄锅永远不会踩雷', 'social', 'high', 22.6540, 114.0255, 19, 5, 85, true, true, true, 80, now() - interval '2 days'),
('demo-13', '海底捞', '龙华天街店', '番茄锅底', 'food', 175, 'negative', '排了一个半小时不值得，下次不来了', 'social', 'medium', 22.6540, 114.0255, 18, 6, 60, false, true, true, 50, now() - interval '1 day'),
('demo-14', '海底捞', '龙华天街店', '捞派牛肉粒', 'food', 38, 'positive', '必点，小料加麻酱绝了', 'social', 'high', 22.6540, 114.0255, 19, 6, 88, true, true, true, 82, now() - interval '1 day'),

-- 外婆家（龙华天街）
('demo-15', '外婆家', '龙华天街店', '茶香鸡', 'food', 48, 'positive', '性价比之王，每次来必点', 'reward', 'high', 22.6540, 114.0255, 12, 5, 86, true, true, true, 80, now() - interval '3 days'),
('demo-16', '外婆家', '龙华天街店', '西湖醋鱼', 'food', 38, 'neutral', '中规中矩，没有很惊艳', 'need', 'medium', 22.6540, 114.0255, 12, 2, 55, false, true, true, 45, now() - interval '5 days'),
('demo-17', '外婆家', '龙华天街店', '麻婆豆腐', 'food', 22, 'positive', '3块钱的麻婆豆腐哪里找去，便宜到离谱', 'need', 'medium', 22.6540, 114.0255, 12, 4, 58, false, true, true, 50, now() - interval '6 days'),

-- ZARA（龙华天街）
('demo-18', 'ZARA', '龙华天街店', '亚麻衬衫', 'shopping', 299, 'negative', '买回去洗了一次就皱成狗', 'impulse', 'high', 22.6540, 114.0255, 20, 6, 84, true, true, true, 78, now() - interval '1 day'),
('demo-19', 'ZARA', '龙华天街店', '基础T恤', 'shopping', 99, 'positive', '白T百搭，多买几件', 'need', 'medium', 22.6540, 114.0255, 15, 0, 58, false, true, true, 50, now() - interval '3 days'),

-- 优衣库（龙华天街）
('demo-20', '优衣库', '龙华天街店', 'AIRism T恤', 'shopping', 79, 'positive', '夏天必备，透气舒服', 'need', 'high', 22.6540, 114.0255, 14, 0, 85, true, true, true, 80, now() - interval '2 days'),
('demo-21', '优衣库', '龙华天街店', '联名UT', 'shopping', 99, 'neutral', '联名图案一般，买了个情怀', 'impulse', 'low', 22.6540, 114.0255, 16, 6, 25, false, false, false, 15, now() - interval '4 days'),

-- Manner（壹方天地）
('demo-22', 'Manner', '壹方天地店', '美式', 'coffee', 10, 'positive', '带杯子减5块，5块钱美式谁不爱', 'habitual', 'high', 22.6580, 114.0230, 8, 1, 86, true, true, true, 80, now() - interval '1 day'),
('demo-23', 'Manner', '壹方天地店', '脏脏拿铁', 'coffee', 15, 'positive', '巧克力味刚好，不腻', 'reward', 'medium', 22.6580, 114.0230, 15, 3, 60, false, true, true, 50, now() - interval '2 days'),
('demo-24', 'Manner', '壹方天地店', '桂花拿铁', 'coffee', 15, 'positive', '季节限定太香了', 'emotional', 'medium', 22.6580, 114.0230, 16, 5, 58, false, true, true, 48, now() - interval '3 days'),

-- 一风堂（壹方天地）
('demo-25', '一风堂', '壹方天地店', '白丸元味拉面', 'food', 52, 'positive', '汤头很浓，叉烧嫩', 'reward', 'high', 22.6580, 114.0230, 12, 6, 86, true, true, true, 80, now() - interval '1 day'),
('demo-26', '一风堂', '壹方天地店', '赤丸拉面', 'food', 58, 'neutral', '偏辣，吃完胃不太舒服', 'emotional', 'medium', 22.6580, 114.0230, 13, 2, 58, false, true, true, 48, now() - interval '3 days'),
('demo-27', '一风堂', '壹方天地店', '煎饺', 'food', 28, 'positive', '必加的小食，皮脆馅多', 'social', 'high', 22.6580, 114.0230, 12, 0, 85, true, true, true, 78, now() - interval '5 days'),

-- Nike（壹方天地）
('demo-28', 'Nike', '壹方天地店', 'Air Force 1', 'shopping', 799, 'positive', '经典款不会出错', 'need', 'high', 22.6580, 114.0230, 15, 6, 86, true, true, true, 80, now() - interval '2 days'),
('demo-29', 'Nike', '壹方天地店', 'Dunk Low', 'shopping', 699, 'negative', '冲动买的，回家发现跟已有的撞色了', 'impulse', 'medium', 22.6580, 114.0230, 16, 6, 58, false, true, true, 48, now() - interval '4 days'),

-- 全家（龙华大道）
('demo-30', '全家', '龙华大道店', '关东煮', 'food', 15, 'positive', '深夜暖胃神器', 'emotional', 'medium', 22.6510, 114.0240, 23, 4, 58, false, true, true, 48, now() - interval '1 day'),
('demo-31', '全家', '龙华大道店', '饭团', 'food', 8, 'neutral', '凑合吃吧，赶时间', 'need', 'low', 22.6510, 114.0240, 8, 1, 25, false, false, false, 15, now() - interval '2 days'),

-- 麦当劳（龙华天街）
('demo-32', '麦当劳', '龙华天街店', '麦辣鸡腿堡套餐', 'food', 32, 'positive', '深夜emo就靠它了', 'emotional', 'high', 22.6540, 114.0255, 23, 3, 85, true, true, true, 80, now() - interval '1 day'),
('demo-33', '麦当劳', '龙华天街店', '麦旋风', 'food', 13, 'positive', '奥利奥味永远的神', 'reward', 'medium', 22.6540, 114.0255, 21, 5, 60, false, true, true, 50, now() - interval '2 days'),
('demo-34', '麦当劳', '龙华天街店', '薯条', 'food', 11, 'negative', '等了15分钟，拿到手是软的', 'habitual', 'high', 22.6540, 114.0255, 12, 1, 84, true, true, true, 78, now() - interval '4 days'),

-- CGV影院（龙华天街）
('demo-35', 'CGV影院', '龙华天街店', 'IMAX厅', 'entertainment', 80, 'positive', '效果很好，座位舒服', 'social', 'high', 22.6540, 114.0255, 19, 6, 86, true, true, true, 80, now() - interval '2 days'),
('demo-36', 'CGV影院', '龙华天街店', '爆米花套餐', 'food', 45, 'negative', '45块的爆米花是认真的吗', 'impulse', 'medium', 22.6540, 114.0255, 19, 6, 58, false, true, true, 48, now() - interval '2 days')

on conflict (id) do nothing;

-- Samantha — 城市消费情报表
-- 在 Supabase SQL Editor 中执行此文件

create table if not exists reviews (
  id            text primary key,
  store_name    text not null,
  store_location text,
  product_name  text not null,
  category      text not null default 'other',
  price         numeric(10,2) not null,
  sentiment     text not null default 'neutral' check (sentiment in ('positive','neutral','negative')),
  comment       text default '',
  motive        text not null default 'habitual',
  motive_confidence text not null default 'medium' check (motive_confidence in ('high','medium','low')),
  lat           double precision,
  lng           double precision,
  hour          smallint,
  day_of_week   smallint,
  trust_score   smallint not null default 50,
  verified      boolean not null default false,
  verified_at   timestamptz,
  has_matching_spending boolean not null default false,
  has_location_match    boolean not null default false,
  profile_depth smallint not null default 0,
  created_at    timestamptz not null default now()
);

-- 按店铺名查询（反向查询）
create index if not exists idx_reviews_store_name on reviews (store_name);

-- 按位置范围查询（附近情报）
create index if not exists idx_reviews_lat_lng on reviews (lat, lng);

-- 按时间排序
create index if not exists idx_reviews_created_at on reviews (created_at desc);

-- 开放读写权限（demo 阶段，无需登录）
alter table reviews enable row level security;

create policy "Anyone can read reviews"
  on reviews for select
  using (true);

create policy "Anyone can insert reviews"
  on reviews for insert
  with check (true);

create policy "Anyone can update reviews"
  on reviews for update
  using (true);

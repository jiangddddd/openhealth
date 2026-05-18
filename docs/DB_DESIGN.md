# AI Dream MVP 数据库设计文档

> 版本：v1.0.0  
> 数据库：MySQL 8+  
> 引擎：InnoDB  
> 字符集：utf8mb4 / utf8mb4_unicode_ci

---

## 1. 数据库概览

| 表名 | 说明 | 数据量预估 |
|------|------|-----------|
| `users` | 用户主表 | 百万级 |
| `wechat_mini_accounts` | 微信小程序账号绑定 | 百万级 |
| `dream_records` | 梦境记录主表 | 千万级 |
| `dream_followups` | 梦境追问记录 | 千万级 |
| `daily_fortunes` | 每日运势缓存 | 百万级 |
| `mood_records` | 心情记录 | 千万级 |
| `daily_summaries` | 每日总结缓存 | 百万级 |
| `orders` | 订单表 | 百万级 |
| `memberships` | 会员订阅明细 | 百万级 |
| `feedbacks` | 用户反馈 | 百万级 |
| `prompt_logs` | Prompt 调用日志 | 千万级 |
| `event_logs` | 前端埋点日志 | 亿级（建议后续分表/归档） |

---

## 2. E-R 关系图（文字描述）

```
users (1)
  │
  ├──< wechat_mini_accounts (N)
  ├──< dream_records (N)
  │      └──< dream_followups (N)
  ├──< daily_fortunes (N)
  ├──< mood_records (N)
  ├──< daily_summaries (N)
  ├──< orders (N)
  │      └──< memberships (N, via order_id)
  ├──< memberships (N)
  ├──< feedbacks (N)
  ├──< prompt_logs (N)
  └──< event_logs (N)
```

---

## 3. 表结构详细设计

### 3.1 users（用户主表）

保存用户登录信息、基础资料与会员摘要。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 用户主键 |
| nickname | VARCHAR(50) | NULL | - | 用户昵称 |
| avatar_url | VARCHAR(255) | NULL | - | 头像地址 |
| mobile | VARCHAR(30) | UK | - | 手机号，唯一 |
| email | VARCHAR(100) | UK | - | 邮箱，唯一 |
| login_type | VARCHAR(20) | NOT NULL | - | 登录方式：mobile / wechat / google |
| gender | VARCHAR(10) | NULL | - | 性别 |
| birthday | DATE | NULL | - | 生日 |
| timezone | VARCHAR(50) | NULL | - | 时区 |
| language | VARCHAR(20) | NULL | - | 语言标识，如 zh-CN |
| membership_status | VARCHAR(20) | NOT NULL | 'free' | 会员状态摘要 |
| membership_expire_at | DATETIME | NULL | - | 会员到期时间 |
| total_dream_count | INT | NOT NULL | 0 | 累计梦境数 |
| consecutive_days | INT | NOT NULL | 0 | 连续记录天数 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |
| last_login_at | DATETIME | NULL | - | 最后登录时间 |
| is_deleted | TINYINT(1) | NOT NULL | 0 | 软删除标记 |

**索引**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_users_mobile (mobile)`
- `UNIQUE KEY uk_users_email (email)`

---

### 3.2 wechat_mini_accounts（微信小程序账号表）

保存微信 `code2Session` 结果与微信资料快照。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 关联用户 |
| app_id | VARCHAR(64) | NOT NULL | - | 小程序 AppID |
| openid | VARCHAR(100) | NOT NULL | - | 微信 OpenID |
| unionid | VARCHAR(100) | IDX | - | 微信 UnionID |
| session_key | VARCHAR(255) | NULL | - | 会话密钥 |
| session_key_updated_at | DATETIME | NULL | - | session_key 更新时间 |
| nickname | VARCHAR(100) | NULL | - | 微信昵称 |
| avatar_url | VARCHAR(500) | NULL | - | 微信头像 |
| gender | INT | NULL | - | 性别（微信原始值） |
| country | VARCHAR(100) | NULL | - | 国家 |
| province | VARCHAR(100) | NULL | - | 省份 |
| city | VARCHAR(100) | NULL | - | 城市 |
| language | VARCHAR(20) | NULL | - | 语言 |
| raw_session_data | JSON | NULL | - | 原始 session 数据 |
| raw_user_info | JSON | NULL | - | 原始用户信息 |
| last_login_at | DATETIME | NULL | - | 最后登录时间 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_wechat_mini_accounts_app_openid (app_id, openid)`
- `KEY ix_wechat_mini_accounts_user_id (user_id)`
- `KEY ix_wechat_mini_accounts_unionid (unionid)`

---

### 3.3 dream_records（梦境记录主表）

保存用户原始输入与 AI 解析结果。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 梦境记录主键 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 所属用户 |
| dream_text | TEXT | NOT NULL | - | 梦境原文 |
| emotion_after_waking | VARCHAR(30) | NULL | - | 醒来后情绪 |
| dream_people | JSON | NULL | - | 梦里出现的人物 |
| dream_symbols | JSON | NULL | - | 关键意象 |
| auto_title | VARCHAR(100) | NULL | - | AI 自动生成标题 |
| tags | JSON | NULL | - | 标签数组 |
| summary | VARCHAR(255) | NULL | - | 一句话摘要 |
| base_interpretation | TEXT | NULL | - | 基础解梦结果（JSON 字符串） |
| deep_interpretation | TEXT | NULL | - | 深度解梦结果（Pro 专享） |
| result_version | VARCHAR(20) | NULL | - | 结果模板版本 |
| source_type | VARCHAR(20) | NULL | - | 数据来源：manual / voice / imported |
| is_produced_success | TINYINT(1) | NOT NULL | 0 | AI 是否成功生成 |
| is_saved | TINYINT(1) | NOT NULL | 1 | 是否保留在历史记录中 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**
- `PRIMARY KEY (id)`
- `KEY idx_dream_records_user_id (user_id)`

---

### 3.4 dream_followups（梦境追问表）

保存追问问题、用户回答与补充解析。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 追问记录主键 |
| dream_record_id | BIGINT | FK → dream_records.id, NOT NULL, IDX | - | 关联梦境 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 所属用户 |
| followup_question | VARCHAR(255) | NOT NULL | - | AI 生成的追问问题 |
| user_answer | TEXT | NULL | - | 用户回答 |
| followup_interpretation | TEXT | NULL | - | 补充解析结果（JSON 字符串） |
| round_no | INT | NOT NULL | 1 | 追问轮次，MVP 固定为 1 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**
- `PRIMARY KEY (id)`
- `KEY idx_dream_followups_dream_record_id (dream_record_id)`
- `KEY idx_dream_followups_user_id (user_id)`

---

### 3.5 daily_fortunes（每日运势表）

按用户和日期缓存当天运势内容。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 所属用户 |
| fortune_date | DATE | NOT NULL | - | 运势日期 |
| overall_status | VARCHAR(255) | NULL | - | 整体状态 |
| reminder_text | TEXT | NULL | - | 提醒 |
| love_text | VARCHAR(255) | NULL | - | 爱情运势 |
| career_text | VARCHAR(255) | NULL | - | 事业运势 |
| self_text | VARCHAR(255) | NULL | - | 自我运势 |
| good_for | JSON | NULL | - | 宜做事项 |
| avoid_for | JSON | NULL | - | 忌做事项 |
| lucky_color | VARCHAR(50) | NULL | - | 幸运色 |
| lucky_time | VARCHAR(50) | NULL | - | 幸运时间 |
| full_content | TEXT | NULL | - | 完整运势文本 |
| is_pro_content | TINYINT(1) | NOT NULL | 0 | 是否为 Pro 内容 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_daily_fortunes_user_date (user_id, fortune_date)`

---

### 3.6 mood_records（心情记录表）

保存用户每次提交的主观情绪快照。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 所属用户 |
| record_date | DATE | NOT NULL | - | 记录归属日期 |
| mood_type | VARCHAR(20) | NOT NULL | - | 主情绪 |
| mood_intensity | INT | NOT NULL | - | 情绪强度 1-5 |
| mood_reason | VARCHAR(255) | NULL | - | 原因说明 |
| mood_tags | JSON | NULL | - | 原因标签 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**
- `PRIMARY KEY (id)`
- `KEY idx_mood_records_user_id (user_id)`
- `KEY idx_mood_records_user_date (user_id, record_date)`
- `KEY idx_mood_records_user_mood_type (user_id, mood_type)`

---

### 3.7 daily_summaries（每日总结表）

缓存每天生成的总结与饮食建议。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 所属用户 |
| summary_date | DATE | NOT NULL | - | 总结日期 |
| overall_status | TEXT | NOT NULL | - | 整体状态 |
| main_factors | TEXT | NOT NULL | - | 主要因素 |
| attention_point | TEXT | NOT NULL | - | 注意点 |
| reminder | TEXT | NOT NULL | - | 提醒 |
| diet_direction | TEXT | NOT NULL | - | 饮食方向 |
| eat_more | JSON | NULL | - | 建议多吃的食物 |
| eat_less | JSON | NULL | - | 建议少吃的食物 |
| diet_tip | TEXT | NOT NULL | - | 饮食小贴士 |
| source_snapshot | JSON | NULL | - | 生成时上下文快照 |
| status | VARCHAR(20) | NOT NULL | 'success' | 生成状态 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uq_user_summary_date (user_id, summary_date)`
- `KEY idx_daily_summaries_user_id (user_id)`
- `KEY idx_daily_summaries_user_date (user_id, summary_date)`

---

### 3.8 orders（订单表）

保存会员或报告类商品的支付订单。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 所属用户 |
| order_no | VARCHAR(64) | UK, NOT NULL | - | 订单号 |
| product_type | VARCHAR(30) | NOT NULL | - | 商品类型 |
| product_name | VARCHAR(100) | NOT NULL | - | 商品名称 |
| amount | DECIMAL(10,2) | NOT NULL | - | 订单金额 |
| currency | VARCHAR(10) | NOT NULL | 'CNY' | 货币 |
| pay_status | VARCHAR(20) | NOT NULL | 'unpaid' | 支付状态 |
| pay_channel | VARCHAR(30) | NULL | - | 支付渠道 |
| paid_at | DATETIME | NULL | - | 支付时间 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**
- `PRIMARY KEY (id)`
- `UNIQUE KEY uk_orders_order_no (order_no)`
- `KEY idx_orders_user_id (user_id)`

---

### 3.9 memberships（会员订阅表）

一条记录代表一段有效会员周期。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 所属用户 |
| plan_type | VARCHAR(20) | NOT NULL | - | 方案类型 |
| status | VARCHAR(20) | NOT NULL | - | 订阅状态 |
| start_at | DATETIME | NOT NULL | - | 开始时间 |
| expire_at | DATETIME | NOT NULL | - | 到期时间 |
| auto_renew | TINYINT(1) | NOT NULL | 0 | 是否自动续费 |
| source_channel | VARCHAR(30) | NULL | - | 来源渠道 |
| order_id | BIGINT | FK → orders.id, IDX | - | 关联订单 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP ON UPDATE | 更新时间 |

**索引**
- `PRIMARY KEY (id)`
- `KEY idx_memberships_user_id (user_id)`
- `KEY idx_memberships_order_id (order_id)`

---

### 3.10 feedbacks（用户反馈表）

收集喜欢/不喜欢/建议等运营数据。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, NOT NULL, IDX | - | 反馈用户 |
| target_type | VARCHAR(20) | NOT NULL | - | 反馈对象类型 |
| target_id | BIGINT | NOT NULL, IDX | - | 反馈对象 ID |
| feedback_type | VARCHAR(20) | NOT NULL | - | 反馈类型 |
| content | TEXT | NULL | - | 补充内容 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |

**索引**
- `PRIMARY KEY (id)`
- `KEY idx_feedbacks_user_id (user_id)`
- `KEY idx_feedbacks_target_id (target_id)`

---

### 3.11 prompt_logs（Prompt 调用日志表）

记录大模型入参、出参和调用状态。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, IDX | - | 关联用户，可能为 NULL |
| business_type | VARCHAR(30) | NOT NULL | - | 业务类型 |
| prompt_version | VARCHAR(20) | NULL | - | Prompt 版本 |
| input_payload | JSON | NULL | - | 输入参数 |
| output_payload | TEXT | NULL | - | 输出内容 |
| status | VARCHAR(20) | NOT NULL | - | 状态：success / failed / disabled |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |

**索引**
- `PRIMARY KEY (id)`
- `KEY idx_prompt_logs_user_id (user_id)`

---

### 3.12 event_logs（用户埋点日志表）

记录页面行为与附加上下文。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | BIGINT | PK, AI | - | 主键 |
| user_id | BIGINT | FK → users.id, IDX | - | 关联用户，可能为 NULL |
| event_name | VARCHAR(50) | NOT NULL | - | 事件名称 |
| page_name | VARCHAR(50) | NOT NULL | - | 页面名称 |
| event_payload | JSON | NULL | - | 事件数据 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |

**索引**
- `PRIMARY KEY (id)`
- `KEY idx_event_logs_user_id (user_id)`

---

## 4. 外键关系汇总

| 子表 | 外键字段 | 父表 | 父字段 |
|------|----------|------|--------|
| wechat_mini_accounts | user_id | users | id |
| dream_records | user_id | users | id |
| dream_followups | dream_record_id | dream_records | id |
| dream_followups | user_id | users | id |
| daily_fortunes | user_id | users | id |
| mood_records | user_id | users | id |
| daily_summaries | user_id | users | id |
| orders | user_id | users | id |
| memberships | user_id | users | id |
| memberships | order_id | orders | id |
| feedbacks | user_id | users | id |
| prompt_logs | user_id | users | id |
| event_logs | user_id | users | id |

---

## 5. 设计约定

1. **主键统一使用 `BIGINT AUTO_INCREMENT`**，为后续分库分表预留空间。
2. **时间戳统一使用 `created_at` / `updated_at`**，核心业务表均包含这两个字段。
3. **软删除**：用户表使用 `is_deleted` 标记，梦境记录使用 `is_saved` 标记，避免物理删除。
4. **JSON 字段**：用于存储标签、数组、快照等半结构化数据，保持schema灵活性。
5. **索引策略**：高频查询字段（user_id、日期组合）均已建立索引，日志表建议后续按时间分表。

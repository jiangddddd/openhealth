# AI Dream MVP 后端接口文档

> 版本：v1.0.0  
> Base URL：`http://127.0.0.1:8000`

---

## 1. 接口概览

所有业务接口（除登录/注册及埋点外）均需要携带 `Authorization: Bearer <token>` 请求头。

### 1.1 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { }
}
```

- `code = 0` 表示成功，非 0 表示业务或系统异常
- 全局异常会返回 `code: 5000` 并附带错误信息

### 1.2 认证方式

JWT Bearer Token，在 `Authorization` Header 中传递：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Token 有效期默认 30 天（`43200` 分钟），签发方标识为 `mydream`。

---

## 2. 认证模块（Auth）

前缀：`/api/auth`

### 2.1 手机号登录

**POST** `/api/auth/login`

#### 请求体

```json
{
  "loginType": "mobile",
  "mobile": "13800138000",
  "verifyCode": "123456"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| loginType | string | 是 | 登录方式，MVP 用 `mobile` |
| mobile | string | 是 | 手机号 |
| verifyCode | string | 是 | 短信验证码（MVP 不校验真实码） |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresAt": "2026-05-14T15:25:00Z",
    "userId": 1,
    "isNewUser": true
  }
}
```

---

### 2.2 微信小程序登录

**POST** `/api/auth/wechat/login`

#### 请求体

```json
{
  "code": "wx_login_code",
  "nickname": "微信用户",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 小程序 `wx.login` 获取的 code |
| nickname | string | 否 | 微信昵称 |
| avatarUrl | string | 否 | 微信头像 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresAt": "2026-05-14T15:25:00Z",
    "userId": 2,
    "isNewUser": false,
    "openid": "oABC123"
  }
}
```

---

## 3. 用户模块（User）

前缀：`/api/user`

### 3.1 获取个人资料

**GET** `/api/user/profile`

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 1,
    "nickname": "用户3800",
    "avatarUrl": null,
    "membershipStatus": "free",
    "membershipExpireAt": null,
    "totalDreamCount": 5,
    "consecutiveDays": 3
  }
}
```

---

## 4. 梦境模块（Dream）

前缀：`/api/dream`

### 4.1 提交梦境解析

**POST** `/api/dream/interpret`

#### 请求体

```json
{
  "dreamText": "我梦见自己在考试，但怎么也找不到考场...",
  "emotionAfterWaking": "焦虑",
  "dreamPeople": ["老师"],
  "dreamSymbols": ["考试", "迷路"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dreamText | string | 是 | 梦境原文，最少 10 字 |
| emotionAfterWaking | string | 否 | 醒来后情绪 |
| dreamPeople | string[] | 否 | 梦里出现的人物 |
| dreamSymbols | string[] | 否 | 关键意象/画面 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "dreamRecordId": 10,
    "autoTitle": "关于考试迷路的梦",
    "tags": ["考试", "焦虑", "迷路"],
    "summary": "近期压力让你感到方向感缺失。",
    "baseInterpretation": {
      "conclusion": "你最近可能正处在想弄清某件事...",
      "symbols": "考试更像是一种潜意识提醒...",
      "mapping": "这类梦常出现在现实里有压力...",
      "reminder": "你醒来后的感受偏焦虑...",
      "goodFor": ["梳理任务", "留意情绪"],
      "avoidFor": ["冲动决定", "过度内耗"]
    },
    "followupQuestion": "你最近是不是总担心自己做得还不够好？",
    "membershipInfo": {
      "membershipStatus": "free",
      "canViewDeepInterpretation": false
    }
  }
}
```

---

### 4.2 获取梦境列表

**GET** `/api/dream/list?pageNo=1&pageSize=10&filterType=all`

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| pageNo | int | 1 | 页码 |
| pageSize | int | 10 | 每页条数，最大 50 |
| filterType | string | all | 筛选类型（预留） |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "dreamRecordId": 10,
        "date": "2026-04-14",
        "autoTitle": "关于考试迷路的梦",
        "dreamText": "我梦见自己在考试...",
        "tags": ["考试", "焦虑"],
        "summary": "近期压力让你感到方向感缺失。"
      }
    ],
    "pageNo": 1,
    "pageSize": 10,
    "total": 5,
    "hasMore": false
  }
}
```

---

### 4.3 获取梦境详情

**GET** `/api/dream/{dreamRecordId}`

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "dreamRecordId": 10,
    "dreamText": "我梦见自己在考试...",
    "emotionAfterWaking": "焦虑",
    "dreamPeople": ["老师"],
    "dreamSymbols": ["考试", "迷路"],
    "autoTitle": "关于考试迷路的梦",
    "tags": ["考试", "焦虑"],
    "summary": "近期压力让你感到方向感缺失。",
    "baseInterpretation": { "conclusion": "...", "symbols": "...", "mapping": "...", "reminder": "...", "goodFor": [], "avoidFor": [] },
    "followupId": 3,
    "followupQuestion": "你最近是不是总担心自己做得还不够好？",
    "followupAnswer": "是的，最近项目 deadline 很紧。",
    "followupInterpretation": { "closerState": "...", "deeperReason": "...", "suggestion": "..." },
    "deepInterpretation": null,
    "createdAt": "2026-04-14 08:30:00"
  }
}
```

> `deepInterpretation` 仅在用户为 Pro 会员时返回。

---

### 4.4 提交追问回答

**POST** `/api/dream/followup`

#### 请求体

```json
{
  "dreamRecordId": 10,
  "followupQuestion": "你最近是不是总担心自己做得还不够好？",
  "userAnswer": "是的，最近项目 deadline 很紧。"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dreamRecordId | int | 是 | 梦境记录 ID |
| followupQuestion | string | 是 | 当前展示的追问问题 |
| userAnswer | string | 是 | 用户回答，最少 1 字 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "followupId": 3,
    "followupInterpretation": {
      "closerState": "...",
      "deeperReason": "...",
      "suggestion": "..."
    },
    "membershipInfo": {
      "membershipStatus": "free",
      "canViewDeepInterpretation": false,
      "upgradeHint": "解锁深度分析，可查看更多情绪根源与行动建议。"
    }
  }
}
```

---

### 4.5 删除梦境记录

**POST** `/api/dream/delete`

#### 请求体

```json
{
  "dreamRecordId": 10
}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

> 软删除，仅将 `is_saved` 置为 `false`。

---

## 5. 心情模块（Mood）

前缀：`/api/mood`

### 5.1 创建心情记录

**POST** `/api/mood/create`

#### 请求体

```json
{
  "moodType": "焦虑",
  "moodIntensity": 4,
  "moodReason": "项目 deadline 临近",
  "moodTags": ["工作", "压力"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| moodType | enum | 是 | 开心/平静/焦虑/疲惫/难过/烦躁/迷茫 |
| moodIntensity | int | 是 | 1-5 |
| moodReason | string | 否 | 原因说明，最多 255 字 |
| moodTags | string[] | 否 | 原因标签 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "moodRecordId": 7,
    "recordDate": "2026-04-14",
    "moodType": "焦虑",
    "moodIntensity": 4,
    "moodReason": "项目 deadline 临近",
    "moodTags": ["工作", "压力"],
    "createdAt": "2026-04-14 09:00:00",
    "updatedAt": "2026-04-14 09:00:00"
  }
}
```

---

### 5.2 获取当天心情

**GET** `/api/mood/today`

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "moodRecordId": 7,
    "recordDate": "2026-04-14",
    "moodType": "焦虑",
    "moodIntensity": 4,
    "moodReason": "项目 deadline 临近",
    "moodTags": ["工作", "压力"],
    "createdAt": "2026-04-14 09:00:00",
    "updatedAt": "2026-04-14 09:00:00"
  }
}
```

> 若当天未记录心情，返回 `data: null`。

---

### 5.3 获取心情历史列表

**GET** `/api/mood/list?pageNo=1&pageSize=10&moodType=焦虑`

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| pageNo | int | 1 | 页码 |
| pageSize | int | 10 | 每页条数，最大 50 |
| moodType | string | null | 按情绪类型筛选 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [ ... ],
    "pageNo": 1,
    "pageSize": 10,
    "total": 12,
    "hasMore": true
  }
}
```

---

## 6. 每日总结模块（Summary）

前缀：`/api/summary`

### 6.1 生成今日总结

**POST** `/api/summary/generate`

#### 请求体

```json
{
  "forceRegenerate": false
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| forceRegenerate | bool | false | 是否强制重新生成 |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "summaryId": 3,
    "summaryDate": "2026-04-14",
    "overallStatus": "今天整体状态偏向内敛...",
    "mainFactors": "工作压力 + 睡眠不足...",
    "attentionPoint": "注意不要把焦虑带到晚上...",
    "reminder": "允许自己有一段低效时间...",
    "dietAdvice": {
      "direction": "清淡为主，少刺激",
      "eatMore": ["绿叶蔬菜", "小米粥"],
      "eatLess": ["咖啡", "辛辣食物"],
      "tip": "晚餐尽量提前一小时。"
    },
    "status": "success",
    "createdAt": "2026-04-14 10:00:00",
    "updatedAt": "2026-04-14 10:00:00"
  }
}
```

> 若当天无心情和梦境记录，返回 HTTP 400：`No mood or dream records for today`

---

### 6.2 获取当天总结

**GET** `/api/summary/today`

#### 响应示例

同 6.1，若未生成则返回 `data: null`。

---

### 6.3 获取总结历史列表

**GET** `/api/summary/list?pageNo=1&pageSize=10`

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [ ... ],
    "pageNo": 1,
    "pageSize": 10,
    "total": 8,
    "hasMore": false
  }
}
```

---

## 7. 运势模块（Fortune）

前缀：`/api/fortune`

### 7.1 获取今日运势

**GET** `/api/fortune/today`

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "fortuneDate": "2026-04-14",
    "overallStatus": "今天整体状态偏平稳...",
    "reminderText": "近期情绪关键词偏向焦虑...",
    "loveText": "关系里适合先观察情绪...",
    "careerText": "工作或学习上适合先完成最关键的一件事。",
    "selfText": "今天更适合给自己留一点喘息空间。",
    "goodFor": ["整理", "复盘", "早睡"],
    "avoidFor": ["冲动沟通", "拖延", "过度内耗"],
    "luckyColor": "浅蓝色",
    "luckyTime": "19:00-21:00",
    "isProContent": false
  }
}
```

---

## 8. 首页模块（Home）

前缀：`/api/home`

### 8.1 获取首页概览

**GET** `/api/home/overview`

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "todaySummary": {
      "summaryId": 3,
      "summaryDate": "2026-04-14",
      "overallStatus": "今天整体状态偏向内敛...",
      "reminder": "允许自己有一段低效时间...",
      "createdAt": "2026-04-14 10:00:00",
      "updatedAt": "2026-04-14 10:00:00"
    },
    "todayDietAdvice": {
      "direction": "清淡为主，少刺激",
      "tip": "晚餐尽量提前一小时。"
    },
    "latestDream": {
      "dreamRecordId": 10,
      "title": "关于考试迷路的梦",
      "summary": "近期压力让你感到方向感缺失。",
      "createdAt": "2026-04-14 08:30:00"
    },
    "latestMood": {
      "moodRecordId": 7,
      "recordDate": "2026-04-14",
      "moodType": "焦虑",
      "moodIntensity": 4,
      ...
    },
    "consecutiveDays": 3
  }
}
```

---

## 9. 会员模块（Membership）

前缀：`/api/membership`

### 9.1 获取会员信息

**GET** `/api/membership/info`

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "membershipStatus": "free",
    "expireAt": null,
    "plans": [
      { "planType": "monthly", "planName": "月度 Pro", "price": "28.00", "currency": "CNY" },
      { "planType": "yearly", "planName": "年度 Pro", "price": "168.00", "currency": "CNY" }
    ],
    "benefits": ["无限次解梦", "深度解析", "完整历史记录", "每周梦境总结"]
  }
}
```

---

## 10. 订单模块（Order）

前缀：`/api/order`

### 10.1 创建订单

**POST** `/api/order/create`

#### 请求体

```json
{
  "productType": "membership",
  "planType": "monthly",
  "payChannel": "wechat"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productType | string | 是 | 商品类型，如 `membership` |
| planType | string | 否 | 会员方案：`monthly` / `yearly` |
| payChannel | string | 是 | 支付渠道，如 `wechat` / `alipay` |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderId": 5,
    "orderNo": "ORD202604141525001",
    "amount": "28.00",
    "payParams": {
      "prepayId": "mock_ORD202604141525001"
    }
  }
}
```

---

### 10.2 查询订单详情

**GET** `/api/order/{orderId}`

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderId": 5,
    "orderNo": "ORD202604141525001",
    "payStatus": "unpaid",
    "paidAt": null
  }
}
```

---

## 11. 反馈模块（Feedback）

前缀：`/api/feedback`

### 11.1 提交反馈

**POST** `/api/feedback/create`

#### 请求体

```json
{
  "targetType": "dream",
  "targetId": 10,
  "feedbackType": "like",
  "content": "解析很准"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| targetType | string | 是 | 反馈对象类型，如 `dream` |
| targetId | int | 是 | 反馈对象 ID |
| feedbackType | string | 是 | 反馈类型，如 `like` / `dislike` / `suggest` |
| content | string | 否 | 补充内容 |

---

## 12. 埋点模块（Event）

前缀：`/api/event`

### 12.1 上报事件

**POST** `/api/event/create`

#### 请求体

```json
{
  "eventName": "dream_submit",
  "pageName": "input",
  "eventPayload": { "dreamLength": 120 }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| eventName | enum | 是 | 事件名（见下表） |
| pageName | enum | 是 | 页面名：`home`/`input`/`result`/`history`/`membership` |
| eventPayload | object/array | 否 | 事件附加数据 |

#### 支持的事件名

- `home_view`
- `dream_entry_click`
- `dream_submit`
- `dream_result_view`
- `followup_submit`
- `followup_result_view`
- `fortune_view`
- `history_view`
- `history_item_click`
- `membership_view`
- `payment_click`
- `payment_success`

---

## 13. 公共接口

### 13.1 健康检查

**GET** `/health`

#### 响应示例

```json
{
  "status": "ok"
}
```

---

## 14. 错误码说明

| HTTP 状态码 | 业务 code | 说明 |
|-------------|-----------|------|
| 200 | 0 | 成功 |
| 401 | - | Token 缺失、过期或用户不存在 |
| 404 | - | 资源不存在（梦境/订单） |
| 400 | - | 参数错误或业务条件不满足（如当天无记录无法生成总结） |
| 500 | 5000 | 系统异常，返回异常详情 |

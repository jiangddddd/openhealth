# AI Dream MVP

一个基于 `FastAPI + React + MySQL + Qwen` 的梦境解析与轻玄学陪伴应用 MVP。

用户登录后可以输入梦境内容，系统会生成：
- 梦境标题、标签、摘要
- 基础解梦结果
- 一轮 AI 追问与补充解析
- 今日运势
- 历史梦境档案

当前项目同时包含：
- `后端 API`
- `前端 React 页面`
- `MySQL 建表脚本`
- `Qwen 大模型接入`

## 主要功能

### 用户侧功能
- 手机号登录（MVP 为 mock 登录）
- 梦境输入与保存
- 基础梦境解析
- AI 追问 1 次
- 追问后的补充解析
- 历史梦境查看
- 今日运势
- 会员页与 mock 订单能力

### 系统侧能力
- MySQL 数据存储
- Prompt 调用日志记录到 `prompt_logs`
- Qwen 调用入参/出参日志
- 大模型失败时自动回退到本地 mock 逻辑

## 技术栈

### 后端
- `FastAPI`
- `SQLAlchemy`
- `PyMySQL`
- `Pydantic Settings`
- `OpenAI Python SDK`（用于接 DashScope OpenAI 兼容模式）

### 前端
- `React`
- `Vite`

### 数据库
- `MySQL`

### 大模型
- `Qwen`（通过 DashScope OpenAI-compatible API）

## 项目结构

```text
mydream/
├─ app/
│  ├─ routers/               # 接口路由
│  ├─ services/              # 内容生成、Qwen 调用
│  ├─ config.py              # 环境变量配置
│  ├─ crud.py                # 核心业务逻辑
│  ├─ database.py            # 数据库连接
│  ├─ deps.py                # 依赖注入与登录态解析
│  ├─ main.py                # FastAPI 入口
│  ├─ models.py              # SQLAlchemy 模型
│  └─ schemas.py             # 请求/响应结构
├─ frontend/
│  ├─ src/
│  │  ├─ components/         # React 基础组件
│  │  ├─ pages/              # 页面组件
│  │  ├─ hooks/              # 自定义 hooks
│  │  └─ services/           # 前端 API 请求
│  ├─ dist/                  # 前端构建产物
│  ├─ index.html
│  └─ styles.css
├─ sql/
│  └─ schema.sql             # 原生 MySQL 建表脚本
├─ create_tables.py          # Python 建表脚本
├─ requirements.txt          # Python 依赖
├─ package.json              # 前端依赖与脚本
├─ vite.config.js            # Vite 配置
└─ README.md
```

## 环境要求

- Python `3.11+`（建议）
- Node.js `16+`
- MySQL `8+`

## 环境变量

先复制：

```bash
copy .env.example .env
```

或手动创建 `.env`。

### `.env.example`

```env
DATABASE_URL=mysql+pymysql://root:password@127.0.0.1:3306/dream_app?charset=utf8mb4
AUTO_CREATE_TABLES=true
QWEN_API_KEY=
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

### 字段说明

- `DATABASE_URL`
  - MySQL 连接地址
- `AUTO_CREATE_TABLES`
  - 是否在后端启动时自动建表
- `QWEN_API_KEY`
  - DashScope 的 API Key
- `QWEN_BASE_URL`
  - Qwen OpenAI 兼容接口地址
- `QWEN_MODEL`
  - 当前使用的模型名，默认 `qwen-plus`

## 安装依赖

### 后端依赖

```bash
pip install -r requirements.txt
```

### 前端依赖

```bash
npm install
```

## 数据库建表

### 方式一：Python 自动建表

```bash
python create_tables.py
```

### 方式二：直接执行 SQL

```bash
mysql -u root -p dream_app < sql/schema.sql
```

## 启动项目

### 启动后端

```bash
uvicorn app.main:app --reload
```

后端默认运行在：

[`http://127.0.0.1:8000`](http://127.0.0.1:8000)

### 启动前端开发环境

```bash
npm run dev
```

前端默认运行在：

[`http://127.0.0.1:5173`](http://127.0.0.1:5173)

### 前端构建

```bash
npm run build
```

构建后会生成：

- `frontend/dist`

后端会自动托管构建后的静态资源。

## 接口说明

### 登录与用户
- `POST /api/auth/login`
- `GET /api/user/profile`

### 梦境解析
- `POST /api/dream/interpret`
- `GET /api/dream/list`
- `GET /api/dream/{dreamRecordId}`
- `POST /api/dream/followup`
- `POST /api/dream/delete`

### 运势
- `GET /api/fortune/today`

### 会员与订单
- `GET /api/membership/info`
- `POST /api/order/create`
- `GET /api/order/{orderId}`

### 反馈
- `POST /api/feedback/create`

## Qwen 大模型接入

项目已经接入 `Qwen`，通过 DashScope 的 OpenAI 兼容模式调用。

当 `QWEN_API_KEY` 已配置时，后端会调用真实大模型生成：
- 梦境标题
- 标签
- 摘要
- 基础解梦
- 追问问题
- 补充解析
- 深度解读
- 今日运势

当 `QWEN_API_KEY` 为空时：
- 不会调用真实模型
- 会自动回退到本地 mock 生成逻辑

## Prompt 日志

每次调用大模型时，都会把记录写入 `prompt_logs` 表，便于排查：
- `business_type`
- `prompt_version`
- `input_payload`
- `output_payload`
- `status`

常见状态：
- `success`
- `failed`
- `disabled`

## 前端说明

当前前端基于 React 实现，已经包含：
- 首页
- 梦境输入页
- 梦境结果页
- 历史记录页
- 我的 / 会员页

并补充了：
- 提交梦境的全屏 loading 遮罩
- 动态进度条
- 历史梦境原文展示
- 追问仅允许一次的页面逻辑

## 开发说明

### 当前 MVP 重点
- 先验证用户是否愿意持续记录梦境
- 验证基础解梦结果是否有感知价值
- 验证追问与补充解析是否能提高体验
- 验证会员和深度内容的转化可能性

### 当前已实现但仍偏 MVP 的部分
- 登录是 mock 逻辑
- 支付是 mock 订单
- 会员权限是基础版
- 追问当前只支持一轮

## 常见问题

### 1. 为什么没有调用到大模型？
先检查 `.env` 里的：

```env
QWEN_API_KEY=你的真实 key
```

如果为空，系统会自动回退 mock。

### 2. 为什么有 `Qwen request` 但没有 `Qwen response`？
通常有两种情况：
- `QWEN_API_KEY` 未配置
- 请求异常，已写入 `prompt_logs`

### 3. 前端为什么打不开？
先检查：
- 后端是否正常运行
- 前端 `npm run dev` 是否正常
- 浏览器控制台是否有字段类型错误

## 后续可扩展方向

- 多轮追问
- 梦境周报 / 月报
- 塔罗 / 抽签 / 起卦
- 更完整的会员体系
- 真正的短信登录
- 真正的支付回调
- Prompt 配置化管理

## License

当前项目仅作内部开发与学习使用。

如有相关问题沟通，请联系jiangtf390744119@gmail.com

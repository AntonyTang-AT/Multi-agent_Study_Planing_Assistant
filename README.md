# 多智能体学习计划助手（高数 / 大物 / 计概）

面向大学生 **期末复习**、**跟课补漏** 与 **计概 Python 练习** 的 AI+学习生活项目。  
采用「传统 Web 学习站 + 独立多智能体智能内核」架构：前端与后端负责界面与数据存取，**全部 AI 能力封装在 `agent/` 服务中**，对外只保留稳定的输入 / 输出接口。

仓库地址：<https://github.com/AntonyTang-AT/Multi-agent_Study_Planing_Assistant>

---

## 一句话创新

别人的多 Agent 在分工生成；我们的多 Agent 在分工**质疑、校验和协商**。  
计划冲突与不可靠答案会显式暴露，由用户裁决，系统不偷偷改计划、不强行给错答。

---

## 当前能力（可演示）

| 能力 | 说明 |
|---|---|
| 学习计划 | 按场景生成计划；时间不够时弹出「今晚需确认」三选一，确认后重排 |
| 练习与校验 | 高数 / 大物题库作答；Agent 校验、弃答、错因回流轨迹与黑板 |
| 计概 Python 沙箱 | 浏览器内 Pyodide 自测 + 代码小助教（读报错、提示逻辑错如误用 `.lower()`） |
| 学习对话 | 结构化建议与快捷跳转；计概侧侧重报错解读与沙箱/平台题迁移 |
| 资料中心 | 按学科 / 章节浏览教材·课件·习题索引；配置 `MATERIALS_ROOT` 后可预览/下载原件 |
| 黑板传话 | 冲突 / 质疑 / 干预条目；展示多智能体传话证据与历史 |
| 演示预设 | 一键恢复开场数据（不是清空账号）；支持时间跳跃等演示条 |

---

## 演示账号

短用户名 + 短密码；登录页可点芯片一键填入。详情见 [`docs/演示账号.md`](docs/演示账号.md)。

| 用户名 | 密码 | 建议看点 |
|--------|------|----------|
| `math` | `demo` | 高数期末；计划页「今晚需确认」→ 确认后「安排已更新」 |
| `phys` | `demo` | 大物跟课；错因与已解决冲突历史 |
| `catch` | `demo` | 断练恢复；短任务干预 |
| `cs` | `demo` | 计概；计划冲突确认 + Python 沙箱助教 + 洛谷/力扣外链 |
| `admin` | `admin` | 管理看板与学情统计 |

```bash
cd backend
python -m scripts.seed_demo_accounts
```

线上若数据被改乱：登录对应账号 → 打开「体验」→「恢复预设」。

---

## 目录结构

```text
├── frontend/     # Web 前端（React + Vite + TS + Ant Design）
├── backend/      # 业务后端（FastAPI + SQLite，AI 仅转发）
├── agent/        # 多智能体智能内核（唯一调用 LLM / 规则校验处）
├── data/         # 高数·大物·计概结构化资料与题库
├── docs/         # 方案、分工、接口、演示脚本
├── poster/       # A2 海报
├── pitch/        # PPT、路演稿
└── scripts/      # 可选一键启动脚本
```

更细说明见 [`docs/项目文件结构.md`](docs/项目文件结构.md)。资料包细节见 [`data/README.md`](data/README.md)。

---

## 技术栈

| 层级 | 选型 |
|---|---|
| 前端 | React 18 + Vite + TypeScript + Ant Design 5 + React Router + Axios + Zustand · 计概沙箱用 Pyodide |
| 后端 | FastAPI + SQLAlchemy 2 + SQLite + Pydantic v2 + httpx + JWT |
| 智能内核 | FastAPI + intent 路由 + Worker + DeepSeek + SymPy（不强制 CrewAI） |
| 资料 | UTF-8 JSON / Markdown + `validate_schema.py` |
| 本地端口 | 前端 `5173` · 后端 `8000` · Agent `8001` |

---

## 本地启动

1. 克隆本仓库，复制 `.env.example` → `.env`（**不要提交 `.env`**），填入 LLM Key 等本地配置。  
2. 校验资料：

```bash
python data/scripts/validate_schema.py
```

3. 启动三端（分终端）：

```bash
# Agent
cd agent && python -m venv .venv && .venv\Scripts\activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

# Backend
cd backend && python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # 或 cp .env.example .env
python -m scripts.seed_or_import
python -m scripts.seed_demo_accounts
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

4. 打开 <http://localhost:5173/> ；三分钟演示条：<http://localhost:5173/?demo=1>

各层补充说明：[`frontend/README.md`](frontend/README.md) · [`backend/README.md`](backend/README.md) · [`agent/README.md`](agent/README.md) · [`docs/演示脚本.md`](docs/演示脚本.md)

### 资料原件预览（可选）

在服务器或本机配置 `MATERIALS_ROOT` 指向已授权文件目录后，资料页可走预览/下载（可配合 nginx `X-Accel`）。**仓库默认不含教材 PDF/PPT**；索引里 `status=downloaded` 不代表线上已有文件。见 `backend/README.md`。

---

## 文档入口

| 文档 | 用途 |
|---|---|
| [`docs/学习计划多智能体系统·形式化整体方案.md`](docs/学习计划多智能体系统·形式化整体方案.md) | 总方案 |
| [`docs/五人分工与细化落地说明.md`](docs/五人分工与细化落地说明.md) | 分工边界 |
| [`docs/五人详细任务计划.md`](docs/五人详细任务计划.md) | 逐日任务 |
| [`docs/技术路线与方案.md`](docs/技术路线与方案.md) | 技术路线 |
| [`docs/roles/`](docs/roles/) | 分人职责 |
| [`docs/api.md`](docs/api.md) | 业务 API |
| [`docs/agent-api.md`](docs/agent-api.md) | Agent I/O |
| [`docs/前后端联调接口说明.md`](docs/前后端联调接口说明.md) | **联调先读** |
| [`docs/演示账号.md`](docs/演示账号.md) · [`docs/演示脚本.md`](docs/演示脚本.md) | 答辩演示 |

任务看板：Issues / Project 见仓库 GitHub 页；认领后把 Status 改为 `In Progress`，完成改为 `Done`。

---

## 安全说明

- `.env` 已在 `.gitignore`，禁止把 GitHub Token、LLM Key 提交进仓库。  
- 若 Token 曾在聊天、截图或公开场合出现，请立刻到 GitHub → Settings → Developer settings **撤销并重新生成**。

---

## 许可证与资料合规

课程答辩学习使用。教材 / 真题等资料仅作结构化摘录与元数据整理，详见 `data/README.md`。合成演示数据须标注 `synthetic`。

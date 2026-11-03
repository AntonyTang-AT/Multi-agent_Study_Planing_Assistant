# backend（2 号）

**锁定栈**：FastAPI + SQLAlchemy 2 + SQLite + Pydantic v2 + httpx · 传统 Web API，AI 仅转发。

- 默认端口 `8000` · `AGENT_BASE_URL=http://127.0.0.1:8001` · **不放 LLM Key**
- 职责：`docs/roles/02-后端.md` · 任务：`docs/五人详细任务计划.md`
- 接口：`docs/api.md` · 联调：`docs/前后端联调接口说明.md`

## 当前进度

- **B1**：`GET /api/health`、`POST /api/session`、CORS、SQLite `User`
- **B2**：从 `data/` 导入 taxonomy / materials / questions；`GET /api/materials`、`GET /api/questions`
- **B3**：`plans` / `attempts` / `blackboard` CRUD（响应对齐前端；缺省 `X-User-Id` 回退 `u_web_demo`）
- **B4**：`POST /api/ai/{intent}` 透传 Agent；失败返回 `agent_unavailable`；health 含 `agent`
- **B5**：AI 成功路径落库（`AiCallLog` / 黑板 / 计划草稿）、`POST /api/demo/time-jump`、种子库导出/恢复

## B5 已交付

- 模型：`AiCallLog`；`User.demo_time_jump_days`
- `POST /api/ai/{intent}` **成功路径落库**：
  - 全量请求/响应 → `ai_call_logs`
  - `blackboard_entries[]` → 已有 `blackboard_entries` 表
  - `output.plan` → `plans` 草稿快照
- `POST /api/demo/time-jump`：`{ "days": 2 }`；只改演示偏移，不写智能
- 后续 AI 调用若会话偏移 `> 0`，网关注入 `demo.time_jump_days`（不覆盖请求中已显式正值）
- 种子库脚本：导出 / 一键恢复 `demo.db`（见下）

### 答辩种子库恢复

`*.db` 默认 gitignore，现场用脚本生成与恢复：

```bash
cd backend
# 导入 4 号资料后导出干净种子
python -m scripts.seed_or_import --force --export-demo
# → 生成 backend/demo.db

# 答辩前一键恢复工作库
python -m scripts.seed_or_import --restore-demo
# → 用 demo.db 覆盖 app.db（DATABASE_URL 指向的文件）
```

也可自定义路径：`--demo-path F:\backup\demo.db`。

### 调 AI 网关

```bash
# 先启动 Agent :8001
curl -s -X POST http://127.0.0.1:8000/api/ai/echo \
  -H "Content-Type: application/json" \
  -d "{\"request_id\":\"r1\",\"task_id\":\"t1\",\"intent\":\"echo\",\"input\":{}}"
```

### 导入资料

```bash
cd backend
python -m scripts.seed_or_import          # 空库自动种子
python -m scripts.seed_or_import --force  # 幂等全量 upsert
```

服务启动时若库为空也会自动 `seed_if_empty`。

## 启动

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # 或 cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

验证：

```bash
curl -s http://127.0.0.1:8000/api/health
curl -s -X POST http://127.0.0.1:8000/api/session
# 浏览器打开 http://127.0.0.1:8000/docs

# 冒烟（B5 demo）：
# USER=$(curl -s -X POST http://127.0.0.1:8000/api/session | jq -r .user_id)
# curl -s -X POST http://127.0.0.1:8000/api/demo/time-jump -H "X-User-Id: $USER" -H "Content-Type: application/json" -d '{"days":3}'
```

Agent 未启动时 `agent` 应为 `"down"`，`db` 仍为 `"up"`，不阻塞后续 CRUD。

## 与前端联调

1. 本服务 `:8000`
2. 前端 `.env`：`VITE_API_BASE=http://127.0.0.1:8000`（或 localhost）、`VITE_USE_MOCK=false`
3. 可选 Agent：`cd agent && uvicorn app.main:app --port 8001`

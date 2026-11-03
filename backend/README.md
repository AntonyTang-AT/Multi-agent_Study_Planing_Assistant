# backend（2 号）

**锁定栈**：FastAPI + SQLAlchemy 2 + SQLite + Pydantic v2 + httpx · 传统 Web API，AI 仅转发。

- 默认端口 `8000` · `AGENT_BASE_URL=http://127.0.0.1:8001` · **不放 LLM Key**
- 职责：`docs/roles/02-后端.md` · 任务：`docs/五人详细任务计划.md`
- 接口：`docs/api.md` · 联调：`docs/前后端联调接口说明.md`

## 当前进度

已完成 Issue `#11 [后端][B1] FastAPI 骨架`：

- `GET /api/health` → `{ "db": "up"|"down", "agent": "up"|"down" }`（探测 Agent `GET /health`）
- `POST /api/session` → `{ "user_id": "..." }`（对齐前端 `createSession`）
- CORS 放行 `http://localhost:5173` 与 `http://127.0.0.1:5173`
- SQLite + `User` 表；OpenAPI `/docs`

资料查询、计划/作答/黑板、AI 网关属于 B2–B5。

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
```

Agent 未启动时 `agent` 应为 `"down"`，`db` 仍为 `"up"`，不阻塞后续 CRUD。

## 与前端联调

1. 本服务 `:8000`
2. 前端 `.env`：`VITE_API_BASE=http://127.0.0.1:8000`（或 localhost）、`VITE_USE_MOCK=false`
3. 可选 Agent：`cd agent && uvicorn app.main:app --port 8001`

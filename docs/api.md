# 后端业务 API（2 号维护）

> Base：`http://localhost:8000`  
> 错误体：`{ "code": string, "message": string, "detail"?: any }`  
> 详细技术约定见 [技术路线与方案](./技术路线与方案.md)  
> 实现以 OpenAPI `/docs` 为准，本文件保持人读摘要同步。

## 健康检查

`GET /api/health` → `{ "db": "up"|"down", "agent": "up"|"down" }`

- `agent` 探测 `GET {AGENT_BASE_URL}/health`；Agent 宕机时 CRUD 仍可用。

## 会话

`POST /api/session` → `{ "user_id": "..." }`

## 资料与题目（B2）

响应均为 **JSON 数组**（对齐前端 `fetchMaterials` / `fetchQuestions`）。

### 资料

`GET /api/materials?subject=&chapter=&scenario_tag=`

示例：

```http
GET /api/materials?subject=math&chapter=math.a1.ch02
```

单项字段（与 `data/materials/index.json` / 前端 `Material` 对齐）：

`material_id`, `subject`, `chapter_id`, `kind`, `title`, `file?`, `page_range?`, `page_status?`, `license_note`, `status`, `note?`, 以及扩展 `summary` / `knowledge_ids` / `scenario_tags`。

### 题目

`GET /api/questions?subject=&knowledge_id=&scenario_tag=&exam_hot=`

示例：

```http
GET /api/questions?subject=math&knowledge_id=math.limit&scenario_tag=final_review
```

- `knowledge_id` 支持细粒度 ID（如 `math.a1.ch02.kp06`）或 Agent 粗 ID（如 `math.limit`）。  
  粗 ID 经 `data/taxonomy/aliases.json` 映射后过滤，**不能**假定题库里直接存粗 ID。
- 单项字段对齐前端 `Question`：`question_id`, `subject`, `knowledge_ids`, `scenario_tags`, `chapter`, `exam_hot`, `difficulty`, `type`, `stem`, `answer`, `assumptions`, `error_tags`, `verify_hint?`, `source`, `license_note`。

### 导入

空库启动时自动种子导入；也可手动：

```bash
cd backend
python -m scripts.seed_or_import          # 空库才导入
python -m scripts.seed_or_import --force  # 幂等 upsert 全量
```

## 计划

- `GET /api/plans/current`
- `PUT /api/plans/current` — 保存用户确认后的计划快照

## 作答

`POST /api/attempts` — body 含 `question_id`, `answer`, `error_tag?`, `duration_ms?`

## 黑板

- `GET /api/blackboard`
- `POST /api/blackboard/{id}/resolve` — `{ "action": "...", "note"?: "..." }`

## AI 网关（仅转发）

`POST /api/ai/{intent}`  

Body 对齐 Agent 请求子集；响应为 Agent 响应，并已落库。  

**联调必读（3 号已冻结）：**

- [`docs/前后端联调接口说明.md`](./前后端联调接口说明.md) — 网关职责、错误码、落库字段  
- [`docs/agent-api.md`](./agent-api.md) — intent / 响应合同  
- [`agent/examples/`](../agent/examples/) — 可拷贝 JSON  

`intent` 白名单与字段以 `agent-api.md` 为准；网关禁止写智能分支。

## 演示

`POST /api/demo/time-jump` — `{ "days": 2 }`

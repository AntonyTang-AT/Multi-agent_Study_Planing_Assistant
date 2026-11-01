# frontend（1 号）

**锁定栈**：React 18 + Vite + TypeScript + Ant Design 5 + React Router 6 + Axios + Zustand

- 只请求 `backend`（默认 `http://localhost:8000`）
- 职责：`docs/roles/01-前端.md` · 任务：`docs/五人详细任务计划.md`

## 当前状态

F1–F5 前端主路径已落地：

- Vite + React 18 + TypeScript + Ant Design 5
- `/`、`/chat`、`/plan`、`/practice`、`/materials`、`/trace`、`/blackboard`
- 双场景向导、Mock 计划冲突、用户裁决与二次审计
- 练习 passed / abstain、计算检验轨迹和作答记录
- 黑板条目过滤与 resolve
- 资料查询与筛选、学习轨迹、结构化对话
- Axios 业务 API / AI 网关封装，统一错误提示
- Zustand + localStorage 学习状态
- `/?demo=1` 三分钟演示控制条：冲突、弃答、时间跳跃、重置
- 全局闭环条：场景 → 计划 → 练习 → 轨迹 → 黑板，实时显示当前任务状态

Mock 数据位于 `src/mocks`，改编自 `agent/examples`。关闭 `VITE_USE_MOCK` 后，页面经 backend 的 CRUD 与 `/api/ai/{intent}` 网关取真实数据。

## 页面如何互相联动

| 页面 | 上游输入 | 产生的状态 | 下游消费 |
|---|---|---|---|
| 场景 | 考试日 / 章节 / 时长 / 科目 | `setup` | 计划生成与审计 |
| 计划 | 场景与 Agent `conflict` | `plan + user_options` | 练习任务与黑板裁决 |
| 练习 | 计划知识点与题库 | `attempt + verify status` | 轨迹与错因反馈 |
| 轨迹 | 作答、提示、弃答行为 | 掌握度与负荷信号 | 黑板干预与下一轮计划 |
| 黑板 | 冲突、质疑、干预 | open / resolved 条目 | 用户裁决与计划重排 |
| 对话 | 自然语言上下文 | 结构化建议 | 跳转计划、练习或黑板 |
| 资料 | 学科 / 章节 / 场景标签 | 来源与元数据 | 计划证据与练习选择 |

所有页面共享同一份 Zustand 学习状态，不各自伪造“当前学生”或“当前计划”。

## 启动

```bash
npm install
npm run dev
```

构建与类型检查：

```bash
npm run typecheck
npm run build
```

三分钟演示入口：

```text
http://localhost:5173/?demo=1
```

完整操作步骤见 [`docs/演示脚本.md`](../docs/演示脚本.md)。

## 环境变量

复制 `.env.example` 为 `.env`，本地默认值：

```env
VITE_API_BASE=http://localhost:8000
VITE_USE_MOCK=true
```

前端只请求 backend；不会直接连接 Agent 服务，也不持有 LLM API Key。

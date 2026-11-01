# frontend（1 号）

**锁定栈**：React 18 + Vite + TypeScript + Ant Design 5 + React Router 6 + Axios + Zustand

- 只请求 `backend`（默认 `http://localhost:8000`）
- 职责：`docs/roles/01-前端.md` · 任务：`docs/五人详细任务计划.md`

## 当前状态

已完成 Issue `#6 [前端][F1] Vite 工程初始化与路由布局`：

- Vite + React 18 + TypeScript 工程
- Ant Design 5 主题与响应式顶栏
- `/` `/chat` `/plan` `/practice` `/materials` `/blackboard` 六个路由
- Axios 实例和统一错误提示
- Zustand 场景状态骨架
- `src/types/api.ts` 后端业务 API + Agent 响应类型初版
- `VITE_API_BASE` / `VITE_USE_MOCK` 环境变量

当前各业务页是明确标注的 F1 占位页。场景、计划冲突、黑板和练习 Mock 主路径属于 F2，不在本 Issue 中伪造为已完成。

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

## 环境变量

复制 `.env.example` 为 `.env`，本地默认值：

```env
VITE_API_BASE=http://localhost:8000
VITE_USE_MOCK=true
```

前端只请求 backend；不会直接连接 Agent 服务，也不持有 LLM API Key。

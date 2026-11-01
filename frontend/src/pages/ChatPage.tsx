import { MessageOutlined } from "@ant-design/icons";

import { PageScaffold } from "../components/PageScaffold";

export function ChatPage() {
  return (
    <PageScaffold
      eyebrow="Chat · 主 Agent 唯一用户接口"
      title="学习对话"
      description="对话页将承接自然语言目标、结构化回复与用户选项，前端只调用 backend 的 AI 网关。"
      icon={<MessageOutlined />}
      nextSteps={[
        "F2 接入主 Agent 对话与 user_options 卡片",
        "F4 展示 conflict、doubt、abstain 与 need_user 状态",
        "保留用户最终裁决权，不静默修改计划",
      ]}
      actionLabel="返回工程总览"
      actionPath="/"
    />
  );
}

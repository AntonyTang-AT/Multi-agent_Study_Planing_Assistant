import { ProjectOutlined } from "@ant-design/icons";

import { PageScaffold } from "../components/PageScaffold";

export function BlackboardPage() {
  return (
    <PageScaffold
      eyebrow="Blackboard · 过程可见"
      title="共享黑板"
      description="黑板将集中展示 conflict、challenge、intervention 与阶段结论，并保留用户的 resolve 记录。"
      icon={<ProjectOutlined />}
      nextSteps={[
        "F2 接入黑板条目列表与本地 resolve 交互",
        "F3 对接 GET /api/blackboard 与 resolve 接口",
        "让审计、质疑与裁决过程可追溯",
      ]}
      actionLabel="返回工程总览"
      actionPath="/"
    />
  );
}

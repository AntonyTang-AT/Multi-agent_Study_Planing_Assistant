import { CalendarOutlined } from "@ant-design/icons";

import { PageScaffold } from "../components/PageScaffold";

export function PlanPage() {
  return (
    <PageScaffold
      eyebrow="Plan · 审计与冲突协商"
      title="学习计划"
      description="计划页将展示任务时间轴、硬约束审计结果，以及延长时间、降低深度、调整目标三类用户裁决项。"
      icon={<CalendarOutlined />}
      nextSteps={[
        "F2 接入场景参数与计划草案 Mock",
        "展示规则审计拦截与黑板 conflict 条目",
        "用户选择后调用 arbitrate 并回显重排结果",
      ]}
      actionLabel="返回工程总览"
      actionPath="/"
    />
  );
}

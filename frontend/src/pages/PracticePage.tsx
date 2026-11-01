import { FormOutlined } from "@ant-design/icons";

import { PageScaffold } from "../components/PageScaffold";

export function PracticePage() {
  return (
    <PageScaffold
      eyebrow="Practice · 作答与校验门禁"
      title="练习中心"
      description="练习页将承载题干、作答、校验轨迹与状态反馈。未通过校验的答案不会作为正确答案展示。"
      icon={<FormOutlined />}
      nextSteps={[
        "F2 接入 passed / abstain 两种 Mock 状态",
        "F3 对接 questions 与 attempts 接口",
        "F4 展示 verify_answer 与 hint_mode 真数据",
      ]}
      actionLabel="返回工程总览"
      actionPath="/"
    />
  );
}

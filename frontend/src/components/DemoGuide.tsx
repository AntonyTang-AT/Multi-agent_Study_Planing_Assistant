import { Drawer, Timeline, Typography } from "antd";

const STEPS = [
  {
    title: "目标与约束",
    desc: "在首页设定期末复习 / 跟课补漏、科目与每日分钟；系统据此生成计划。",
  },
  {
    title: "审计冲突",
    desc: "计划若不可行，不会偷偷改写，而是上黑板并给出 user_options 供你裁决。",
  },
  {
    title: "校验与弃答",
    desc: "练习中心走计算校验；不可靠答案可 abstain，不强行给错答。",
  },
  {
    title: "主动干预",
    desc: "时间跳跃后可触发干预卡片，仍等待用户决定。",
  },
  {
    title: "个人数据隔离",
    desc: "登录后计划 / 黑板 / 轨迹绑定当前账号；管理员可看全站分布。",
  },
];

export function DemoGuide({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      title="项目演示说明"
      placement="right"
      width={420}
      onClose={onClose}
      open={open}
    >
      <Typography.Paragraph>
        知序 = 传统学习站 + 独立多智能体内核。前端只请求 Backend；AI 全部经网关透传并落库。
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        打开 <code>?demo=1</code> 后使用底部 DemoBar，可在 3 分钟内跑通「冲突 → 弃答 → 时间跳跃」。
      </Typography.Paragraph>
      <Timeline
        items={STEPS.map((step) => ({
          children: (
            <>
              <Typography.Text strong>{step.title}</Typography.Text>
              <div>{step.desc}</div>
            </>
          ),
        }))}
      />
    </Drawer>
  );
}

import { Drawer, Timeline, Typography } from "antd";

const STEPS = [
  {
    title: "设定目标",
    desc: "在首页选择期末复习或跟课补漏，填好科目与每日可用时间。",
  },
  {
    title: "查看并调整计划",
    desc: "如果今晚时间不够，系统不会偷偷改任务，而会请你选择怎么调整。",
  },
  {
    title: "练习与订正",
    desc: "做题后留下对错记录；拿不准可以先标记稍后再看。",
  },
  {
    title: "节奏提醒",
    desc: "连续多天没练时，会建议先做短任务恢复节奏。",
  },
  {
    title: "个人学习空间",
    desc: "每位同学的计划、作答和提醒互相隔离；管理员可看整体概况。",
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
      title="如何使用知序"
      placement="right"
      width={420}
      onClose={onClose}
      open={open}
    >
      <Typography.Paragraph>
        知序帮助你把期末目标或跟课进度，拆成每天能执行的安排，并留下练习痕迹。
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        建议先用样例账号体验：林清夏（高数期末）、周予安（大物跟课）、陈可（节奏恢复）。
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

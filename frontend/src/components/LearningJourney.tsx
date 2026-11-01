import {
  AimOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  FormOutlined,
  LineChartOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { NavLink, useSearchParams } from "react-router-dom";

import { useLearningStore } from "../stores/useLearningStore";

export function LearningJourney() {
  const [searchParams] = useSearchParams();
  const plan = useLearningStore((state) => state.plan);
  const planStatus = useLearningStore((state) => state.planStatus);
  const attempts = useLearningStore((state) => state.attempts);
  const blackboard = useLearningStore((state) => state.blackboard);
  const openEntries = blackboard.filter((entry) => entry.status === "open");
  const demoSuffix = searchParams.get("demo") === "1" ? "?demo=1" : "";

  const steps = [
    {
      to: "/",
      label: "场景",
      hint: plan ? "已设定" : "待开始",
      icon: <AimOutlined />,
      done: Boolean(plan),
    },
    {
      to: "/plan",
      label: "计划",
      hint: plan
        ? planStatus === "conflict"
          ? "待裁决"
          : "已生成"
        : "待生成",
      icon: <CalendarOutlined />,
      done: Boolean(plan),
      alert: planStatus === "conflict",
    },
    {
      to: "/practice",
      label: "练习",
      hint: attempts.length ? `${attempts.length} 次作答` : "待练习",
      icon: <FormOutlined />,
      done: attempts.length > 0,
    },
    {
      to: "/trace",
      label: "轨迹",
      hint: attempts.length ? "同步更新" : "随作答生成",
      icon: <LineChartOutlined />,
      done: attempts.length > 0,
    },
    {
      to: "/blackboard",
      label: "黑板",
      hint: openEntries.length ? `${openEntries.length} 待处理` : "已清空",
      icon: <ProjectOutlined />,
      done: openEntries.length === 0,
      alert: openEntries.length > 0,
    },
  ];

  return (
    <nav className="journey-bar" aria-label="学习任务闭环">
      <span className="journey-bar__label">
        <span className="journey-bar__pulse" />
        学习闭环
      </span>
      <div className="journey-bar__steps">
        {steps.map((step, index) => (
          <div className="journey-bar__step-wrap" key={step.to}>
            <NavLink
              className={({ isActive }) =>
                [
                  "journey-step",
                  isActive ? "is-active" : "",
                  step.done ? "is-done" : "",
                  step.alert ? "is-alert" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              end={step.to === "/"}
              to={`${step.to}${demoSuffix}`}
            >
              <span className="journey-step__icon">{step.icon}</span>
              <span className="journey-step__copy">
                <strong>{step.label}</strong>
                <small>{step.hint}</small>
              </span>
            </NavLink>
            {index < steps.length - 1 ? (
              <ArrowRightOutlined className="journey-bar__arrow" />
            ) : null}
          </div>
        ))}
      </div>
      <span className="journey-bar__summary">
        {openEntries.length
          ? "所有决定都由你确认"
          : "当前没有待裁决事项"}
      </span>
    </nav>
  );
}

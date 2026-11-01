import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  FormOutlined,
  LineChartOutlined,
  MessageOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Progress, Statistic, Tag } from "antd";
import { Link } from "react-router-dom";

import { BlackboardPanel } from "../components/BlackboardPanel";
import { ScenarioWizard } from "../components/ScenarioWizard";
import { useLearningStore } from "../stores/useLearningStore";

const modules = [
  {
    to: "/chat",
    title: "学习对话",
    description: "承接目标、约束与结构化 user_options",
    icon: <MessageOutlined />,
    tone: "green",
  },
  {
    to: "/plan",
    title: "学习计划",
    description: "展示计划审计、冲突与用户裁决",
    icon: <CalendarOutlined />,
    tone: "orange",
  },
  {
    to: "/practice",
    title: "练习中心",
    description: "承载作答、校验通过、提示与弃答",
    icon: <FormOutlined />,
    tone: "blue",
  },
  {
    to: "/materials",
    title: "学习资料",
    description: "按学科、章节与场景标签浏览",
    icon: <BookOutlined />,
    tone: "amber",
  },
  {
    to: "/trace",
    title: "学习轨迹",
    description: "查看作答、掌握度与错因信号",
    icon: <LineChartOutlined />,
    tone: "green",
  },
  {
    to: "/blackboard",
    title: "共享黑板",
    description: "让质疑、冲突和干预过程可见",
    icon: <ProjectOutlined />,
    tone: "red",
  },
] as const;

export function HomePage() {
  const plan = useLearningStore((state) => state.plan);
  const blackboard = useLearningStore((state) => state.blackboard);
  const attempts = useLearningStore((state) => state.attempts);
  const showIntervention = useLearningStore(
    (state) => state.showIntervention,
  );
  const openEntries = blackboard.filter((entry) => entry.status === "open");
  const taskCount = plan?.tasks.length ?? 0;
  const progress = attempts.length
    ? Math.min(100, 24 + attempts.length * 8)
    : plan
      ? 18
      : 0;

  return (
    <div className="home-page">
      <section className="home-hero home-hero--workflow">
        <div className="home-hero__copy">
          <p className="eyebrow">Learning Assistant · 期末复习 / 跟课补漏</p>
          <h1>
            把学习目标，
            <br />
            变成<em>可审计</em>的计划。
          </h1>
          <p>
            系统先生成，再审计、校验与质疑；冲突不会在后台被悄悄改掉，而是在黑板留下证据并由你裁决。
          </p>
          <div className="hero-capabilities">
            <span>
              <SafetyCertificateOutlined /> 计划审计
            </span>
            <span>
              <ProjectOutlined /> 共享黑板
            </span>
            <span>
              <LineChartOutlined /> 轨迹驱动
            </span>
          </div>
        </div>
        <ScenarioWizard />
      </section>

      {showIntervention ? (
        <Alert
          className="intervention-alert"
          type="warning"
          showIcon
          message="主动干预卡片已生成"
          description="系统在模拟巡检中发现连续中断信号，建议先用低门槛任务恢复节奏，决定权仍在你。"
          action={
            <Link to="/blackboard">
              <Button size="small">去黑板裁决</Button>
            </Link>
          }
        />
      ) : null}

      <section className="dashboard-strip">
        <Card className="dashboard-metric">
          <Statistic title="计划任务" value={taskCount} suffix="项" />
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor="#2f8667"
            size="small"
          />
          <span className="metric-caption">
            {plan ? "计划已进入当前学习空间" : "完成场景设置后生成"}
          </span>
        </Card>
        <Card className="dashboard-metric">
          <Statistic
            title="待裁决黑板条目"
            value={openEntries.length}
            suffix="条"
          />
          <div className="metric-tags">
            <Tag color="orange">conflict</Tag>
            <Tag color="red">challenge</Tag>
            <Tag color="gold">intervention</Tag>
          </div>
          <span className="metric-caption">所有处理动作均保留证据引用</span>
        </Card>
        <Card className="dashboard-metric">
          <Statistic
            title="已记录作答"
            value={attempts.length}
            suffix="次"
          />
          <div className="metric-tags">
            <Tag color="green">passed</Tag>
            <Tag color="gold">abstain</Tag>
          </div>
          <span className="metric-caption">作答与校验结果同步到轨迹</span>
        </Card>
      </section>

      <section className="home-split">
        <section className="module-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Application Modules</p>
              <h2>学习工作台</h2>
            </div>
            <span>顶部导航或卡片均可进入</span>
          </div>
          <div className="module-grid">
            {modules.map((module) => (
              <Link className="module-link" to={module.to} key={module.to}>
                <Card className="module-card" bordered>
                  <span
                    className={`module-card__icon module-card__icon--${module.tone}`}
                  >
                    {module.icon}
                  </span>
                  <span className="module-card__phase">已接入</span>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <span className="module-card__action">
                    进入模块
                    <ArrowRightOutlined />
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <aside className="home-side-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Shared Blackboard</p>
              <h2>待裁决事项</h2>
            </div>
            <Link to="/blackboard">全部</Link>
          </div>
          <BlackboardPanel compact limit={3} />
        </aside>
      </section>
    </div>
  );
}

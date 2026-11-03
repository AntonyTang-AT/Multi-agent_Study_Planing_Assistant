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
import { Alert, Button, Card, Progress, Spin, Statistic, Tag } from "antd";
import { Link } from "react-router-dom";

import { BlackboardPanel } from "../components/BlackboardPanel";
import { ScenarioWizard } from "../components/ScenarioWizard";
import { useAuthStore } from "../stores/useAuthStore";
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

const scenarioLabel: Record<string, string> = {
  final_review: "期末复习",
  catch_up: "跟课补漏",
};

const subjectLabel: Record<string, string> = {
  math: "高等数学",
  physics: "大学物理",
};

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const plan = useLearningStore((state) => state.plan);
  const planStatus = useLearningStore((state) => state.planStatus);
  const planMessage = useLearningStore((state) => state.planMessage);
  const setup = useLearningStore((state) => state.setup);
  const blackboard = useLearningStore((state) => state.blackboard);
  const attempts = useLearningStore((state) => state.attempts);
  const hydrating = useLearningStore((state) => state.hydrating);
  const showIntervention = useLearningStore(
    (state) => state.showIntervention,
  );
  const openEntries = blackboard.filter((entry) => entry.status === "open");
  const taskCount = plan?.tasks.length ?? 0;
  const passed = attempts.filter((item) => item.is_correct === true).length;
  const progress = attempts.length
    ? Math.min(100, Math.round((passed / Math.max(attempts.length, 1)) * 100))
    : plan
      ? 18
      : 0;
  const hasPersonalData = Boolean(plan || attempts.length || blackboard.length);

  if (hydrating && !hasPersonalData) {
    return (
      <div className="home-page" style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在加载 {user?.display_name || "当前账号"} 的学习空间…</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {hasPersonalData ? (
        <section className="home-hero home-hero--workflow">
          <div className="home-hero__copy">
            <p className="eyebrow">
              {user?.display_name || "学习者"} ·{" "}
              {scenarioLabel[setup.mode] || setup.mode} ·{" "}
              {subjectLabel[setup.subject] || setup.subject}
            </p>
            <h1>
              {planStatus === "conflict"
                ? "计划冲突待你裁决"
                : showIntervention
                  ? "节奏中断，建议先恢复"
                  : "继续你的个性化学习空间"}
            </h1>
            <p>
              {planMessage ||
                plan?.goal ||
                "当前账号已绑定个人计划、作答痕迹与黑板证据。"}
            </p>
            <div className="hero-capabilities">
              <span>
                <SafetyCertificateOutlined />{" "}
                {planStatus === "conflict" ? "冲突审计中" : "计划已落库"}
              </span>
              <span>
                <ProjectOutlined /> 开放黑板 {openEntries.length}
              </span>
              <span>
                <LineChartOutlined /> 作答 {attempts.length} 次
              </span>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/plan">
                <Button type="primary" icon={<CalendarOutlined />}>
                  进入学习计划
                </Button>
              </Link>
              <Link to="/trace">
                <Button icon={<LineChartOutlined />}>查看轨迹</Button>
              </Link>
              <Link to="/blackboard">
                <Button icon={<ProjectOutlined />}>打开黑板</Button>
              </Link>
            </div>
          </div>
          <Card className="scenario-card" style={{ minWidth: 280 }}>
            <p className="scenario-card__eyebrow">ACCOUNT SNAPSHOT</p>
            <h2 style={{ marginTop: 4 }}>{plan?.goal || "暂无目标"}</h2>
            <p style={{ color: "#69736e" }}>
              每日预算 {plan?.daily_minutes_budget ?? setup.dailyMinutes} 分钟 · 剩余{" "}
              {plan?.days_left ?? "—"} 天 · {taskCount} 项任务
            </p>
            <div className="metric-tags" style={{ marginTop: 12 }}>
              <Tag color={planStatus === "conflict" ? "orange" : "green"}>
                {planStatus === "conflict" ? "待裁决" : "审计通过"}
              </Tag>
              <Tag>{setup.chapter}</Tag>
            </div>
            {plan?.tasks?.slice(0, 3).map((task) => (
              <div
                key={`${task.day}-${task.object}`}
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid #e8e9e2",
                  fontSize: 13,
                }}
              >
                <strong>Day {task.day}</strong> · {task.action} {task.object} ·{" "}
                {task.minutes} 分钟
              </div>
            ))}
          </Card>
        </section>
      ) : (
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
      )}

      {showIntervention ? (
        <Alert
          className="intervention-alert"
          type="warning"
          showIcon
          message="主动干预卡片已生成"
          description="系统在巡检中发现连续中断信号，建议先用低门槛任务恢复节奏，决定权仍在你。"
          action={
            <Link to="/blackboard">
              <Button size="small">去黑板裁决</Button>
            </Link>
          }
        />
      ) : null}

      {planStatus === "conflict" ? (
        <Alert
          className="intervention-alert"
          type="error"
          showIcon
          message="当前计划存在硬约束冲突"
          description="第 3 天任务超出每日时间预算。请到计划页选择延长时间、降低深度或调整目标。"
          action={
            <Link to="/plan">
              <Button size="small" type="primary">
                去裁决
              </Button>
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
            {plan ? `正确率约 ${progress}%（基于已记录作答）` : "完成场景设置后生成"}
          </span>
        </Card>
        <Card className="dashboard-metric">
          <Statistic
            title="待裁决黑板条目"
            value={openEntries.length}
            suffix="条"
          />
          <div className="metric-tags">
            {openEntries.slice(0, 3).map((entry) => (
              <Tag
                key={entry.entry_id}
                color={
                  entry.type === "conflict"
                    ? "orange"
                    : entry.type === "challenge"
                      ? "red"
                      : "gold"
                }
              >
                {entry.type}
              </Tag>
            ))}
            {!openEntries.length ? <Tag>暂无开放项</Tag> : null}
          </div>
          <span className="metric-caption">
            {openEntries[0]?.summary || "所有处理动作均保留证据引用"}
          </span>
        </Card>
        <Card className="dashboard-metric">
          <Statistic
            title="已记录作答"
            value={attempts.length}
            suffix="次"
          />
          <div className="metric-tags">
            <Tag color="green">通过 {passed}</Tag>
            <Tag color="gold">
              其它 {attempts.length - passed}
            </Tag>
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

      {hasPersonalData ? (
        <section style={{ marginTop: 24 }}>
          <Card title="还可以重新设定场景">
            <ScenarioWizard />
          </Card>
        </section>
      ) : null}
    </div>
  );
}

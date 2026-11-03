import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  FormOutlined,
  LineChartOutlined,
  MessageOutlined,
  ProjectOutlined,
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
    description: "问学习安排、卡点和下一步建议",
    icon: <MessageOutlined />,
    tone: "green",
  },
  {
    to: "/plan",
    title: "学习计划",
    description: "查看每日任务，调整时间安排",
    icon: <CalendarOutlined />,
    tone: "orange",
  },
  {
    to: "/practice",
    title: "练习中心",
    description: "做题、订正，留下作答记录",
    icon: <FormOutlined />,
    tone: "blue",
  },
  {
    to: "/materials",
    title: "学习资料",
    description: "按章节浏览教材与课件",
    icon: <BookOutlined />,
    tone: "amber",
  },
  {
    to: "/trace",
    title: "学习轨迹",
    description: "正确率、错因与近期进度",
    icon: <LineChartOutlined />,
    tone: "green",
  },
  {
    to: "/blackboard",
    title: "待办提醒",
    description: "需要你确认的冲突、质疑与提醒",
    icon: <ProjectOutlined />,
    tone: "red",
  },
] as const;

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const plan = useLearningStore((state) => state.plan);
  const planStatus = useLearningStore((state) => state.planStatus);
  const planMessage = useLearningStore((state) => state.planMessage);
  const setup = useLearningStore((state) => state.setup);
  const blackboard = useLearningStore((state) => state.blackboard);
  const attempts = useLearningStore((state) => state.attempts);
  const hydrating = useLearningStore((state) => state.hydrating);
  const persona = useLearningStore((state) => state.persona);
  const showIntervention = useLearningStore(
    (state) => state.showIntervention,
  );
  const openEntries = blackboard.filter((entry) => entry.status === "open");
  const taskCount = plan?.tasks.length ?? 0;
  const doneTasks =
    plan?.tasks.filter((task) => (task as { status?: string }).status === "done")
      .length ?? 0;
  const passed = attempts.filter((item) => item.is_correct === true).length;
  const progress = attempts.length
    ? Math.min(100, Math.round((passed / Math.max(attempts.length, 1)) * 100))
    : plan
      ? Math.round((doneTasks / Math.max(taskCount, 1)) * 100)
      : 0;
  const hasPersonalData = Boolean(plan || attempts.length || blackboard.length);
  const displayName = persona?.real_name || user?.display_name || "同学";

  if (hydrating && !hasPersonalData) {
    return (
      <div className="home-page" style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>正在打开 {displayName} 的学习空间…</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {hasPersonalData ? (
        <section className="home-hero home-hero--workflow">
          <div className="home-hero__copy">
            <p className="eyebrow">
              {persona?.course || "学习空间"} · {persona?.semester || setup.chapter}
            </p>
            <h1>
              {planStatus === "conflict"
                ? `${displayName}，今晚时间可能不够用`
                : showIntervention
                  ? `${displayName}，先从短任务恢复节奏`
                  : `${displayName}，继续今天的学习`}
            </h1>
            <p>
              {planMessage ||
                persona?.focus ||
                plan?.goal ||
                "这里保存着你的计划、作答和待处理事项。"}
            </p>
            <div className="hero-capabilities">
              <span>{persona?.major || "在读学生"}</span>
              <span>每日 {plan?.daily_minutes_budget ?? setup.dailyMinutes} 分钟</span>
              <span>剩余 {plan?.days_left ?? "—"} 天</span>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to={persona?.next_path || "/plan"}>
                <Button type="primary">
                  {persona?.next_action || "查看学习计划"}
                </Button>
              </Link>
              <Link to="/practice">
                <Button>去做题</Button>
              </Link>
              <Link to="/trace">
                <Button>看学习轨迹</Button>
              </Link>
            </div>
          </div>
          <Card className="scenario-card" style={{ minWidth: 280 }}>
            <p className="scenario-card__eyebrow">今日概况</p>
            <h2 style={{ marginTop: 4 }}>{plan?.goal || "暂无目标"}</h2>
            <p style={{ color: "#69736e" }}>
              已完成 {doneTasks}/{taskCount} 项 · 近期正确率约 {progress}%
            </p>
            {persona?.weak_points?.length ? (
              <div style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 13 }}>近期薄弱点</strong>
                <div className="metric-tags" style={{ marginTop: 8 }}>
                  {persona.weak_points.slice(0, 3).map((item) => (
                    <Tag key={item} color="orange">
                      {item}
                    </Tag>
                  ))}
                </div>
              </div>
            ) : null}
            {persona?.recent_days?.slice(0, 3).map((item) => (
              <div
                key={`${item.when}-${item.text}`}
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid #e8e9e2",
                  fontSize: 13,
                }}
              >
                <strong>{item.when}</strong>
                <div style={{ color: "#69736e" }}>{item.text}</div>
              </div>
            ))}
          </Card>
        </section>
      ) : (
        <section className="home-hero home-hero--workflow">
          <div className="home-hero__copy">
            <p className="eyebrow">知序学习助手</p>
            <h1>
              把期末目标，
              <br />
              变成<em>每天能执行</em>的安排。
            </h1>
            <p>
              先设定期限与每日可用时间，再生成学习计划。遇到时间冲突或练习卡点时，会明确告诉你，并由你决定怎么改。
            </p>
          </div>
          <ScenarioWizard />
        </section>
      )}

      {showIntervention ? (
        <Alert
          className="intervention-alert"
          type="warning"
          showIcon
          message="学习节奏有中断"
          description="最近两天没有练习记录。今天的任务已经缩短，建议先完成热身再决定是否加练。"
          action={
            <Link to="/blackboard">
              <Button size="small">查看提醒</Button>
            </Link>
          }
        />
      ) : null}

      {planStatus === "conflict" ? (
        <Alert
          className="intervention-alert"
          type="error"
          showIcon
          message="今晚安排可能超时"
          description="当前任务所需时间超过你设定的每日上限。请到计划页选择：多挤时间、降低深度，或把难点挪走。"
          action={
            <Link to="/plan">
              <Button size="small" type="primary">
                去调整
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
            {persona?.materials_focus ||
              (plan ? `已完成 ${doneTasks} 项` : "设定场景后生成计划")}
          </span>
        </Card>
        <Card className="dashboard-metric">
          <Statistic title="待处理事项" value={openEntries.length} suffix="条" />
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
                {entry.type === "conflict"
                  ? "时间冲突"
                  : entry.type === "challenge"
                    ? "题目质疑"
                    : entry.type === "intervention"
                      ? "节奏提醒"
                      : entry.type}
              </Tag>
            ))}
            {!openEntries.length ? <Tag>暂无</Tag> : null}
          </div>
          <span className="metric-caption">
            {openEntries[0]?.summary || "没有需要你确认的事项"}
          </span>
        </Card>
        <Card className="dashboard-metric">
          <Statistic title="近期作答" value={attempts.length} suffix="次" />
          <div className="metric-tags">
            <Tag color="green">做对 {passed}</Tag>
            <Tag color="gold">其他 {attempts.length - passed}</Tag>
          </div>
          <span className="metric-caption">作答会同步到学习轨迹</span>
        </Card>
      </section>

      <section className="home-split">
        <section className="module-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">学习工作台</p>
              <h2>从这里继续</h2>
            </div>
            <span>计划、练习、轨迹与提醒互相联动</span>
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
                  <span className="module-card__phase">可进入</span>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <span className="module-card__action">
                    打开
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
              <p className="eyebrow">待确认</p>
              <h2>需要你处理</h2>
            </div>
            <Link to="/blackboard">全部</Link>
          </div>
          <BlackboardPanel compact limit={3} />
        </aside>
      </section>

      {hasPersonalData ? (
        <section style={{ marginTop: 24 }}>
          <Card title="重新设定学习场景">
            <ScenarioWizard />
          </Card>
        </section>
      ) : null}
    </div>
  );
}

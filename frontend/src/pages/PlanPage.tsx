import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FormOutlined,
  ProjectOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Statistic,
  Tag,
  message,
} from "antd";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { agentErrorMessage, invokeAgent } from "../api/ai";
import {
  fetchCurrentPlan,
  saveCurrentPlan,
} from "../api/backend";
import { BlackboardPanel } from "../components/BlackboardPanel";
import { NextStepCard } from "../components/NextStepCard";
import { UserOptionsCard } from "../components/UserOptionsCard";
import { chapterIdFromKnowledge } from "../data/chapters";
import { useLearningStore } from "../stores/useLearningStore";
import type { Plan, PlanTask } from "../types/api";

const groupTasks = (tasks: PlanTask[]) => {
  const groups = new Map<number, PlanTask[]>();
  tasks.forEach((task) => {
    groups.set(task.day, [...(groups.get(task.day) ?? []), task]);
  });
  return Array.from(groups.entries()).sort(([left], [right]) => left - right);
};

const loadLabel: Record<string, string> = {
  low: "低负荷",
  medium: "中负荷",
  high: "高负荷",
};

export function PlanPage() {
  const navigate = useNavigate();
  const setup = useLearningStore((state) => state.setup);
  const plan = useLearningStore((state) => state.plan);
  const planStatus = useLearningStore((state) => state.planStatus);
  const planMessage = useLearningStore((state) => state.planMessage);
  const options = useLearningStore((state) => state.userOptions);
  const selectedOptionId = useLearningStore(
    (state) => state.selectedOptionId,
  );
  const loading = useLearningStore((state) => state.loading);
  const hydrating = useLearningStore((state) => state.hydrating);
  const error = useLearningStore((state) => state.error);
  const demo = useLearningStore((state) => state.demo);
  const setSelectedOption = useLearningStore(
    (state) => state.setSelectedOption,
  );
  const applyPlanResponse = useLearningStore(
    (state) => state.applyPlanResponse,
  );
  const setStoredPlan = useLearningStore((state) => state.setStoredPlan);
  const setLoading = useLearningStore((state) => state.setLoading);
  const setError = useLearningStore((state) => state.setError);

  useEffect(() => {
    if (plan || hydrating) return;
    let active = true;
    fetchCurrentPlan()
      .then((storedPlan) => {
        if (!active || !storedPlan) return;
        const { _demo: _ignored, ...clean } = storedPlan as Plan & {
          _demo?: unknown;
        };
        void _ignored;
        setStoredPlan(clean);
      })
      .catch((requestError) => {
        if (active) setError(agentErrorMessage(requestError));
      });
    return () => {
      active = false;
    };
  }, [plan, hydrating, setError, setStoredPlan]);

  if (hydrating && !plan) {
    return (
      <div className="page-stack">
        <section className="placeholder-panel">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="正在读取当前账号的学习计划…"
          />
        </section>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="page-stack">
        <section className="page-intro">
          <div>
            <p className="eyebrow">学习计划</p>
            <h1>还没有学习计划</h1>
            <p className="page-intro__description">
              先在首页设定期限、每日可用时间和学科，再生成适合你的安排。
            </p>
          </div>
        </section>
        <section className="placeholder-panel">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前账号还没有计划"
          />
          <Button type="primary" onClick={() => navigate("/")}>
            去设定学习场景
          </Button>
        </section>
      </div>
    );
  }

  const groups = groupTasks(plan.tasks);
  const totalMinutes = plan.tasks.reduce(
    (sum, task) => sum + task.minutes,
    0,
  );
  const conflictOpen = planStatus === "conflict";

  const arbitrate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invokeAgent("arbitrate", {
        scenario: setup.mode,
        input: {
          option_id: selectedOptionId,
          plan,
        },
        demo,
      });
      applyPlanResponse(response);
      if (response.output.plan) {
        await saveCurrentPlan(response.output.plan);
      }
      message.success("已按你的选择更新今晚安排");
    } catch (requestError) {
      setError(agentErrorMessage(requestError));
      message.error(agentErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">学习计划</p>
          <h1>{plan.goal || "我的学习安排"}</h1>
          <p className="page-intro__description">
            {planMessage || "按天拆好的任务列表。时间不够用时，会请你选择怎么改。"}
          </p>
        </div>
        <div className="page-intro__actions">
          <Tag color={conflictOpen ? "orange" : "green"}>
            {conflictOpen ? "今晚需调整" : "安排可行"}
          </Tag>
          <Link
            to={`/materials?subject=${setup.subject}${
              plan.tasks[0]?.knowledge_ids?.[0]
                ? `&chapter=${encodeURIComponent(
                    chapterIdFromKnowledge(plan.tasks[0].knowledge_ids[0]),
                  )}`
                : ""
            }`}
          >
            <Button icon={<BookOutlined />}>章节资料</Button>
          </Link>
          <Link to="/blackboard">
            <Button icon={<ProjectOutlined />}>待办提醒</Button>
          </Link>
        </div>
      </section>

      {error ? (
        <Alert
          type="error"
          showIcon
          closable
          message="计划服务暂不可用"
          description={error}
          onClose={() => setError(null)}
        />
      ) : null}

      <UserOptionsCard
        options={options}
        selectedId={selectedOptionId}
        status={planStatus}
        message={planMessage}
        loading={loading}
        subject={setup.subject}
        onChange={setSelectedOption}
        onSubmit={arbitrate}
      />

      <Row gutter={[14, 14]}>
        <Col xs={24} md={8}>
          <Card className="plan-stat-card">
            <Statistic
              title="每日预算"
              value={plan.daily_minutes_budget}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="plan-stat-card">
            <Statistic
              title="计划任务"
              value={plan.tasks.length}
              suffix="项"
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="plan-stat-card">
            <Statistic
              title="总任务时长"
              value={totalMinutes}
              suffix="分钟"
              prefix={<ReloadOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <section className="plan-layout">
        <div className="plan-timeline">
          {groups.map(([day, tasks]) => (
            <section className="plan-day" key={day}>
              <div className="plan-day__marker">
                <span>DAY</span>
                <strong>{String(day).padStart(2, "0")}</strong>
              </div>
              <div className="plan-day__tasks">
                {tasks.map((task) => {
                  const title =
                    task.object ||
                    (task as PlanTask & { title?: string }).title ||
                    "未命名任务";
                  const knowledgeIds = task.knowledge_ids ?? [];
                  return (
                  <Card
                    className="plan-task-card"
                    key={`${task.day}-${title}-${task.minutes}`}
                  >
                    <div className="plan-task-card__head">
                      <div>
                        <Tag color="green">{task.action || "任务"}</Tag>
                        <h3>{title}</h3>
                      </div>
                      <span>{task.minutes} 分钟</span>
                    </div>
                    <p>{task.completion_criteria || "按计划完成当日学习目标"}</p>
                    <div className="plan-task-card__meta">
                      <Tag bordered={false}>
                        {loadLabel[task.load] || task.load || "中负荷"}
                      </Tag>
                      {knowledgeIds.map((knowledgeId) => (
                        <span key={knowledgeId}>{knowledgeId}</span>
                      ))}
                    </div>
                    {knowledgeIds[0] ? (
                      <div className="plan-task-card__links">
                        <Link
                          to={`/materials?subject=${task.subject || setup.subject}&chapter=${encodeURIComponent(
                            chapterIdFromKnowledge(knowledgeIds[0]),
                          )}`}
                        >
                          <Button size="small" type="link">
                            对照资料
                          </Button>
                        </Link>
                        <Link
                          to={`/practice?knowledge=${encodeURIComponent(knowledgeIds[0])}`}
                        >
                          <Button size="small" type="link">
                            练相关题
                          </Button>
                        </Link>
                      </div>
                    ) : null}
                  </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <aside className="plan-side">
          <Card
            className="plan-status-card"
            title="安排进度"
            extra={<CheckCircleOutlined />}
          >
            <div className="agent-state-row is-done">
              <span>1</span>
              <div>
                <strong>生成每日任务</strong>
                <small>已按目标与可用时间排出</small>
              </div>
            </div>
            <div className="agent-state-row is-done">
              <span>2</span>
              <div>
                <strong>检查是否超时</strong>
                <small>{conflictOpen ? "发现今晚时间不够" : "每日时间足够"}</small>
              </div>
            </div>
            <div className={`agent-state-row ${conflictOpen ? "is-active" : "is-done"}`}>
              <span>3</span>
              <div>
                <strong>由你确认调整</strong>
                <small>{conflictOpen ? "等待你的选择" : "你已确认当前安排"}</small>
              </div>
            </div>
            <div className={`agent-state-row ${conflictOpen ? "" : "is-done"}`}>
              <span>4</span>
              <div>
                <strong>按选择重排</strong>
                <small>{conflictOpen ? "确认后更新任务" : "已按你的选择更新"}</small>
              </div>
            </div>
          </Card>

          <section className="mini-board-section">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">相关提醒</p>
                <h2>待你处理</h2>
              </div>
            </div>
            <BlackboardPanel compact limit={2} />
          </section>
        </aside>
      </section>

      <NextStepCard
        eyebrow="下一步"
        title="用一道题检验今晚安排是否合适"
        description="练习结果会记入轨迹，也能帮助判断哪些任务负荷偏高。"
        label="进入练习"
        to="/practice"
        icon={<FormOutlined />}
      />
    </div>
  );
}

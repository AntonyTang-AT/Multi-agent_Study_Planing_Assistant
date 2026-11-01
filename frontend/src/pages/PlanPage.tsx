import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
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
import { UserOptionsCard } from "../components/UserOptionsCard";
import { useLearningStore } from "../stores/useLearningStore";
import type { PlanTask } from "../types/api";

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
    if (plan) return;
    let active = true;
    fetchCurrentPlan()
      .then((storedPlan) => {
        if (active && storedPlan) setStoredPlan(storedPlan);
      })
      .catch((requestError) => {
        if (active) setError(agentErrorMessage(requestError));
      });
    return () => {
      active = false;
    };
  }, [plan, setError, setStoredPlan]);

  if (!plan) {
    return (
      <div className="page-stack">
        <section className="page-intro">
          <div>
            <p className="eyebrow">Plan · 审计与冲突协商</p>
            <h1>学习计划</h1>
            <p className="page-intro__description">
              先在首页设定考试日期或当前章节、每日时长与学科，再生成计划。
            </p>
          </div>
          <Tag className="scope-tag">GET /api/plans/current</Tag>
        </section>
        <section className="placeholder-panel">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前没有已保存计划"
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
      message.success("裁决已提交，二次审计通过");
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
          <p className="eyebrow">Plan · 审计与冲突协商</p>
          <h1>学习计划</h1>
          <p className="page-intro__description">
            {planMessage || "任务来自 Agent 输出，保存前经过规则审计与用户确认。"}
          </p>
        </div>
        <div className="page-intro__actions">
          <Tag color={conflictOpen ? "orange" : "green"}>
            {conflictOpen ? "等待裁决" : "已通过审计"}
          </Tag>
          <Link to="/blackboard">
            <Button icon={<ProjectOutlined />}>打开黑板</Button>
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
                {tasks.map((task) => (
                  <Card
                    className="plan-task-card"
                    key={`${task.day}-${task.object}-${task.minutes}`}
                  >
                    <div className="plan-task-card__head">
                      <div>
                        <Tag color="green">{task.action}</Tag>
                        <h3>{task.object}</h3>
                      </div>
                      <span>{task.minutes} 分钟</span>
                    </div>
                    <p>{task.completion_criteria}</p>
                    <div className="plan-task-card__meta">
                      <Tag bordered={false}>{loadLabel[task.load] || task.load}</Tag>
                      {task.knowledge_ids.map((knowledgeId) => (
                        <span key={knowledgeId}>{knowledgeId}</span>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="plan-side">
          <Card
            className="plan-status-card"
            title="协作状态"
            extra={<CheckCircleOutlined />}
          >
            <div className="agent-state-row is-done">
              <span>1</span>
              <div>
                <strong>计划 Agent</strong>
                <small>已生成 Plan v1</small>
              </div>
            </div>
            <div className="agent-state-row is-done">
              <span>2</span>
              <div>
                <strong>规则审计</strong>
                <small>{conflictOpen ? "发现硬约束冲突" : "预算与依赖通过"}</small>
              </div>
            </div>
            <div className={`agent-state-row ${conflictOpen ? "is-active" : "is-done"}`}>
              <span>3</span>
              <div>
                <strong>用户裁决</strong>
                <small>{conflictOpen ? "等待你的选择" : "用户已确认"}</small>
              </div>
            </div>
            <div className={`agent-state-row ${conflictOpen ? "" : "is-done"}`}>
              <span>4</span>
              <div>
                <strong>二次审计</strong>
                <small>{conflictOpen ? "裁决后执行" : "重排结果通过"}</small>
              </div>
            </div>
          </Card>

          <section className="mini-board-section">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Evidence</p>
                <h2>黑板摘要</h2>
              </div>
            </div>
            <BlackboardPanel compact limit={2} />
          </section>
        </aside>
      </section>
    </div>
  );
}

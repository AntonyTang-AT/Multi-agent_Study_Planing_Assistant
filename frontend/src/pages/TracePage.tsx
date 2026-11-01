import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Statistic,
  Tag,
  Timeline,
} from "antd";
import { Link } from "react-router-dom";

import { useLearningStore } from "../stores/useLearningStore";

const mastery = [
  { label: "极限定义", value: 86, color: "#2f8667" },
  { label: "夹逼定理", value: 57, color: "#df6841" },
  { label: "数列极限", value: 71, color: "#47758e" },
  { label: "连续性", value: 78, color: "#2f8667" },
];

export function TracePage() {
  const attempts = useLearningStore((state) => state.attempts);
  const blackboard = useLearningStore((state) => state.blackboard);
  const passedCount = attempts.filter((attempt) => attempt.is_correct).length;
  const abstainCount = attempts.filter(
    (attempt) => attempt.is_correct === false,
  ).length;

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">Learning Trace · 作答与错因信号</p>
          <h1>学习轨迹</h1>
          <p className="page-intro__description">
            作答、提示、弃答与修正行为会写入记忆 Agent；评估 Agent 读取这些信号，再发起元认知反馈。
          </p>
        </div>
        <Tag className="scope-tag" icon={<LineChartOutlined />}>
          attempts + blackboard
        </Tag>
      </section>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="已记录作答"
              value={attempts.length}
              suffix="次"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="校验通过"
              value={passedCount}
              suffix="次"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="提示 / 弃答"
              value={abstainCount}
              suffix="次"
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <section className="trace-layout">
        <Card className="mastery-panel" title="掌握度估计">
          <div className="mastery-bars">
            {mastery.map((item) => (
              <div className="mastery-row" key={item.label}>
                <div className="mastery-row__head">
                  <span>{item.label}</span>
                  <strong>{item.value}%</strong>
                </div>
                <Progress
                  percent={item.value}
                  showInfo={false}
                  strokeColor={item.color}
                  size="small"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="error-pattern-card" title="高频错因">
          <div className="error-pattern-list">
            <div>
              <span>放缩方向判断</span>
              <Tag color="orange">4 次</Tag>
            </div>
            <div>
              <span>加减结构直接等价替换</span>
              <Tag color="red">3 次</Tag>
            </div>
            <div>
              <span>忽略边界条件</span>
              <Tag color="gold">2 次</Tag>
            </div>
          </div>
        </Card>
      </section>

      <Card
        title="最近作答"
        extra={<Link to="/practice">继续练习</Link>}
      >
        {attempts.length ? (
          <Timeline
            items={attempts.map((attempt) => ({
              color: attempt.is_correct ? "green" : "orange",
              children: (
                <div className="attempt-row">
                  <div>
                    <strong>{attempt.question_id}</strong>
                    <span>
                      答案：{attempt.answer} · 用时{" "}
                      {attempt.duration_ms
                        ? `${Math.round(attempt.duration_ms / 1000)} 秒`
                        : "未记录"}
                    </span>
                  </div>
                  <Tag color={attempt.is_correct ? "green" : "gold"}>
                    {attempt.is_correct ? "passed" : "hint / abstain"}
                  </Tag>
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="还没有作答记录，去练习中心完成一题" />
        )}
      </Card>

      <Card className="trace-note-card">
        <div>
          <p className="eyebrow">Metacognitive Feedback</p>
          <h2>系统不直接替你改计划。</h2>
          <p>
            当同类错误连续出现或提示依赖升高时，系统会提供结构化选项；用户选择后才影响下一轮计划。
          </p>
        </div>
        <Tag color="green">{blackboard.length} 条黑板事件可供追溯</Tag>
      </Card>
    </div>
  );
}

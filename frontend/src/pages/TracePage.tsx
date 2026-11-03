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

import { NextStepCard } from "../components/NextStepCard";
import { useAuthStore } from "../stores/useAuthStore";
import { useLearningStore } from "../stores/useLearningStore";

function buildMastery(attempts: Array<{ question_id: string; is_correct?: boolean | null }>) {
  const buckets = new Map<string, { total: number; ok: number }>();
  attempts.forEach((attempt) => {
    const key = attempt.question_id.split("_").slice(0, 2).join("_") || attempt.question_id;
    const row = buckets.get(key) ?? { total: 0, ok: 0 };
    row.total += 1;
    if (attempt.is_correct) row.ok += 1;
    buckets.set(key, row);
  });
  const colors = ["#2f8667", "#df6841", "#47758e", "#d3a13f"];
  return Array.from(buckets.entries())
    .slice(0, 4)
    .map(([label, row], index) => ({
      label,
      value: Math.round((row.ok / Math.max(row.total, 1)) * 100),
      color: colors[index % colors.length],
    }));
}

function buildErrorTags(
  attempts: Array<{ error_tag?: string | null; is_correct?: boolean | null }>,
) {
  const counts = new Map<string, number>();
  attempts.forEach((attempt) => {
    if (!attempt.error_tag) return;
    counts.set(attempt.error_tag, (counts.get(attempt.error_tag) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

export function TracePage() {
  const user = useAuthStore((state) => state.user);
  const attempts = useLearningStore((state) => state.attempts);
  const blackboard = useLearningStore((state) => state.blackboard);
  const setup = useLearningStore((state) => state.setup);
  const passedCount = attempts.filter((attempt) => attempt.is_correct).length;
  const otherCount = attempts.length - passedCount;
  const mastery = buildMastery(attempts);
  const errorTags = buildErrorTags(attempts);

  const verdictLabel = (isCorrect: boolean | null | undefined) => {
    if (isCorrect === true) return { text: "passed", color: "green" };
    if (isCorrect === false) return { text: "failed", color: "red" };
    return { text: "hint / abstain", color: "gold" };
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">Learning Trace · 作答与错因信号</p>
          <h1>{user?.display_name || "学习者"}的学习轨迹</h1>
          <p className="page-intro__description">
            {setup.subject === "physics" ? "大学物理" : "高等数学"} ·{" "}
            {setup.chapter}。作答、提示、弃答与修正行为写入记忆；评估读取这些信号后再发起元认知反馈。
          </p>
        </div>
        <Tag className="scope-tag" icon={<LineChartOutlined />}>
          GET /api/attempts
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
              title="失败 / 弃答"
              value={otherCount}
              suffix="次"
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <section className="trace-layout">
        <Card className="mastery-panel" title="掌握度估计（按本题账号）">
          <div className="mastery-bars">
            {mastery.length ? (
              mastery.map((item) => (
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
              ))
            ) : (
              <Empty description="暂无作答，无法估计掌握度" />
            )}
          </div>
        </Card>

        <Card className="error-pattern-card" title="高频错因">
          <div className="error-pattern-list">
            {errorTags.length ? (
              errorTags.map(([tag, count]) => (
                <div key={tag}>
                  <span>{tag}</span>
                  <Tag color="orange">{count} 次</Tag>
                </div>
              ))
            ) : (
              <Empty description="暂无错因标签" />
            )}
          </div>
        </Card>
      </section>

      <Card title="最近作答" extra={<Link to="/practice">继续练习</Link>}>
        {attempts.length ? (
          <Timeline
            items={attempts.map((attempt) => {
              const verdict = verdictLabel(attempt.is_correct);
              return {
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
                        {attempt.error_tag ? ` · ${attempt.error_tag}` : ""}
                      </span>
                    </div>
                    <Tag color={verdict.color}>{verdict.text}</Tag>
                  </div>
                ),
              };
            })}
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

      <NextStepCard
        eyebrow="NEXT · PLAN"
        title="把轨迹反馈带回计划"
        description="错因、提示依赖与中断信号会参与下一轮计划审计，而不是停留在统计页。"
        label="返回计划"
        to="/plan"
        icon={<LineChartOutlined />}
      />
    </div>
  );
}

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

import { MathText } from "../components/MathText";
import { NextStepCard } from "../components/NextStepCard";
import { useAuthStore } from "../stores/useAuthStore";
import { useLearningStore } from "../stores/useLearningStore";

export function TracePage() {
  const user = useAuthStore((state) => state.user);
  const attempts = useLearningStore((state) => state.attempts);
  const blackboard = useLearningStore((state) => state.blackboard);
  const setup = useLearningStore((state) => state.setup);
  const persona = useLearningStore((state) => state.persona);
  const passedCount = attempts.filter((attempt) => attempt.is_correct).length;
  const otherCount = attempts.length - passedCount;
  const mastery =
    persona?.mastery?.length
      ? persona.mastery
      : [];
  const errorTags = (() => {
    const counts = new Map<string, number>();
    attempts.forEach((attempt) => {
      if (!attempt.error_tag) return;
      counts.set(attempt.error_tag, (counts.get(attempt.error_tag) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();
  const titleOf = (questionId: string) =>
    persona?.question_notes?.find((item) => item.question_id === questionId)
      ?.title || questionId;
  const displayName = persona?.real_name || user?.display_name || "同学";

  const verdictLabel = (isCorrect: boolean | null | undefined) => {
    if (isCorrect === true) return { text: "正确", color: "green" };
    if (isCorrect === false) return { text: "错误", color: "red" };
    return { text: "未完成", color: "gold" };
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">学习轨迹</p>
          <h1>{displayName}的近期学习</h1>
          <p className="page-intro__description">
            {persona?.course || (setup.subject === "physics" ? "大学物理" : "高等数学")}
            {" · "}
            {persona?.semester || setup.chapter}
            。这里汇总你最近的作答、薄弱点和进度。
          </p>
        </div>
      </section>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="近期作答"
              value={attempts.length}
              suffix="次"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="做对"
              value={passedCount}
              suffix="次"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="错误 / 未完成"
              value={otherCount}
              suffix="次"
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <section className="trace-layout">
        <Card className="mastery-panel" title="掌握程度估计">
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
                    strokeColor={
                      item.value >= 70
                        ? "#2f8667"
                        : item.value >= 45
                          ? "#d3a13f"
                          : "#df6841"
                    }
                    size="small"
                  />
                </div>
              ))
            ) : (
              <Empty description="完成更多练习后会显示掌握程度" />
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
            ) : persona?.weak_points?.length ? (
              persona.weak_points.map((point) => (
                <div key={point}>
                  <span>{point}</span>
                  <Tag color="gold">关注</Tag>
                </div>
              ))
            ) : (
              <Empty description="暂无错因记录" />
            )}
          </div>
        </Card>
      </section>

      {persona?.recent_days?.length ? (
        <Card title="学习日程">
          <Timeline
            items={persona.recent_days.map((item) => ({
              children: (
                <div>
                  <strong>{item.when}</strong>
                  <div>{item.text}</div>
                </div>
              ),
            }))}
          />
        </Card>
      ) : null}

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
                      <strong>{titleOf(attempt.question_id)}</strong>
                      <span>
                        你的作答：<MathText text={attempt.answer} /> · 用时{" "}
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
          <p className="eyebrow">下一步建议</p>
          <h2>{persona?.next_action || "根据错因调整后续计划"}</h2>
          <p>
            {persona?.focus ||
              "同类错误反复出现时，会在计划或提醒里给出调整建议，最终仍由你确认。"}
          </p>
        </div>
        <Tag color="green">待处理提醒 {blackboard.filter((b) => b.status === "open").length} 条</Tag>
      </Card>

      <NextStepCard
        eyebrow="返回计划"
        title="把轨迹里的问题带回每日安排"
        description="错因和中断记录会帮助你判断今晚该加练、减负还是换题型。"
        label="打开学习计划"
        to="/plan"
        icon={<LineChartOutlined />}
      />
    </div>
  );
}

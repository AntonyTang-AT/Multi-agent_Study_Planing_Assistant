import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Statistic,
  Tag,
  message,
} from "antd";
import { useEffect, useState } from "react";

import { agentErrorMessage } from "../api/ai";
import {
  fetchBlackboard,
  resolveBlackboardEntry,
} from "../api/backend";
import { BlackboardPanel } from "../components/BlackboardPanel";
import { NextStepCard } from "../components/NextStepCard";
import { useLearningStore } from "../stores/useLearningStore";
import type { BlackboardEntry } from "../types/api";

type BoardFilter = "all" | "open" | "resolved";

export function BlackboardPage() {
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const entries = useLearningStore((state) => state.blackboard);
  const mergeBlackboard = useLearningStore(
    (state) => state.mergeBlackboard,
  );
  const resolveEntry = useLearningStore((state) => state.resolveEntry);
  const openCount = entries.filter((entry) => entry.status === "open").length;
  const resolvedCount = entries.length - openCount;
  const evidenceCount = entries.reduce(
    (sum, entry) => sum + entry.evidence_refs.length,
    0,
  );

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const items = await fetchBlackboard();
      mergeBlackboard(items);
    } catch (requestError) {
      setError(agentErrorMessage(requestError));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
    // Initial hydration only; resolve actions update Zustand immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (entry: BlackboardEntry) => {
    try {
      await resolveBlackboardEntry(entry.entry_id, {
        action: "mark_resolved",
        note: "用户在共享黑板完成裁决",
      });
      resolveEntry(entry.entry_id);
      message.success("已标记为处理完成");
    } catch (requestError) {
      setError(agentErrorMessage(requestError));
      message.error(agentErrorMessage(requestError));
    }
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">学习提醒</p>
          <h1>需要你确认的事项</h1>
          <p className="page-intro__description">
            时间冲突、题目提醒、节奏中断都会集中在这里。重要调整仍由你确认后才会改写计划。
          </p>
        </div>
        <div className="page-intro__actions">
          <Tag color="orange" icon={<ExclamationCircleOutlined />}>
            {openCount} 条待处理
          </Tag>
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={refresh}
          >
            刷新
          </Button>
        </div>
      </section>

      {error ? (
        <Alert
          type="warning"
          showIcon
          message="提醒同步失败，仍展示本地已加载内容"
          description={error}
          closable
          onClose={() => setError(null)}
        />
      ) : null}

      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="待处理"
              value={openCount}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="已处理"
              value={resolvedCount}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="相关依据"
              value={evidenceCount}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="当前账号" value="个人" />
          </Card>
        </Col>
      </Row>

      <Card className="blackboard-filter-card">
        <div className="blackboard-filter-row">
          <Segmented
            value={filter}
            onChange={(value) => setFilter(value as BoardFilter)}
            options={[
              { label: "全部", value: "all" },
              { label: "待处理", value: "open" },
              { label: "已处理", value: "resolved" },
            ]}
          />
          <span>只显示当前登录账号的提醒</span>
        </div>
      </Card>

      <BlackboardPanel filter={filter} onResolve={handleResolve} />

      <NextStepCard
        eyebrow="下一步"
        title="回到学习计划继续今晚安排"
        description="确认冲突或提醒后，可在计划页查看更新后的每日任务。"
        label="打开学习计划"
        to="/plan"
        icon={<ProjectOutlined />}
      />
    </div>
  );
}

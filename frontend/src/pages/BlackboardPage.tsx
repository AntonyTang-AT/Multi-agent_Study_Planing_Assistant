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
      message.success("黑板条目已处理并留痕");
    } catch (requestError) {
      setError(agentErrorMessage(requestError));
      message.error(agentErrorMessage(requestError));
    }
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">Shared Blackboard · 过程可见</p>
          <h1>共享黑板</h1>
          <p className="page-intro__description">
            冲突、质疑、干预与阶段结论集中在这里。前端只负责展示证据和提交用户裁决，不改写 Agent 判断。
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
          message="黑板同步失败，仍展示本地已加载条目"
          description={error}
          closable
          onClose={() => setError(null)}
        />
      ) : null}

      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="待裁决"
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
              title="证据引用"
              value={evidenceCount}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="数据源" value="Zustand + API" />
          </Card>
        </Col>
      </Row>

      <Card className="blackboard-filter-card">
        <div className="blackboard-filter-row">
          <Segmented
            value={filter}
            onChange={(value) => setFilter(value as BoardFilter)}
            options={[
              { label: "全部条目", value: "all" },
              { label: "待处理", value: "open" },
              { label: "已处理", value: "resolved" },
            ]}
          />
          <span>
            条目状态来自 <code>BlackboardEntry.status</code>
          </span>
        </div>
      </Card>

      <BlackboardPanel filter={filter} onResolve={handleResolve} />
    </div>
  );
}

import { Card, Col, Progress, Row, Statistic, Table, Typography } from "antd";
import { useEffect, useState } from "react";

import { fetchAdminStats, type AdminStats } from "../api/admin";

function DistList({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  if (!entries.length) {
    return <Typography.Text type="secondary">暂无数据</Typography.Text>;
  }
  return (
    <div className="admin-dist">
      {entries.map(([key, value]) => (
        <div key={key} className="admin-dist__row">
          <div className="admin-dist__label">
            <span>{key}</span>
            <strong>{value}</strong>
          </div>
          <Progress
            percent={Math.round((value / max) * 100)}
            showInfo={false}
            strokeColor="#2f8667"
            trailColor="#e2f0e8"
            size="small"
          />
        </div>
      ))}
    </div>
  );
}

export function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <Typography.Text type="danger">{error}</Typography.Text>;
  }
  if (!stats) {
    return <Typography.Text type="secondary">正在汇总全站数据…</Typography.Text>;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <Typography.Title level={2}>管理看板</Typography.Title>
        <Typography.Paragraph type="secondary">
          只读统计：用户、计划场景、作答分布、黑板状态与 AI 调用意图。用于答辩展示全平台数据轮廓。
        </Typography.Paragraph>
      </header>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card className="surface-card">
            <Statistic title="用户" value={stats.users.total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="surface-card">
            <Statistic title="计划快照" value={stats.plans.total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="surface-card">
            <Statistic title="作答记录" value={stats.attempts.total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="surface-card">
            <Statistic title="AI 调用" value={stats.ai_calls.total} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card className="surface-card" title="作答科目分布">
            <DistList data={stats.attempts.by_subject} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="surface-card" title="作答正确性">
            <DistList data={stats.attempts.by_correctness} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="surface-card" title="计划场景">
            <DistList data={stats.plans.by_scenario} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="surface-card" title="黑板类型">
            <DistList data={stats.blackboard.by_type} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="surface-card" title="黑板状态">
            <DistList data={stats.blackboard.by_status} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className="surface-card" title="AI Intent">
            <DistList data={stats.ai_calls.by_intent} />
          </Card>
        </Col>
      </Row>

      <Card className="surface-card" title="近 7 日作答量">
        <DistList
          data={Object.fromEntries(
            stats.attempts.last_7_days.map((d) => [d.date, d.attempts]),
          )}
        />
      </Card>

      <Card className="surface-card" title="用户预览">
        <Table
          rowKey="id"
          pagination={false}
          size="middle"
          dataSource={stats.users.preview}
          columns={[
            { title: "用户名", dataIndex: "username" },
            { title: "显示名", dataIndex: "display_name" },
            { title: "角色", dataIndex: "role", width: 100 },
            { title: "创建时间", dataIndex: "created_at" },
          ]}
        />
      </Card>
    </div>
  );
}

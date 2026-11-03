import {
  ArrowUpOutlined,
  BookOutlined,
  CheckCircleOutlined,
  FormOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Card, Col, Progress, Row, Spin, Table, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchAdminStats, type AdminStats } from "../api/admin";

const GREEN = "#2f8667";
const BLUE = "#47758e";
const AMBER = "#d3a13f";
const RED = "#bd5149";
const TEAL = "#3f9a84";
const PALETTE = [GREEN, BLUE, AMBER, RED, TEAL, "#6b8f71", "#8aa4b0"];

const scenarioLabel: Record<string, string> = {
  final_review: "期末复习",
  catch_up: "跟课补漏",
  unknown: "未标注",
};

const subjectLabel: Record<string, string> = {
  math: "高等数学",
  physics: "大学物理",
  other: "其他",
};

const correctnessLabel: Record<string, string> = {
  true: "正确",
  false: "错误",
  null: "未完成",
};

const intentLabel: Record<string, string> = {
  create_plan: "生成计划",
  verify_answer: "核对作答",
  proactive_intervention: "节奏提醒",
  arbitrate: "计划调整",
  challenge: "题目质疑",
};

const boardTypeLabel: Record<string, string> = {
  conflict: "时间冲突",
  challenge: "题目提醒",
  intervention: "节奏提醒",
  hypothesis: "学习建议",
  stage_conclusion: "阶段小结",
};

function toPieData(
  source: Record<string, number>,
  labels?: Record<string, string>,
) {
  return Object.entries(source).map(([key, value]) => ({
    name: labels?.[key] || key,
    value,
  }));
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

  const trend = useMemo(
    () =>
      (stats?.attempts.last_7_days || []).map((item) => ({
        date: item.date.slice(5),
        attempts: item.attempts,
      })),
    [stats],
  );

  const subjectPie = useMemo(
    () => toPieData(stats?.attempts.by_subject || {}, subjectLabel),
    [stats],
  );
  const scenarioPie = useMemo(
    () => toPieData(stats?.plans.by_scenario || {}, scenarioLabel),
    [stats],
  );
  const correctBars = useMemo(
    () =>
      Object.entries(stats?.attempts.by_correctness || {}).map(([key, value]) => ({
        name: correctnessLabel[key] || key,
        value,
      })),
    [stats],
  );
  const errorBars = useMemo(
    () =>
      Object.entries(stats?.attempts.by_error_tag || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [stats],
  );
  const intentBars = useMemo(
    () =>
      Object.entries(stats?.ai_calls.by_intent || {}).map(([key, value]) => ({
        name: intentLabel[key] || key,
        value,
      })),
    [stats],
  );
  const boardPie = useMemo(
    () => toPieData(stats?.blackboard.by_type || {}, boardTypeLabel),
    [stats],
  );
  const students = stats?.students || [];

  if (error) {
    return (
      <div className="admin-state">
        <Typography.Text type="danger">{error}</Typography.Text>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="admin-state">
        <Spin size="large" />
        <span>正在汇总全站学习数据…</span>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <section className="admin-hero">
        <div>
          <p className="admin-hero__eyebrow">Teaching Operations</p>
          <h1>学习运营总览</h1>
          <p>
            从作答量、正确率、场景分布和提醒状态，观察平台当前学习活跃度与卡点。
          </p>
        </div>
        <div className="admin-hero__pulse">
          <strong>{stats.attempts.pass_rate ?? 0}%</strong>
          <span>整体正确率</span>
        </div>
      </section>

      <section className="admin-kpi-grid">
        <article className="admin-kpi">
          <span className="admin-kpi__icon">
            <TeamOutlined />
          </span>
          <div>
            <small>在学学生</small>
            <strong>{stats.users.students}</strong>
          </div>
          <em>管理员 {stats.users.admins}</em>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi__icon">
            <BookOutlined />
          </span>
          <div>
            <small>有效计划</small>
            <strong>{stats.plans.total}</strong>
          </div>
          <em>场景 {Object.keys(stats.plans.by_scenario).length}</em>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi__icon">
            <FormOutlined />
          </span>
          <div>
            <small>作答总量</small>
            <strong>{stats.attempts.total}</strong>
          </div>
          <em>已判定 {stats.attempts.judged ?? 0}</em>
        </article>
        <article className="admin-kpi">
          <span className="admin-kpi__icon">
            <CheckCircleOutlined />
          </span>
          <div>
            <small>待处理提醒</small>
            <strong>{stats.blackboard.by_status.open || 0}</strong>
          </div>
          <em>黑板 {stats.blackboard.total}</em>
        </article>
      </section>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="admin-chart-card" title="近 7 日作答趋势">
            <div className="admin-chart-wrap admin-chart-wrap--tall">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="attemptFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7df" />
                  <XAxis dataKey="date" tick={{ fill: "#69736e", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#69736e", fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="attempts"
                    name="作答次数"
                    stroke={GREEN}
                    fill="url(#attemptFill)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="admin-chart-card" title="学科作答占比">
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjectPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {subjectPie.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={8}>
          <Card className="admin-chart-card" title="作答结果">
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={correctBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7df" />
                  <XAxis dataKey="name" tick={{ fill: "#69736e", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#69736e", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="次数" radius={[6, 6, 0, 0]}>
                    {correctBars.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={[GREEN, RED, AMBER][index] || BLUE}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={8}>
          <Card className="admin-chart-card" title="计划场景分布">
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scenarioPie}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {scenarioPie.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PALETTE[(index + 1) % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="admin-chart-card" title="提醒类型">
            <div className="admin-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={boardPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={85}
                  >
                    {boardPie.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={PALETTE[(index + 2) % PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card className="admin-chart-card" title="高频错因">
            <div className="admin-chart-wrap admin-chart-wrap--tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorBars} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7df" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={88}
                    tick={{ fill: "#69736e", fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" name="次数" fill={AMBER} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="admin-chart-card" title="助手调用类型">
            <div className="admin-chart-wrap admin-chart-wrap--tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intentBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7df" />
                  <XAxis dataKey="name" tick={{ fill: "#69736e", fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="次数" fill={BLUE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="admin-chart-card"
        title="学习者概况"
        extra={
          <Tag icon={<ArrowUpOutlined />} color="green">
            正确率按个人统计
          </Tag>
        }
      >
        <Table
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          dataSource={students}
          columns={[
            {
              title: "学生",
              render: (_, row) => (
                <div>
                  <strong>{row.display_name || row.username}</strong>
                  {row.is_focus ? (
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      重点
                    </Tag>
                  ) : null}
                  <div className="admin-table-sub">{row.username}</div>
                </div>
              ),
            },
            { title: "作答", dataIndex: "attempts", width: 90 },
            { title: "做对", dataIndex: "passed", width: 90 },
            {
              title: "正确率",
              dataIndex: "pass_rate",
              width: 180,
              render: (value: number) => (
                <div className="admin-rate-cell">
                  <Progress
                    percent={value}
                    size="small"
                    strokeColor={value >= 60 ? GREEN : AMBER}
                  />
                  <span>{value}%</span>
                </div>
              ),
            },
            {
              title: "待处理提醒",
              dataIndex: "open_reminders",
              width: 120,
              render: (value: number) =>
                value ? <Tag color="orange">{value}</Tag> : <Tag>0</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

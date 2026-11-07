import {
  ExclamationCircleOutlined,
  ProjectOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Segmented,
  Tag,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { agentErrorMessage } from "../api/ai";
import {
  fetchBlackboard,
  resolveBlackboardEntry,
} from "../api/backend";
import { AgentCollabLog } from "../components/AgentCollabLog";
import { BlackboardPanel } from "../components/BlackboardPanel";
import { NextStepCard } from "../components/NextStepCard";
import {
  describeBlackboardEntry,
  sortBlackboardEntries,
} from "../data/blackboardMeta";
import { useLearningStore } from "../stores/useLearningStore";
import type { BlackboardEntry } from "../types/api";

type BoardFilter = "all" | "open" | "resolved";

export function BlackboardPage() {
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const entries = useLearningStore((state) => state.blackboard);
  const replaceBlackboard = useLearningStore((state) => state.replaceBlackboard);
  const resolveEntry = useLearningStore((state) => state.resolveEntry);
  const persona = useLearningStore((state) => state.persona);

  const sorted = useMemo(() => sortBlackboardEntries(entries), [entries]);
  const openEntries = sorted.filter((entry) => entry.status === "open");
  const openCount = openEntries.length;
  const resolvedCount = entries.length - openCount;
  const topOpen = openEntries[0];
  const topView = topOpen ? describeBlackboardEntry(topOpen) : null;

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const items = await fetchBlackboard();
      // 必须以服务端快照替换，避免演示操作留下的脏条目在本地越积越多
      replaceBlackboard(items);
    } catch (requestError) {
      setError(agentErrorMessage(requestError));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (entry: BlackboardEntry) => {
    try {
      await resolveBlackboardEntry(entry.entry_id, {
        action: "mark_resolved",
        note: "用户在共享黑板完成确认",
      });
      resolveEntry(entry.entry_id);
      message.success("已标记为了解");
    } catch (requestError) {
      setError(agentErrorMessage(requestError));
      message.error(agentErrorMessage(requestError));
    }
  };

  return (
    <div className="page-stack blackboard-page">
      <section className="page-intro">
        <div>
          <p className="eyebrow">共享黑板</p>
          <h1>
            {persona?.real_name
              ? `${persona.real_name}的待确认事项`
              : "需要你拍板的学习提醒"}
          </h1>
          <p className="page-intro__description">
            把黑板想成几位老师和助手的公共传话台：计划助手、习题助教、节奏教练、学情分析会先在这里商量，
            再请你拍板。你点「已了解」或跳去处理，后续动作才会按你的选择继续。
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
            从服务器刷新
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

      <div className="blackboard-hero">
        <div className="blackboard-hero__main">
          <p className="blackboard-hero__eyebrow">黑板能帮你做什么</p>
          <h2>先看助手们怎么商量，再决定你怎么做</h2>
          <ul>
            <li>
              <strong>传话时间线</strong>：每位助手用不同身份发言，过程可见
            </li>
            <li>
              <strong>时间冲突</strong>：任务超时 → 计划助手请你改安排
            </li>
            <li>
              <strong>作答 / 节奏</strong>：漏条件或断档 → 助教与教练接力提醒
            </li>
          </ul>
        </div>
        <div className="blackboard-hero__focus">
          <span className="blackboard-hero__eyebrow">当前最该处理</span>
          {topOpen && topView ? (
            <>
              <h3>{topView.title}</h3>
              <p>{topOpen.summary}</p>
              <div className="blackboard-hero__cta">
                <Link to={topView.actionPath}>
                  <Button type="primary" icon={<ThunderboltOutlined />}>
                    {topView.actionLabel}
                  </Button>
                </Link>
                <Button onClick={() => handleResolve(topOpen)}>先标记已了解</Button>
              </div>
            </>
          ) : (
            <>
              <h3>暂无待办</h3>
              <p>可以去练习或计划页继续学习；有新冲突时会回到这里。</p>
              <Link to="/practice">
                <Button type="primary">去练习中心</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Row gutter={[12, 12]} className="blackboard-stats">
        <Col xs={12} md={8}>
          <Card className="blackboard-stat-card is-open">
            <div className="blackboard-stat-card__label">待你确认</div>
            <div className="blackboard-stat-card__value">{openCount}</div>
            <p>未处理完前，答辩演示请优先讲这些</p>
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card className="blackboard-stat-card">
            <div className="blackboard-stat-card__label">已确认</div>
            <div className="blackboard-stat-card__value">{resolvedCount}</div>
            <p>表示你已知晓，可作复盘档案</p>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="blackboard-stat-card">
            <div className="blackboard-stat-card__label">提醒来源</div>
            <div className="blackboard-stat-card__value">{entries.length}</div>
            <p>计划仲裁 · 作答校验 · 节奏检测</p>
          </Card>
        </Col>
      </Row>

      <Card className="blackboard-filter-card" title="助手协作总时间线">
        <AgentCollabLog entries={entries} />
      </Card>

      <Card className="blackboard-filter-card">
        <div className="blackboard-filter-row">
          <Segmented
            value={filter}
            onChange={(value) => setFilter(value as BoardFilter)}
            options={[
              { label: `全部 (${entries.length})`, value: "all" },
              { label: `待处理 (${openCount})`, value: "open" },
              { label: `已处理 / 历史 (${resolvedCount})`, value: "resolved" },
            ]}
          />
          <span>默认看全部：含开场后沉淀的历史协作</span>
        </div>
      </Card>

      <BlackboardPanel filter={filter} onResolve={handleResolve} />

      <NextStepCard
        eyebrow="下一步"
        title={topView ? topView.nextStep : "回到学习计划继续今晚安排"}
        description={
          topView
            ? "处理完当前提醒后，再进入对应页面完成动作，演示闭环更清晰。"
            : "确认冲突或提醒后，可在计划页查看更新后的每日任务。"
        }
        label={topView?.actionLabel || "打开学习计划"}
        to={topView?.actionPath || "/plan"}
        icon={<ProjectOutlined />}
      />
    </div>
  );
}

import {
  BulbOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FlagOutlined,
  HeartOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button, Empty, Space, Tag } from "antd";
import { Link } from "react-router-dom";

import {
  AGENT_ROSTER,
  evidenceWithoutThread,
  fallbackAgentThread,
  parseAgentThread,
  resolveAgent,
} from "../data/agentRoster";
import {
  describeBlackboardEntry,
  sortBlackboardEntries,
} from "../data/blackboardMeta";
import { useLearningStore } from "../stores/useLearningStore";
import type { BlackboardEntry } from "../types/api";

interface BlackboardPanelProps {
  compact?: boolean;
  limit?: number;
  filter?: "all" | "open" | "resolved";
  onResolve?: (entry: BlackboardEntry) => Promise<void> | void;
}

const toneIcon = {
  conflict: <ClockCircleOutlined />,
  challenge: <WarningOutlined />,
  intervention: <HeartOutlined />,
  hypothesis: <BulbOutlined />,
  stage: <FlagOutlined />,
  default: <ExclamationCircleOutlined />,
} as const;

const severityColor: Record<string, string> = {
  high: "red",
  medium: "orange",
  low: "blue",
};

export function BlackboardPanel({
  compact = false,
  limit,
  filter = "all",
  onResolve,
}: BlackboardPanelProps) {
  const entries = useLearningStore((state) => state.blackboard);
  const resolveEntry = useLearningStore((state) => state.resolveEntry);
  const statusEntries =
    compact || filter === "open"
      ? entries.filter((entry) => entry.status === "open")
      : filter === "resolved"
        ? entries.filter((entry) => entry.status !== "open")
        : entries;
  const visibleEntries = sortBlackboardEntries(statusEntries).slice(0, limit);

  if (!visibleEntries.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          compact
            ? "暂无待处理提醒"
            : "当前没有提醒。练习、调计划或模拟中断后，重要事项会出现在这里。"
        }
      />
    );
  }

  return (
    <div className={`blackboard-panel${compact ? " is-compact" : ""}`}>
      {visibleEntries.map((entry) => {
        const view = describeBlackboardEntry(entry);
        const open = entry.status === "open";
        const parsed = parseAgentThread(entry.evidence_refs);
        const thread =
          parsed.length > 0 ? parsed : fallbackAgentThread(entry.type);
        const plainEvidence = evidenceWithoutThread(entry.evidence_refs);

        return (
          <article
            key={entry.entry_id}
            className={`blackboard-card tone-${view.tone}${open ? " is-open" : " is-resolved"}`}
          >
            <div className="blackboard-card__head">
              <span className={`blackboard-card__icon tone-${view.tone}`}>
                {toneIcon[view.tone]}
              </span>
              <div className="blackboard-card__titles">
                <div className="blackboard-card__tags">
                  <Tag color={severityColor[entry.severity] || "default"}>
                    {view.severityLabel}
                  </Tag>
                  <Tag>{view.typeLabel}</Tag>
                  {!open ? <Tag color="success">已处理</Tag> : null}
                </div>
                <h3>{compact ? entry.summary : view.title}</h3>
              </div>
            </div>

            <p className="blackboard-card__summary">{entry.summary}</p>

            {!compact ? (
              <div className="blackboard-card__grid">
                <div>
                  <span className="blackboard-card__label">为什么出现</span>
                  <p>{view.why}</p>
                </div>
                <div>
                  <span className="blackboard-card__label">建议你现在</span>
                  <p>{view.nextStep}</p>
                </div>
              </div>
            ) : null}

            <div className={`blackboard-thread${compact ? " is-compact" : ""}`}>
              <div className="blackboard-thread__head">
                <TeamOutlined />
                <span>老师 / 助手在黑板上的传话</span>
              </div>
              <ol className="blackboard-thread__list">
                {thread.slice(0, compact ? 3 : 12).map((msg, index) => {
                  const agent = resolveAgent(
                    AGENT_ROSTER[msg.agentId as keyof typeof AGENT_ROSTER],
                    String(msg.agentId),
                  );
                  return (
                    <li key={`${entry.entry_id}-${index}`} className="blackboard-thread__item">
                      <span
                        className="blackboard-thread__avatar"
                        style={{ background: agent.color }}
                        aria-hidden
                      >
                        {agent.name.slice(0, 1)}
                      </span>
                      <div className="blackboard-thread__bubble">
                        <div className="blackboard-thread__meta">
                          <strong>{agent.name}</strong>
                          <em>{agent.title}</em>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {plainEvidence.length ? (
              <div className="blackboard-card__evidence">
                {plainEvidence.slice(0, compact ? 2 : 4).map((reference) => (
                  <span key={reference}>{reference}</span>
                ))}
              </div>
            ) : null}

            <div className="blackboard-card__actions">
              <Space wrap>
                {!compact ? (
                  <Link to={view.actionPath}>
                    <Button type="primary" size="small">
                      {view.actionLabel}
                    </Button>
                  </Link>
                ) : null}
                {open ? (
                  <Button
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={async () => {
                      if (onResolve) await onResolve(entry);
                      else resolveEntry(entry.entry_id);
                    }}
                  >
                    已了解
                  </Button>
                ) : (
                  <Tag color="green" icon={<CheckOutlined />}>
                    已确认
                  </Tag>
                )}
              </Space>
            </div>
          </article>
        );
      })}
    </div>
  );
}

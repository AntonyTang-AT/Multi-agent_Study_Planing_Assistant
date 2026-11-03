import {
  CheckOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { Button, Empty, Tag } from "antd";

import { useLearningStore } from "../stores/useLearningStore";
import type { BlackboardEntry } from "../types/api";

interface BlackboardPanelProps {
  compact?: boolean;
  limit?: number;
  filter?: "all" | "open" | "resolved";
  onResolve?: (entry: BlackboardEntry) => Promise<void> | void;
}

const typeLabels: Record<string, string> = {
  conflict: "时间冲突",
  challenge: "题目提醒",
  intervention: "节奏提醒",
  hypothesis: "学习建议",
  stage_conclusion: "阶段小结",
};

const typeColors: Record<string, string> = {
  conflict: "orange",
  challenge: "red",
  intervention: "gold",
  hypothesis: "blue",
  stage_conclusion: "green",
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
  const visibleEntries = statusEntries.slice(0, limit);

  if (!visibleEntries.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无黑板条目"
      />
    );
  }

  return (
    <div className="blackboard-panel">
      {visibleEntries.map((entry) => (
        <article className="blackboard-entry" key={entry.entry_id}>
          <span className={`blackboard-entry__icon ${entry.type}`}>
            <ProjectOutlined />
          </span>
          <div className="blackboard-entry__copy">
            <div className="blackboard-entry__meta">
              <Tag color={typeColors[entry.type] || "default"}>
                {typeLabels[entry.type] || entry.type}
              </Tag>
              <code>{entry.entry_id}</code>
            </div>
            <strong>{entry.summary}</strong>
            <div className="blackboard-entry__evidence">
              {(entry.evidence_refs ?? []).slice(0, 3).map((reference) => (
                <span key={reference}>{reference}</span>
              ))}
            </div>
          </div>
          <div className="blackboard-entry__action">
            {entry.status === "open" ? (
              <Button
                size="small"
                icon={<CheckOutlined />}
                onClick={async () => {
                  if (onResolve) {
                    await onResolve(entry);
                  } else {
                    resolveEntry(entry.entry_id);
                  }
                }}
              >
                已了解
              </Button>
            ) : (
              <Tag color="green" icon={<ExclamationCircleOutlined />}>
                已处理
              </Tag>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

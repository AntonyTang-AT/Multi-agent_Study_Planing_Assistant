import { Empty, Tag } from "antd";
import { TeamOutlined } from "@ant-design/icons";

import {
  AGENT_ROSTER,
  buildCollabLog,
  resolveAgent,
} from "../data/agentRoster";
import type { BlackboardEntry } from "../types/api";

interface AgentCollabLogProps {
  entries: BlackboardEntry[];
}

/** 全量助手传话时间线：含历史已处理，不只当前待办 */
export function AgentCollabLog({ entries }: AgentCollabLogProps) {
  const log = buildCollabLog(entries);

  if (!log.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="还没有助手传话记录。练习或调计划后会出现在这里。"
      />
    );
  }

  return (
    <div className="agent-collab-log">
      <div className="agent-collab-log__head">
        <TeamOutlined />
        <div>
          <strong>公共传话台 · 完整协作记录</strong>
          <p>按时间摊平所有提醒里的助手对话（含已处理历史），不只当前待办。</p>
        </div>
        <Tag>{log.length} 条传话</Tag>
      </div>
      <ol className="agent-collab-log__list">
        {log.map((item) => {
          const agent = resolveAgent(
            AGENT_ROSTER[item.agentId as keyof typeof AGENT_ROSTER],
            item.agentId,
          );
          return (
            <li key={`${item.entryId}-${item.order}`} className="agent-collab-log__item">
              <span
                className="agent-collab-log__avatar"
                style={{ background: agent.color }}
                aria-hidden
              >
                {agent.name.slice(0, 1)}
              </span>
              <div className="agent-collab-log__body">
                <div className="agent-collab-log__meta">
                  <strong>{agent.name}</strong>
                  <em>{agent.title}</em>
                  <Tag
                    color={item.entryStatus === "open" ? "orange" : "default"}
                    style={{ marginInlineStart: 4 }}
                  >
                    {item.entryStatus === "open" ? "进行中" : "历史"}
                  </Tag>
                </div>
                <p className="agent-collab-log__text">{item.text}</p>
                <span className="agent-collab-log__context">{item.entrySummary}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

import { CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Radio, Tag } from "antd";

import type { AgentStatus, UserOption } from "../types/api";

interface UserOptionsCardProps {
  options: UserOption[];
  selectedId: string;
  status: "idle" | AgentStatus;
  message: string;
  loading: boolean;
  onChange: (id: string) => void;
  onSubmit: () => void;
}

const optionDescriptions: Record<string, string> = {
  extend_time: "保留任务深度，把每日预算调整到 60 分钟",
  reduce_depth: "保留时间预算，证明任务只保留关键步骤",
  adjust_goal: "将本轮范围收敛到基础章节，暂缓跨章综合",
};

export function UserOptionsCard({
  options,
  selectedId,
  status,
  message,
  loading,
  onChange,
  onSubmit,
}: UserOptionsCardProps) {
  const isConflict = status === "conflict" || status === "need_user";
  const resolved = status === "ok" && options.length === 0;

  if (!options.length && !resolved) return null;

  return (
    <section
      className={`decision-panel${resolved ? " is-resolved" : ""}`}
      aria-labelledby="decision-title"
    >
      <div className="decision-panel__copy">
        <Tag
          className="status-tag"
          color={isConflict ? "orange" : "green"}
          icon={isConflict ? <WarningOutlined /> : <CheckCircleOutlined />}
        >
          {resolved ? "已裁决 · 二次审计通过" : "用户裁决 · 等待选择"}
        </Tag>
        <h2 id="decision-title">
          {resolved ? "计划已按你的选择完成重排。" : "计划没有可行解，系统没有自行修改。"}
        </h2>
        <p>
          {resolved
            ? "裁决、理由与重排结果已写入共享黑板，计划快照可继续编辑。"
            : message || "审计发现时间预算冲突，请选择一个替代方向。"}
        </p>
        <div className="decision-evidence">
          <span>plan#day3</span>
          <span>constraint#daily_minutes</span>
          <span>requires_approval=true</span>
        </div>
      </div>

      {resolved ? (
        <Alert
          className="decision-resolved"
          type="success"
          showIcon
          message="计划已保存"
          description="用户选择已写回 Zustand 状态，黑板条目状态同步更新。"
        />
      ) : (
        <div className="decision-panel__options">
          <Radio.Group
            value={selectedId}
            onChange={(event) => onChange(event.target.value as string)}
          >
            {options.map((option) => (
              <Radio
                className={`decision-option${selectedId === option.id ? " is-selected" : ""}`}
                value={option.id}
                key={option.id}
              >
                <span className="decision-option__title">{option.label}</span>
                <span className="decision-option__description">
                  {optionDescriptions[option.id] ||
                    "提交后写入黑板并保留裁决记录"}
                </span>
              </Radio>
            ))}
          </Radio.Group>
          <Button
            block
            type="primary"
            loading={loading}
            onClick={onSubmit}
          >
            提交裁决并重排
          </Button>
        </div>
      )}
    </section>
  );
}

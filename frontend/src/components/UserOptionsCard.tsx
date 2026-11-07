import { CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Radio, Tag } from "antd";

import type { AgentStatus, Subject, UserOption } from "../types/api";

interface UserOptionsCardProps {
  options: UserOption[];
  selectedId: string;
  status: "idle" | AgentStatus;
  message: string;
  loading: boolean;
  subject?: Subject | string;
  onChange: (id: string) => void;
  onSubmit: () => void;
}

const MATH_OPTION_DESCRIPTIONS: Record<string, string> = {
  extend_time: "保留今晚任务深度，把每日可用时间调到约 60 分钟",
  reduce_depth: "仍用 45 分钟，证明题改成精读关键步骤",
  adjust_goal: "把连续性证明挪到周末，今晚只做基础题",
};

const CS_OPTION_DESCRIPTIONS: Record<string, string> = {
  extend_time: "保留今晚沙箱 + 洛谷分量，把每日可用时间调到约 70 分钟",
  reduce_depth: "仍用 50 分钟，先过沙箱自测，洛谷提交挪到明天",
  adjust_goal: "把洛谷入门挪到周末，今晚只做分支循环沙箱",
};

function optionDescription(
  optionId: string,
  subject?: Subject | string,
): string {
  const table =
    subject === "cs" ? CS_OPTION_DESCRIPTIONS : MATH_OPTION_DESCRIPTIONS;
  return table[optionId] || "确认后会按这个方向重排今晚任务";
}

export function UserOptionsCard({
  options,
  selectedId,
  status,
  message,
  loading,
  subject,
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
          {resolved ? "已按你的选择更新" : "需要你确认今晚怎么安排"}
        </Tag>
        <h2 id="decision-title">
          {resolved
            ? "计划已按你的选择调整。"
            : "今晚时间可能不够，请先选一个可行方案。"}
        </h2>
        <p>
          {resolved
            ? "调整原因和结果已记在待办提醒里，之后仍可继续修改计划。"
            : message || "当前任务所需时间超过你设定的每日上限。"}
        </p>
      </div>

      {resolved ? (
        <Alert
          className="decision-resolved"
          type="success"
          showIcon
          message="安排已更新"
          description="可以继续按新的每日任务学习，或再到练习中心做题。"
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
                  {optionDescription(option.id, subject)}
                </span>
              </Radio>
            ))}
          </Radio.Group>
          <Button block type="primary" loading={loading} onClick={onSubmit}>
            确认并更新计划
          </Button>
        </div>
      )}
    </section>
  );
}

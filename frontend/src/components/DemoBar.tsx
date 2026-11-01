import {
  ClockCircleOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Button, Tag, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";

import { agentErrorMessage, invokeAgent } from "../api/ai";
import { postTimeJump } from "../api/backend";
import { useLearningStore } from "../stores/useLearningStore";

export function DemoBar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setup = useLearningStore((state) => state.setup);
  const demo = useLearningStore((state) => state.demo);
  const loading = useLearningStore((state) => state.loading);
  const setDemoFlag = useLearningStore((state) => state.setDemoFlag);
  const setLoading = useLearningStore((state) => state.setLoading);
  const setError = useLearningStore((state) => state.setError);
  const applyPlanResponse = useLearningStore(
    (state) => state.applyPlanResponse,
  );
  const applyPracticeResponse = useLearningStore(
    (state) => state.applyPracticeResponse,
  );
  const applyIntervention = useLearningStore(
    (state) => state.applyIntervention,
  );
  const resetDemo = useLearningStore((state) => state.resetDemo);

  if (searchParams.get("demo") !== "1") return null;

  const showConflict = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invokeAgent("create_plan", {
        scenario: setup.mode,
        input: {
          goal: "期末过线",
          scenarioConfig: { ...setup, dailyMinutes: 45 },
        },
        demo: { ...demo, force_conflict: true },
      });
      setDemoFlag("force_conflict", true);
      applyPlanResponse(response);
      navigate({ pathname: "/plan", search: "?demo=1" });
      message.info("计划审计冲突已生成，等待用户裁决");
    } catch (error) {
      setError(agentErrorMessage(error));
      message.error(agentErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const showAbstain = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invokeAgent("verify_answer", {
        scenario: setup.mode,
        input: {
          answer: "A",
          question: {
            stem: "lim(x→0) (sin(3x) - 3x) / x³",
            verify_hint: {
              expr: "limit((sin(3*x)-3*x)/x^3, x, 0)",
              expected: "-9/2",
            },
          },
        },
        demo: { ...demo, force_verify_fail: true },
      });
      setDemoFlag("force_verify_fail", true);
      applyPracticeResponse(response);
      navigate({ pathname: "/practice", search: "?demo=1" });
      message.warning("计算检验已拦截草稿，页面进入提示模式");
    } catch (error) {
      setError(agentErrorMessage(error));
      message.error(agentErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const timeJump = async () => {
    setLoading(true);
    setError(null);
    try {
      await postTimeJump(2);
      const response = await invokeAgent("proactive_intervention", {
        scenario: setup.mode,
        trace_snapshot: {
          load_signals: { overload: false },
          recent_attempts: [],
        },
        demo: { ...demo, time_jump_days: 2 },
      });
      applyIntervention(response);
      message.info("已模拟两天未登录，主动干预卡片已写入黑板");
      navigate({ pathname: "/blackboard", search: "?demo=1" });
    } catch (error) {
      setError(agentErrorMessage(error));
      message.error(agentErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="demo-bar" aria-label="演示控制条">
      <div className="demo-bar__label">
        <Tag color="green" icon={<SafetyCertificateOutlined />}>
          DEMO
        </Tag>
        <span>3 分钟必演路径</span>
      </div>
      <div className="demo-bar__actions">
        <Button
          size="small"
          danger
          icon={<ExperimentOutlined />}
          disabled={loading}
          onClick={showConflict}
        >
          审计冲突
        </Button>
        <Button
          size="small"
          icon={<ExperimentOutlined />}
          disabled={loading}
          onClick={showAbstain}
        >
          校验弃答
        </Button>
        <Button
          size="small"
          icon={<ClockCircleOutlined />}
          disabled={loading}
          onClick={timeJump}
        >
          时间跳跃
        </Button>
        <Button
          size="small"
          type="text"
          icon={<ReloadOutlined />}
          onClick={() => {
            resetDemo();
            navigate({ pathname: "/", search: "?demo=1" });
            message.success("演示数据已重置");
          }}
        >
          重置
        </Button>
      </div>
    </aside>
  );
}

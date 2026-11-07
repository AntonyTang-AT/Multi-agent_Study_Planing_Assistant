import {
  ClockCircleOutlined,
  ExperimentOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Tag, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";

import { agentErrorMessage, invokeAgent } from "../api/ai";
import { postTimeJump, resetDemoPreset } from "../api/backend";
import { useAuthStore } from "../stores/useAuthStore";
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
  const mergeBlackboard = useLearningStore((state) => state.mergeBlackboard);
  const hydrateForUser = useLearningStore((state) => state.hydrateForUser);
  const user = useAuthStore((state) => state.user);

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
              expr: "limit((sin(3*x)-3*x)/x**3, x, 0)",
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

  const showChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invokeAgent("challenge", {
        scenario: setup.mode,
        input: {
          question: {
            question_id: "demo_challenge_sqrt",
            stem: "若未特别声明定义域，求 y=√x 在 x=0 处的导数。",
            answer: "不存在（或 +∞，视定义）",
            assumptions: [],
            knowledge_ids: ["math.a1.ch04"],
            error_tags: ["undefined_assumption"],
          },
        },
        demo,
      });
      mergeBlackboard(response.blackboard_entries || []);
      message.info(response.message || "已生成结构化质疑卡片");
      navigate({ pathname: "/blackboard", search: "?demo=1" });
    } catch (error) {
      setError(agentErrorMessage(error));
      message.error(agentErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const showMetacognitive = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invokeAgent("metacognitive_feedback", {
        scenario: setup.mode,
        input: {
          topic: setup.chapter || "极限与连续",
          error_tag: "limit_misuse",
        },
        resource_refs: [
          {
            type: "knowledge",
            id: "math.limit",
            label: setup.chapter || "极限与连续",
          },
        ],
        demo,
      });
      mergeBlackboard(response.blackboard_entries || []);
      const card = response.output?.card;
      message.success(
        card?.title
          ? `已生成元认知复盘：${card.title}`
          : response.message || "元认知反馈已生成",
      );
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
        <span>必演路径</span>
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
          icon={<QuestionCircleOutlined />}
          disabled={loading}
          onClick={showChallenge}
        >
          结构化质疑
        </Button>
        <Button
          size="small"
          icon={<ThunderboltOutlined />}
          disabled={loading}
          onClick={showMetacognitive}
        >
          元认知复盘
        </Button>
        <Button
          size="small"
          type="text"
          icon={<ReloadOutlined />}
          disabled={loading}
          onClick={async () => {
            if (!user?.id) {
              message.warning("请先登录演示账号");
              return;
            }
            setLoading(true);
            try {
              await resetDemoPreset();
              // 强制重新拉服务端种子，避免本地清空后变成「空账号」
              useLearningStore.setState({ hydratedUserId: null });
              await hydrateForUser(user.id);
              navigate({ pathname: "/blackboard", search: "?demo=1" });
              message.success("已恢复开场预设（不是清空账号）");
            } catch (error) {
              message.error(agentErrorMessage(error));
            } finally {
              setLoading(false);
            }
          }}
        >
          恢复预设
        </Button>
      </div>
    </aside>
  );
}

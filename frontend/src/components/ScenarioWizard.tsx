import {
  ArrowRightOutlined,
  CalendarOutlined,
  ExperimentOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Segmented,
  Space,
  Tag,
} from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";

import { agentErrorMessage, invokeAgent } from "../api/ai";
import {
  useLearningStore,
  type ScenarioSetup,
} from "../stores/useLearningStore";

const modeOptions = [
  { label: "期末复习", value: "final_review" },
  { label: "跟课补漏", value: "catch_up" },
];

export function ScenarioWizard() {
  const [form] = Form.useForm<ScenarioSetup>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setup = useLearningStore((state) => state.setup);
  const demo = useLearningStore((state) => state.demo);
  const setSetup = useLearningStore((state) => state.setSetup);
  const applyPlanResponse = useLearningStore(
    (state) => state.applyPlanResponse,
  );
  const setLoading = useLearningStore((state) => state.setLoading);
  const setError = useLearningStore((state) => state.setError);
  const loading = useLearningStore((state) => state.loading);
  const error = useLearningStore((state) => state.error);
  const mode = Form.useWatch("mode", form) ?? setup.mode;

  const submit = async (values: ScenarioSetup) => {
    setSetup(values);
    setError(null);
    setLoading(true);
    try {
      const result = await invokeAgent("create_plan", {
        scenario: values.mode,
        input: {
          goal: values.mode === "final_review" ? "期末过线" : "跟课补齐",
          scenarioConfig: values,
          error_tag: "formula_misuse",
        },
        demo: {
          ...demo,
          force_conflict:
            values.dailyMinutes <= 45 || Boolean(demo.force_conflict),
        },
        user_profile: {
          user_id: "u_web_demo",
          constraints: {
            hard: [
              `daily_minutes<=${values.dailyMinutes}`,
              values.mode === "final_review"
                ? `exam_date=${values.examDate}`
                : `chapter=${values.chapter}`,
            ],
            soft: [],
          },
        },
      });
      applyPlanResponse(result);
      navigate({
        pathname: "/plan",
        search: searchParams.get("demo") === "1" ? "?demo=1" : "",
      });
    } catch (requestError) {
      setError(agentErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="scenario-card" aria-labelledby="scenario-title">
      <div className="scenario-card__head">
        <div>
          <span className="scenario-card__eyebrow">START HERE</span>
          <h2 id="scenario-title">设定这次学习</h2>
        </div>
        <Tag color="green">Mock / API 统一合同</Tag>
      </div>

      {error ? (
        <Alert
          className="scenario-alert"
          type="error"
          showIcon
          message="智能服务暂不可用"
          description={error}
          closable
          onClose={() => setError(null)}
        />
      ) : null}

      <Form<ScenarioSetup>
        form={form}
        layout="vertical"
        initialValues={setup}
        requiredMark={false}
        onFinish={submit}
      >
        <Form.Item name="mode" label="学习场景">
          <Segmented block options={modeOptions} />
        </Form.Item>

        <div className="form-grid">
          <Form.Item name="subject" label="学科">
            <Segmented
              block
              options={[
                { label: "高等数学", value: "math" },
                { label: "大学物理", value: "physics" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="dailyMinutes"
            label="每日可用时间"
            rules={[{ required: true, message: "请输入每日可用时间" }]}
          >
            <InputNumber min={15} max={180} addonAfter="分钟" />
          </Form.Item>
        </div>

        {mode === "final_review" ? (
          <Form.Item
            name="examDate"
            label="考试日期"
            rules={[{ required: true, message: "请选择考试日期" }]}
          >
            <Input
              type="date"
              prefix={<CalendarOutlined />}
              aria-label="考试日期"
            />
          </Form.Item>
        ) : (
          <Form.Item
            name="chapter"
            label="当前章节"
            rules={[{ required: true, message: "请输入当前章节" }]}
          >
            <Input prefix={<ReadOutlined />} />
          </Form.Item>
        )}

        <div className="scenario-hints">
          <span>
            <ExperimentOutlined /> 45 分钟以内会触发计划审计冲突
          </span>
          <span>冲突、校验与黑板状态均来自同一响应合同</span>
        </div>

        <Space className="scenario-actions" direction="vertical" size={8}>
          <Button
            block
            type="primary"
            size="large"
            htmlType="submit"
            loading={loading}
            icon={<ArrowRightOutlined />}
          >
            生成并审计计划
          </Button>
          <Button
            block
            type="text"
            onClick={() => navigate("/materials")}
          >
            先浏览学习资料
          </Button>
        </Space>
      </Form>
    </section>
  );
}

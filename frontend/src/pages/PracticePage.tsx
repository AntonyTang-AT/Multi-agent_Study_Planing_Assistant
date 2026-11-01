import {
  CheckCircleOutlined,
  ExperimentOutlined,
  FormOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Divider,
  Radio,
  Space,
  Tag,
  Timeline,
  message,
} from "antd";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { agentErrorMessage, invokeAgent } from "../api/ai";
import { submitAttempt } from "../api/backend";
import { useLearningStore } from "../stores/useLearningStore";

export function PracticePage() {
  const [answer, setAnswer] = useState("");
  const startedAt = useRef(Date.now());
  const setup = useLearningStore((state) => state.setup);
  const demo = useLearningStore((state) => state.demo);
  const question = useLearningStore((state) => state.question);
  const practice = useLearningStore((state) => state.practice);
  const loading = useLearningStore((state) => state.loading);
  const error = useLearningStore((state) => state.error);
  const applyPracticeResponse = useLearningStore(
    (state) => state.applyPracticeResponse,
  );
  const setLocalPracticeResult = useLearningStore(
    (state) => state.setLocalPracticeResult,
  );
  const resetPractice = useLearningStore((state) => state.resetPractice);
  const addAttempt = useLearningStore((state) => state.addAttempt);
  const setLoading = useLearningStore((state) => state.setLoading);
  const setError = useLearningStore((state) => state.setError);

  const submit = async () => {
    if (!answer) {
      message.warning("请选择一个答案后再提交");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let passed = false;
      try {
        const response = await invokeAgent("verify_answer", {
          scenario: setup.mode,
          input: {
            answer,
            question: {
              question_id: question.question_id,
              stem: question.stem,
              answer: question.answer,
              verify_hint: question.verify_hint,
            },
          },
          demo,
        });
        applyPracticeResponse(response);
        passed = response.status === "ok";
        if (response.status === "ok") {
          message.success("回答通过计算检验");
        } else {
          message.warning("答案未通过校验，已切换为提示模式");
        }
      } catch (requestError) {
        const fallbackMessage = agentErrorMessage(requestError);
        setError(fallbackMessage);
        passed = answer === question.answer;
        setLocalPracticeResult(
          passed,
          "智能服务暂不可用，已使用题库标准答案完成本地判分并保留作答记录。",
        );
        message.warning("智能服务不可用，已切换为本地标准答案判分");
      }

      const attempt = await submitAttempt({
        question_id: question.question_id,
        answer,
        error_tag: question.error_tags[0],
        duration_ms: Date.now() - startedAt.current,
      });
      addAttempt({
        ...attempt,
        is_correct: passed,
      });
    } catch (requestError) {
      setError(agentErrorMessage(requestError));
      message.error(agentErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAnswer("");
    startedAt.current = Date.now();
    resetPractice();
  };

  const passed =
    practice.status === "ok" && practice.verdict === "passed";
  const abstained =
    practice.status === "abstain" || practice.status === "doubt";
  const auditTrail = practice.auditTrail ?? [];

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">Practice · 作答与计算校验</p>
          <h1>练习中心</h1>
          <p className="page-intro__description">
            作答会经过计算检验。未通过时只展示提示与审计轨迹，不把不可靠草稿当作正确答案。
          </p>
        </div>
        <div className="page-intro__actions">
          <Tag color="green">passed</Tag>
          <Tag color="gold">abstain / hint_mode</Tag>
          <Link to="/blackboard">
            <Button icon={<HistoryOutlined />}>查看校验留痕</Button>
          </Link>
        </div>
      </section>

      {error ? (
        <Alert
          type="error"
          showIcon
          closable
          message="校验服务暂不可用"
          description={error}
          onClose={() => setError(null)}
        />
      ) : null}

      <section className="practice-layout">
        <Card className="question-card">
          <div className="question-card__top">
            <Space wrap>
              <Tag color="blue">{question.chapter}</Tag>
              <Tag>难度 {question.difficulty}</Tag>
              <Tag>{question.exam_hot ? "期末热点" : "基础训练"}</Tag>
            </Space>
            <span>{question.question_id}</span>
          </div>
          <div className="question-card__body">
            <span className="eyebrow">QUESTION</span>
            <h2>{question.stem}</h2>
            <div className="math-expression">
              lim<sub>x→0</sub> (sin 3x − 3x) / x³
            </div>
            <Radio.Group
              className="answer-grid"
              value={answer}
              onChange={(event) => setAnswer(String(event.target.value))}
            >
              {question.options.map((option) => (
                <Radio value={option.label} key={option.key}>
                  <span className="answer-key">{option.key}</span>
                  <span>{option.label}</span>
                </Radio>
              ))}
            </Radio.Group>

            {question.assumptions.length ? (
              <div className="assumption-row">
                <span>假设声明</span>
                <Tag bordered={false}>{question.assumptions.join("；")}</Tag>
              </div>
            ) : null}

            <div className="question-actions">
              <Button icon={<FormOutlined />} onClick={reset}>
                重新作答
              </Button>
              <Button
                type="primary"
                loading={loading}
                disabled={Boolean(practice.status !== "idle")}
                onClick={submit}
              >
                提交并校验
              </Button>
            </div>
          </div>
        </Card>

        <div className="practice-side">
          {passed ? (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="passed · 校验通过"
              description="答案、耗时与提交动作已记录到学习轨迹。"
            />
          ) : null}
          {abstained ? (
            <Alert
              type="warning"
              showIcon
              icon={<ExperimentOutlined />}
              message="abstain · 不强行给出答案"
              description={practice.message || "校验失败，已进入提示模式。"}
            />
          ) : null}

          <Card
            className="audit-card"
            title={
              <Space>
                <span className="audit-live-dot" />
                计算检验轨迹
              </Space>
            }
            extra={<Tag>LIVE MOCK</Tag>}
          >
            {auditTrail.length ? (
              <Timeline
                items={auditTrail.map((item, index) => ({
                  color: index === auditTrail.length - 1 ? "red" : "green",
                  children: (
                    <div className="audit-step">
                      <strong>{item.step || `step ${index + 1}`}</strong>
                      <span>{item.summary || "已记录校验事件"}</span>
                    </div>
                  ),
                }))}
              />
            ) : (
              <div className="audit-placeholder">
                <FormOutlined />
                <strong>等待提交</strong>
                <span>提交后会展示展开、比较与结论步骤。</span>
              </div>
            )}
            <Divider />
            <div className="audit-contract">
              <span>合同状态</span>
              <code>ok | conflict | doubt | failed | abstain | need_user</code>
            </div>
            <div className="audit-contract">
              <span>依赖声明</span>
              <code>sin(3x) 使用三阶泰勒展开</code>
            </div>
          </Card>

          <Card className="practice-hint-card">
            <strong>为什么答题后还要校验？</strong>
            <p>
              AI 草稿可能在加减结构中直接做等价替换。计算检验会独立比较表达式差异，失败时只给提示路径。
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

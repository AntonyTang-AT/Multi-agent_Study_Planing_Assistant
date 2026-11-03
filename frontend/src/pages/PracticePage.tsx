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
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { agentErrorMessage, invokeAgent } from "../api/ai";
import { submitAttempt } from "../api/backend";
import { NextStepCard } from "../components/NextStepCard";
import { getPersonaBundle } from "../data/personaContent";
import type { DemoQuestion } from "../mocks/mockData";
import { demoQuestion } from "../mocks/mockData";
import { useAuthStore } from "../stores/useAuthStore";
import { useLearningStore } from "../stores/useLearningStore";

export function PracticePage() {
  const username = useAuthStore((state) => state.user?.username);
  const bundle = getPersonaBundle(username);
  const bank = useMemo(
    () => (bundle?.practice_bank?.length ? bundle.practice_bank : [demoQuestion]),
    [bundle],
  );
  const [activeId, setActiveId] = useState(bank[0]?.question_id || demoQuestion.question_id);
  const [answer, setAnswer] = useState("");
  const startedAt = useRef(Date.now());
  const setup = useLearningStore((state) => state.setup);
  const demo = useLearningStore((state) => state.demo);
  const practice = useLearningStore((state) => state.practice);
  const loading = useLearningStore((state) => state.loading);
  const error = useLearningStore((state) => state.error);
  const persona = useLearningStore((state) => state.persona);
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

  useEffect(() => {
    setActiveId(bank[0]?.question_id || demoQuestion.question_id);
    setAnswer("");
    resetPractice();
    startedAt.current = Date.now();
  }, [username, bank, resetPractice]);

  const question: DemoQuestion =
    bank.find((item) => item.question_id === activeId) || bank[0] || demoQuestion;

  const selectQuestion = (id: string) => {
    setActiveId(id);
    setAnswer("");
    resetPractice();
    startedAt.current = Date.now();
  };

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
          message.success("回答正确");
        } else {
          message.warning("这题还可以再看看，已保留作答记录");
        }
      } catch (requestError) {
        const fallbackMessage = agentErrorMessage(requestError);
        setError(fallbackMessage);
        passed = answer === question.answer;
        setLocalPracticeResult(
          passed,
          "核对服务暂不可用，已按题库标准答案完成本地判分。",
        );
        message.warning("已使用本地标准答案判分");
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
          <p className="eyebrow">练习中心</p>
          <h1>
            {persona?.real_name
              ? `${persona.real_name}的题单`
              : "今天练几题"}
          </h1>
          <p className="page-intro__description">
            当前题单共 {bank.length} 道，可按章节切换。提交后会留下对错记录。
          </p>
        </div>
        <div className="page-intro__actions">
          <Tag color="green">{bank.length} 题</Tag>
          <Link to="/blackboard">
            <Button icon={<HistoryOutlined />}>查看相关提醒</Button>
          </Link>
        </div>
      </section>

      {error ? (
        <Alert
          type="error"
          showIcon
          closable
          message="核对服务暂不可用"
          description={error}
          onClose={() => setError(null)}
        />
      ) : null}

      <section className="practice-layout practice-layout--bank">
        <aside className="practice-bank">
          <Card title="本题单" size="small">
            <div className="practice-bank__list">
              {bank.map((item, index) => (
                <button
                  type="button"
                  key={item.question_id}
                  className={`practice-bank__item${item.question_id === question.question_id ? " is-active" : ""}`}
                  onClick={() => selectQuestion(item.question_id)}
                >
                  <strong>
                    {index + 1}. {item.chapter}
                  </strong>
                  <span>{item.stem}</span>
                  <div>
                    <Tag>{item.exam_hot ? "热点" : "基础"}</Tag>
                    <Tag>难度 {item.difficulty}</Tag>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <Card className="question-card">
          <div className="question-card__top">
            <Space wrap>
              <Tag color="blue">{question.chapter}</Tag>
              <Tag>难度 {question.difficulty}</Tag>
              <Tag>{question.exam_hot ? "期末热点" : "基础训练"}</Tag>
            </Space>
            <span>
              {bank.findIndex((item) => item.question_id === question.question_id) + 1} /{" "}
              {bank.length}
            </span>
          </div>
          <div className="question-card__body">
            <span className="eyebrow">题目</span>
            <h2>{question.stem}</h2>
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
                <span>作答提示</span>
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
                提交
              </Button>
              <Button
                disabled={
                  bank.findIndex((item) => item.question_id === question.question_id) >=
                  bank.length - 1
                }
                onClick={() => {
                  const idx = bank.findIndex(
                    (item) => item.question_id === question.question_id,
                  );
                  if (idx < bank.length - 1) {
                    selectQuestion(bank[idx + 1].question_id);
                  }
                }}
              >
                下一题
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
              message="回答正确"
              description="本次作答已记入学习轨迹。"
            />
          ) : null}
          {abstained ? (
            <Alert
              type="warning"
              showIcon
              icon={<ExperimentOutlined />}
              message="这题先标记为「稍后再看」"
              description={
                practice.message || "当前结果还不够确定，不会记成正确答案。"
              }
            />
          ) : null}

          <Card
            className="audit-card"
            title={
              <Space>
                <span className="audit-live-dot" />
                核对过程
              </Space>
            }
          >
            {auditTrail.length ? (
              <Timeline
                items={auditTrail.map((item, index) => ({
                  color: index === auditTrail.length - 1 ? "red" : "green",
                  children: (
                    <div className="audit-step">
                      <strong>{item.step || `步骤 ${index + 1}`}</strong>
                      <span>{item.summary || "已记录核对结果"}</span>
                    </div>
                  ),
                }))}
              />
            ) : (
              <div className="audit-placeholder">
                <FormOutlined />
                <strong>等待提交</strong>
                <span>提交后会显示核对步骤与结论。</span>
              </div>
            )}
            <Divider />
            <div className="audit-contract">
              <span>本题注意</span>
              <code>
                {question.error_tags[0]
                  ? `易错点：${question.error_tags[0]}`
                  : "先确认题干条件再下笔"}
              </code>
            </div>
          </Card>
        </div>
      </section>

      <NextStepCard
        eyebrow="下一步"
        title="到学习轨迹里回顾这次作答"
        description="正确率、用时和错因会留在轨迹里，方便安排后面几天练什么。"
        label="查看学习轨迹"
        to="/trace"
        icon={<HistoryOutlined />}
      />
    </div>
  );
}

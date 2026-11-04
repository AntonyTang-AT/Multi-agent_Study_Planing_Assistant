import {
  BookOutlined,
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
  Input,
  Radio,
  Space,
  Tag,
  Timeline,
  message,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { agentErrorMessage, invokeAgent } from "../api/ai";
import { fetchQuestions, submitAttempt } from "../api/backend";
import { MathText } from "../components/MathText";
import { NextStepCard } from "../components/NextStepCard";
import { chapterByLabelOrName } from "../data/chapters";
import { getPersonaBundle } from "../data/personaContent";
import type { DemoQuestion } from "../mocks/mockData";
import { demoQuestion } from "../mocks/mockData";
import type { Question } from "../types/api";
import { useAuthStore } from "../stores/useAuthStore";
import { useLearningStore } from "../stores/useLearningStore";

type PracticeItem = DemoQuestion;

function toPracticeItem(question: Question): PracticeItem {
  const withOptions = question as Question & {
    options?: DemoQuestion["options"];
  };
  return {
    ...question,
    options: withOptions.options ?? [],
  };
}

function mergeBanks(
  personaBank: PracticeItem[],
  apiBank: PracticeItem[],
  limit = 16,
): PracticeItem[] {
  const seen = new Set<string>();
  const merged: PracticeItem[] = [];
  for (const item of [...personaBank, ...apiBank]) {
    if (!item?.question_id || seen.has(item.question_id)) continue;
    seen.add(item.question_id);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged.length ? merged : [demoQuestion];
}

export function PracticePage() {
  const [searchParams] = useSearchParams();
  const username = useAuthStore((state) => state.user?.username);
  const bundle = getPersonaBundle(username);
  const setup = useLearningStore((state) => state.setup);
  const plan = useLearningStore((state) => state.plan);
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

  const [bank, setBank] = useState<PracticeItem[]>(
    bundle?.practice_bank?.length ? bundle.practice_bank : [demoQuestion],
  );
  const [bankSource, setBankSource] = useState("人设题单");
  const [activeId, setActiveId] = useState(
    bank[0]?.question_id || demoQuestion.question_id,
  );
  const [answer, setAnswer] = useState("");
  const startedAt = useRef(Date.now());

  const preferredKnowledge = useMemo(() => {
    const fromQuery = searchParams.get("knowledge");
    if (fromQuery) return fromQuery;
    const task = plan?.tasks?.find(
      (item) => (item as { status?: string }).status !== "done",
    );
    return task?.knowledge_ids?.[0];
  }, [plan, searchParams]);

  useEffect(() => {
    let cancelled = false;
    const personaBank = bundle?.practice_bank?.length
      ? bundle.practice_bank
      : [];
    const load = async () => {
      try {
        const preferHot = setup.mode === "final_review";
        let apiItems = await fetchQuestions({
          subject: setup.subject,
          knowledgeId: preferredKnowledge,
          scenarioTag: setup.mode,
          examHot: preferHot ? true : undefined,
        });
        if (apiItems.length < 4) {
          apiItems = await fetchQuestions({ subject: setup.subject });
        }
        if (cancelled) return;
        const merged = mergeBanks(
          personaBank,
          apiItems.map(toPracticeItem),
        );
        setBank(merged);
        setBankSource(
          preferredKnowledge
            ? `人设 + 题库（${preferredKnowledge}）`
            : `人设 + 题库 · ${setup.subject === "math" ? "高等数学" : "大学物理"}`,
        );
        setActiveId(merged[0]?.question_id || demoQuestion.question_id);
      } catch {
        if (cancelled) return;
        const fallback = personaBank.length ? personaBank : [demoQuestion];
        setBank(fallback);
        setBankSource("人设题单（题库暂不可用）");
        setActiveId(fallback[0]?.question_id || demoQuestion.question_id);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [bundle, preferredKnowledge, setup.mode, setup.subject, username]);

  useEffect(() => {
    setAnswer("");
    resetPractice();
    startedAt.current = Date.now();
  }, [activeId, resetPractice]);

  const question: PracticeItem =
    bank.find((item) => item.question_id === activeId) || bank[0] || demoQuestion;
  const hasOptions = Boolean(question.options?.length);
  const materialsChapter =
    chapterByLabelOrName(setup.subject, question.chapter)?.id ||
    question.knowledge_ids?.[0] ||
    "";

  const selectQuestion = (id: string) => {
    setActiveId(id);
  };

  const submit = async () => {
    if (!answer.trim()) {
      message.warning(hasOptions ? "请选择一个答案后再提交" : "请先写下你的答案");
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
        passed =
          answer.trim() === question.answer.trim() ||
          answer.trim().includes(question.answer.trim());
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
        is_correct: passed,
      });
      addAttempt({
        ...attempt,
        is_correct: attempt.is_correct ?? passed,
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
  const materialsPath = materialsChapter
    ? `/materials?subject=${setup.subject}&chapter=${encodeURIComponent(materialsChapter)}`
    : `/materials?subject=${setup.subject}`;

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
            当前题单共 {bank.length} 道（{bankSource}）。提交后会把对错写入学习轨迹。
          </p>
        </div>
        <div className="page-intro__actions">
          <Tag color="green">{bank.length} 题</Tag>
          <Link to={materialsPath}>
            <Button icon={<BookOutlined />}>对照资料</Button>
          </Link>
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
                  <MathText text={item.stem} />
                  <div>
                    <Tag>{item.exam_hot ? "热点" : "基础"}</Tag>
                    <Tag>难度 {item.difficulty}</Tag>
                    <Tag>{item.type}</Tag>
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
            <h2><MathText text={question.stem} /></h2>
            {hasOptions ? (
              <Radio.Group
                className="answer-grid"
                value={answer}
                onChange={(event) => setAnswer(String(event.target.value))}
              >
                {question.options.map((option) => (
                  <Radio value={option.label} key={option.key}>
                    <span className="answer-key">{option.key}</span>
                    <MathText text={option.label} />
                  </Radio>
                ))}
              </Radio.Group>
            ) : (
              <Input.TextArea
                className="practice-answer-input"
                rows={4}
                value={answer}
                placeholder="在这里写下你的答案或关键步骤"
                onChange={(event) => setAnswer(event.target.value)}
              />
            )}

            {question.assumptions.length ? (
              <div className="assumption-row">
                <span>作答提示</span>
                <Tag bordered={false}><MathText text={question.assumptions.join("；")} /></Tag>
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
                      <MathText text={item.summary || "已记录核对结果"} />
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

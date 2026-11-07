import {
  ArrowRightOutlined,
  MessageOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Card, Input, Space, Tag, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { agentErrorMessage, invokeAgent } from "../api/ai";
import { fetchQuestions } from "../api/backend";
import { MathText } from "../components/MathText";
import { NextStepCard } from "../components/NextStepCard";
import {
  bestQuestionIndex,
  buildSolveMessage,
  chapterById,
  detectSolveChapter,
  isSolveIntent,
  matchLocalSolve,
  materialsPath,
  practicePath,
} from "../data/chatSolveRules";
import { getPersonaBundle } from "../data/personaContent";
import { useAuthStore } from "../stores/useAuthStore";
import { useLearningStore } from "../stores/useLearningStore";

interface ChatOption {
  label: string;
  path: string;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  time: string;
  options?: ChatOption[];
}

const nowTime = () =>
  new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export function ChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const username = useAuthStore((state) => state.user?.username);
  const plan = useLearningStore((state) => state.plan);
  const blackboard = useLearningStore((state) => state.blackboard);
  const setup = useLearningStore((state) => state.setup);
  const persona = useLearningStore((state) => state.persona);
  const planStatus = useLearningStore((state) => state.planStatus);
  const attempts = useLearningStore((state) => state.attempts);
  const demo = useLearningStore((state) => state.demo);
  const hydratedUserId = useLearningStore((state) => state.hydratedUserId);
  const mergeBlackboard = useLearningStore((state) => state.mergeBlackboard);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number | null>(null);
  const threadEnd = useRef<HTMLDivElement | null>(null);
  const demoMode = searchParams.get("demo") === "1";
  const bundle = getPersonaBundle(username);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (bundle?.chat_thread?.length) {
      setMessages(
        bundle.chat_thread.map((turn, index) => ({
          id: `${hydratedUserId || "u"}_${index}`,
          role: turn.role,
          text: turn.text,
          time: turn.time,
          options: turn.options,
        })),
      );
      return;
    }
    const greeting =
      persona?.chat_greeting ||
      "你好。告诉我今晚想复习什么、还剩多少时间，我可以帮你对照当前计划给建议。";
    setMessages([
      {
        id: `welcome_${hydratedUserId || "guest"}`,
        role: "assistant",
        text: greeting,
        time: nowTime(),
        options: [
          { label: "查看学习计划", path: "/plan" },
          { label: "去做一题", path: "/practice" },
          { label: "看待办提醒", path: "/blackboard" },
        ],
      },
    ]);
  }, [hydratedUserId, persona?.chat_greeting, bundle]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const go = (path: string) => {
    if (!demoMode) {
      navigate(path);
      return;
    }
    const sep = path.includes("?") ? "&" : "?";
    navigate(`${path}${sep}demo=1`);
  };

  const conflictNote = () =>
    planStatus === "conflict"
      ? "另外：今晚计划可能偏满，可先到计划页做个取舍，再继续练。"
      : undefined;

  const agentReply = async (
    text: string,
  ): Promise<{ text: string; options?: ChatOption[] } | null> => {
    if (/质疑|漏了假设|遗漏条件|单侧极限|是不是漏/.test(text)) {
      const response = await invokeAgent("challenge", {
        scenario: setup.mode,
        input: {
          question: {
            question_id: "chat_challenge_live",
            stem: text,
            answer: "",
            assumptions: [],
            knowledge_ids: plan?.tasks?.[0]?.knowledge_ids || ["math.a1.ch02"],
            error_tags: ["undefined_assumption"],
          },
        },
        demo,
      });
      mergeBlackboard(response.blackboard_entries || []);
      const card = response.output?.card;
      return {
        text:
          (typeof card?.message === "string" && card.message) ||
          (typeof card?.title === "string"
            ? `已触发结构化质疑：${card.title}。${response.message}`
            : response.message) ||
          "已生成质疑卡片，请到提醒页确认假设是否齐全。",
        options: [
          { label: "查看质疑提醒", path: "/blackboard" },
          { label: "去做一题验证", path: "/practice" },
        ],
      };
    }
    if (/元认知|复盘|错因|为什么总错|学习方法/.test(text)) {
      const response = await invokeAgent("metacognitive_feedback", {
        scenario: setup.mode,
        input: {
          topic: setup.chapter || persona?.focus || "极限与连续",
          error_tag: persona?.weak_points?.[0] || "limit_misuse",
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
      return {
        text:
          (typeof card?.message === "string" && card.message) ||
          (typeof card?.title === "string"
            ? `元认知复盘：${card.title}。${response.message}`
            : response.message) ||
          "已生成复盘建议，可到提醒页查看。",
        options: [
          { label: "查看复盘提醒", path: "/blackboard" },
          { label: "打开学习轨迹", path: "/trace" },
        ],
      };
    }
    return null;
  };

  const solveReply = async (
    text: string,
  ): Promise<{ text: string; options?: ChatOption[] } | null> => {
    // 找资料交给场景矩阵，避免「打开极限资料」被做题意图抢走
    if (/资料|课件|教材|页码|讲义/.test(text)) return null;
    if (!isSolveIntent(text)) return null;

    const local = matchLocalSolve(text);
    const chapter =
      (local ? chapterById(local.chapterId) : null) ||
      detectSolveChapter(text) ||
      chapterById(
        setup.subject === "physics" ? "phy.dynamics" : "math.a1.ch04",
      )!;

    let bankHit: {
      question_id: string;
      stem: string;
      answer: string;
      assumptions: string[];
    } | null = null;
    try {
      const questions = await fetchQuestions({ knowledgeId: chapter.id });
      const idx = bestQuestionIndex(
        text,
        questions.map((q) => q.stem),
      );
      if (idx >= 0) {
        const q = questions[idx];
        bankHit = {
          question_id: q.question_id,
          stem: q.stem,
          answer: q.answer,
          assumptions: q.assumptions || [],
        };
      }
    } catch {
      bankHit = null;
    }

    const options: ChatOption[] = [
      {
        label: `去练${chapter.label}`,
        path: practicePath(chapter.id, bankHit?.question_id),
      },
      {
        label: "看本章资料",
        path: materialsPath(chapter.id, chapter.subject),
      },
    ];
    if (planStatus === "conflict") {
      options.push({ label: "先处理计划冲突", path: "/plan" });
    }

    // 本地微规则优先（答辩高频问法），再题库命中，再主题导学
    if (local) {
      return {
        text: buildSolveMessage({
          title: local.title,
          chapterLabel: chapter.label,
          steps: local.steps,
          answer: local.answer,
          note: "正式作答与订正请到练习中心完成，对话只给简要导学。",
          conflictNote: conflictNote(),
        }),
        options,
      };
    }

    if (bankHit) {
      const stemBrief =
        bankHit.stem.length > 120
          ? `${bankHit.stem.slice(0, 120)}…`
          : bankHit.stem;
      const steps = [
        `题库相近题：${stemBrief}`,
        ...(bankHit.assumptions.length
          ? [`先核对假设：${bankHit.assumptions.slice(0, 2).join("；")}`]
          : ["先写出已知条件与要求，再选公式。"]),
        "对照参考答案验算；完整提交请去练习页。",
      ];
      return {
        text: buildSolveMessage({
          title: "题库命中相近题",
          chapterLabel: chapter.label,
          steps,
          answer: bankHit.answer,
          note: "完整作答请去练习中心，避免与练习轨迹双写。",
          conflictNote: conflictNote(),
        }),
        options: [
          {
            label: "去做这道相关题",
            path: practicePath(chapter.id, bankHit.question_id),
          },
          ...options.slice(1),
        ],
      };
    }

    return {
      text: buildSolveMessage({
        title: `关于「${chapter.label}」怎么下手`,
        chapterLabel: chapter.label,
        steps: chapter.guideSteps,
        note: "我还不能自由解复杂题。完整作答请去练习中心，按章节练 1～2 道。",
        conflictNote: conflictNote(),
      }),
      options,
    };
  };

  const reply = (text: string) => {
    const openConflict = blackboard.find(
      (entry) => entry.type === "conflict" && entry.status === "open",
    );
    const openIntervention = blackboard.find(
      (entry) => entry.type === "intervention" && entry.status === "open",
    );
    const passed = attempts.filter((a) => a.is_correct === true).length;

    if (/资料|课件|教材|页码|讲义/.test(text)) {
      const chapter =
        detectSolveChapter(text) ||
        chapterById(
          setup.chapter ||
            (setup.subject === "physics" ? "phy.dynamics" : "math.a1.ch02"),
        ) ||
        chapterById("math.a1.ch02")!;
      return {
        text: `可以去资料页看「${chapter.label}」的教材页码、课件与作业提示${
          planStatus === "conflict" ? "；另外今晚计划可能超时，可顺手到计划页看一眼。" : "。"
        }`,
        options: [
          {
            label: "打开本章资料",
            path: materialsPath(chapter.id, chapter.subject),
          },
          { label: "去练本章", path: practicePath(chapter.id) },
        ],
      };
    }
    if (/提醒|黑板|待办/.test(text)) {
      return {
        text: `提醒黑板上还有 ${
          blackboard.filter((entry) => entry.status === "open").length
        } 条待处理事项，可去确认冲突、干预或质疑卡片。`,
        options: [
          { label: "打开提醒黑板", path: "/blackboard" },
          { label: "查看计划", path: "/plan" },
        ],
      };
    }
    if (/换场景|重新设定|重设场景|换人设/.test(text)) {
      return {
        text: "要换场景或重新设定每日时间，请回首页走一遍场景向导；确认后计划会按新约束重算。",
        options: [
          { label: "回首页向导", path: "/" },
          { label: "先看当前计划", path: "/plan" },
        ],
      };
    }
    if (/你好|您好|你能做什么|你会什么|帮助|怎么用/.test(text)) {
      return {
        text: [
          "我可以帮你处理这些事：",
          "· 做题问答（如「5x 的导数」「极限怎么求」）→ 简要步骤 + 跳转练习",
          "· 计划冲突 / 今晚安排 / 中断恢复",
          "· 结构化质疑、错因复盘",
          "· 找资料、看待办黑板",
          planStatus === "conflict"
            ? "提示：当前计划可能超时，需要时可先去计划页取舍。"
            : "直接说你卡在哪，或点下方快捷句。",
        ].join("\n"),
        options: [
          { label: "查看计划", path: "/plan" },
          { label: "进入练习", path: "/practice" },
          { label: "发起质疑示例", path: "/practice" },
        ],
      };
    }
    if (/练习|安排|明日|今天该|今晚练|该练什么/.test(text)) {
      const nextTask = plan?.tasks.find(
        (task) => (task as { status?: string }).status !== "done",
      );
      return {
        text: nextTask
          ? `建议先做：Day ${nextTask.day}「${nextTask.action}${nextTask.object}」，大约 ${nextTask.minutes} 分钟。`
          : "当前没有待做任务，可以去练习中心自由练一题。",
        options: [
          { label: "打开计划", path: "/plan" },
          { label: "进入练习", path: "/practice" },
        ],
      };
    }
    if (/冲突|不够|超时|时间不够|今晚.*(不够|超时|冲突)|证明/.test(text)) {
      return {
        text: openConflict
          ? `${openConflict.summary}。你可以多挤一点时间、先降低今晚难度，或把难点挪到周末。`
          : plan
            ? "当前计划时间是够用的。你可以继续练习，或去轨迹页看正确率。"
            : "还没有学习计划。先到首页设定期限和每日可用时间。",
        options: [
          { label: plan ? "去调整计划" : "去设定场景", path: plan ? "/plan" : "/" },
          { label: "查看待办", path: "/blackboard" },
        ],
      };
    }
    if (/两天|中断|恢复|最少|坚持|没学/.test(text)) {
      return {
        text: openIntervention
          ? `${openIntervention.summary}。今天最少完成热身即可。`
          : "如果最近容易中断，可以把单次任务压到 15–20 分钟。",
        options: [
          { label: "查看恢复建议", path: "/blackboard" },
          { label: "开始短练习", path: "/practice" },
        ],
      };
    }
    if (/正确率|薄弱|总是错|为什么错|夹逼/.test(text)) {
      const weak = persona?.weak_points?.[0];
      return {
        text: weak
          ? `你最近比较容易卡在「${weak}」。近 ${attempts.length} 次作答里做对了 ${passed} 次。建议先针对这个点做 1–2 道基础题。`
          : "可以先打开学习轨迹，看最近错在哪一类。",
        options: [
          { label: "打开学习轨迹", path: "/trace" },
          { label: "进入练习", path: "/practice" },
        ],
      };
    }
    if (/进度|差多少|跟课/.test(text)) {
      return {
        text: persona?.semester
          ? `你现在的状态是：${persona.semester}。本阶段重点是「${persona.focus}」。`
          : `当前场景是${setup.mode === "final_review" ? "期末复习" : "跟课补漏"}，每日预算 ${setup.dailyMinutes} 分钟。`,
        options: [
          { label: "查看计划", path: "/plan" },
          { label: "查看轨迹", path: "/trace" },
        ],
      };
    }
    return {
      text: [
        "我没完全听懂这句。你可以这样问我：",
        "· 「5x 的导数是什么」「极限怎么求」——做题导学",
        "· 「今晚时间不够」「今天该练什么」——计划安排",
        "· 「这题是不是漏了假设」「帮我错因复盘」——质疑/复盘",
        "· 「打开极限资料」「看待办」——资料与黑板",
        planStatus === "conflict"
          ? "另外：今晚安排可能超时，建议先去计划页做个选择。"
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      options: [
        { label: "查看当前计划", path: "/plan" },
        { label: "进入练习", path: "/practice" },
        { label: "发起质疑示例", path: "/practice" },
      ],
    };
  };

  const send = (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || thinking) return;
    setMessages((current) => [
      ...current,
      {
        id: `user_${Date.now()}`,
        role: "user",
        text,
        time: nowTime(),
      },
    ]);
    setInput("");
    setThinking(true);
    void (async () => {
      try {
        const fromAgent = await agentReply(text);
        const fromSolve = fromAgent ? null : await solveReply(text);
        const response = fromAgent || fromSolve || reply(text);
        setMessages((current) => [
          ...current,
          {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            text: response.text,
            time: nowTime(),
            options: response.options,
          },
        ]);
      } catch (error) {
        const fallback = (await solveReply(text).catch(() => null)) || reply(text);
        setMessages((current) => [
          ...current,
          {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            text: `${fallback.text}\n（智能服务暂不可用：${agentErrorMessage(error)}）`,
            time: nowTime(),
            options: fallback.options,
          },
        ]);
        message.warning(agentErrorMessage(error));
      } finally {
        setThinking(false);
      }
    })();
  };

  const quickAsks =
    persona?.quick_asks?.length
      ? [
          ...persona.quick_asks.slice(0, 2),
          "这题怎么求导数",
          "今晚练什么",
          "打开极限资料",
          "这题是不是漏了假设？",
        ]
      : [
          "这题怎么求导数",
          "今晚练什么",
          "打开极限资料",
          "今晚时间不够怎么办",
          "这题是不是漏了假设？",
          "帮我做一次错因复盘",
        ];

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">学习对话</p>
          <h1>
            {persona?.real_name
              ? `和知序继续聊 · ${persona.real_name}`
              : "和知序聊聊今晚怎么学"}
          </h1>
          <p className="page-intro__description">
            下面保留了你和助手刚才的交流。可以接着问，也可以点快捷问题继续。
          </p>
        </div>
        <Tag color="green">{messages.filter((m) => m.role === "user").length} 轮提问</Tag>
      </section>

      <section className="chat-page">
        <Card
          className="chat-panel"
          title={
            <Space>
              <Avatar className="agent-avatar" icon={<MessageOutlined />} />
              <span>
                知序
                <small>
                  {persona
                    ? `正在查看 ${persona.real_name} 的学习安排`
                    : "已连接你的学习空间"}
                </small>
              </span>
            </Space>
          }
          extra={<Tag color="green">可继续对话</Tag>}
        >
          <div className="chat-thread">
            {messages.map((item) => (
              <div
                className={`chat-message ${item.role === "user" ? "is-user" : ""}`}
                key={item.id}
              >
                <Avatar
                  className="chat-message__avatar"
                  icon={
                    item.role === "assistant" ? (
                      <MessageOutlined />
                    ) : (
                      <UserOutlined />
                    )
                  }
                />
                <div className="chat-message__content">
                  <div className="chat-message__meta">
                    <strong>
                      {item.role === "assistant" ? "知序" : persona?.real_name || "你"}
                    </strong>
                    <span>{item.time}</span>
                  </div>
                  <div className="chat-message__bubble">
                    <MathText text={item.text} />
                  </div>
                  {item.options ? (
                    <div className="chat-message__options">
                      {item.options.map((option) => (
                        <Button
                          key={option.label}
                          onClick={() => go(option.path)}
                        >
                          {option.label}
                          <ArrowRightOutlined />
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {thinking ? (
              <div className="chat-message">
                <Avatar
                  className="chat-message__avatar"
                  icon={<MessageOutlined />}
                />
                <div className="chat-message__bubble typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
            <div ref={threadEnd} />
          </div>

          <div className="chat-quick-row">
            {quickAsks.map((ask) => (
              <Button key={ask} size="small" onClick={() => send(ask)}>
                {ask}
              </Button>
            ))}
          </div>

          <div className="chat-composer">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 4 }}
              value={input}
              placeholder="接着问，例如：那我现在先做哪一题？"
              onChange={(event) => setInput(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={thinking || !input.trim()}
              onClick={() => send()}
            >
              发送
            </Button>
          </div>
        </Card>

        <aside className="chat-context">
          <Card title="当前学习状态">
            <div className="context-list">
              <div>
                <span>课程</span>
                <strong>
                  {persona?.course ||
                    (setup.subject === "physics" ? "大学物理" : "高等数学")}
                </strong>
              </div>
              <div>
                <span>场景</span>
                <strong>
                  {setup.mode === "final_review" ? "期末复习" : "跟课补漏"}
                </strong>
              </div>
              <div>
                <span>对话轮次</span>
                <strong>{messages.filter((m) => m.role === "user").length} 轮</strong>
              </div>
              <div>
                <span>待处理</span>
                <strong>
                  {blackboard.filter((entry) => entry.status === "open").length} 条
                </strong>
              </div>
            </div>
          </Card>
          <Card title="使用说明">
            <p className="context-note">
              对话给出的是建议。真正改写学习计划，需要你在计划页确认之后才会生效。
            </p>
          </Card>
        </aside>
      </section>

      <NextStepCard
        eyebrow="下一步"
        title="把今晚的决定写进学习计划"
        description="确认每日时间和任务取舍后，再去练习中心做题。"
        label="进入学习计划"
        to="/plan"
        icon={<MessageOutlined />}
      />
    </div>
  );
}

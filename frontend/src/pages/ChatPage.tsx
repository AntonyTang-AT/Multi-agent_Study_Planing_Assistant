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
import { NextStepCard } from "../components/NextStepCard";
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

  const go = (path: string) =>
    navigate(demoMode ? `${path}?demo=1` : path);

  const agentReply = async (
    text: string,
  ): Promise<{ text: string; options?: ChatOption[] } | null> => {
    if (/质疑|假设|遗漏条件|定义域|单侧/.test(text)) {
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

  const reply = (text: string) => {
    const openConflict = blackboard.find(
      (entry) => entry.type === "conflict" && entry.status === "open",
    );
    const openIntervention = blackboard.find(
      (entry) => entry.type === "intervention" && entry.status === "open",
    );
    const passed = attempts.filter((a) => a.is_correct === true).length;

    if (/冲突|不够|超时|时间不够|今晚|证明/.test(text)) {
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
    if (/错|摩擦|夹逼|斜面|正确率|薄弱/.test(text)) {
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
    if (/题|练习|安排|明日|今天该/.test(text)) {
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
      text:
        planStatus === "conflict"
          ? "今晚安排可能超时，建议先去计划页做个选择，再继续学习。"
          : "我可以继续帮你看计划、错因和下一步。直接说今晚还剩多少时间，或你卡在哪一题。",
      options: [
        { label: "查看当前计划", path: "/plan" },
        { label: "查看学习轨迹", path: "/trace" },
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
        const response = fromAgent || reply(text);
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
        const fallback = reply(text);
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
          ...persona.quick_asks.slice(0, 3),
          "这题是不是漏了假设？",
          "帮我做一次错因复盘",
        ]
      : [
          "今晚时间不够怎么办",
          "今天该练什么",
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
                  <div className="chat-message__bubble">{item.text}</div>
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

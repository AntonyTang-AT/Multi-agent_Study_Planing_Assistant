import {
  ArrowRightOutlined,
  MessageOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Card, Input, Space, Tag } from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { NextStepCard } from "../components/NextStepCard";
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
  const plan = useLearningStore((state) => state.plan);
  const blackboard = useLearningStore((state) => state.blackboard);
  const setup = useLearningStore((state) => state.setup);
  const persona = useLearningStore((state) => state.persona);
  const planStatus = useLearningStore((state) => state.planStatus);
  const attempts = useLearningStore((state) => state.attempts);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number | null>(null);
  const demoMode = searchParams.get("demo") === "1";
  const hydratedUserId = useLearningStore((state) => state.hydratedUserId);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    const greeting =
      persona?.chat_greeting ||
      "你好。告诉我今晚想复习什么、还剩多少时间，我可以帮你对照当前计划给建议。";
    const options: ChatOption[] = [
      { label: "查看学习计划", path: "/plan" },
      { label: "去做一题", path: "/practice" },
      { label: "看待办提醒", path: "/blackboard" },
    ];
    setMessages([
      {
        id: `welcome_${hydratedUserId || "guest"}`,
        role: "assistant",
        text: greeting,
        time: nowTime(),
        options,
      },
    ]);
  }, [hydratedUserId, persona?.chat_greeting]);

  const go = (path: string) =>
    navigate(demoMode ? `${path}?demo=1` : path);

  const reply = (text: string) => {
    const openConflict = blackboard.find(
      (entry) => entry.type === "conflict" && entry.status === "open",
    );
    const openIntervention = blackboard.find(
      (entry) => entry.type === "intervention" && entry.status === "open",
    );
    const passed = attempts.filter((a) => a.is_correct === true).length;

    if (/冲突|不够|超时|时间不够|今晚/.test(text)) {
      return {
        text: openConflict
          ? `${openConflict.summary}。你可以选择多挤一点时间、先降低今晚难度，或把难点挪到周末。改完后计划会按你的选择重排。`
          : plan
            ? "当前计划时间是够用的，没有需要立刻改的超时项。你可以继续练习，或去轨迹页看正确率。"
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
          ? `${openIntervention.summary}。今天最少完成热身即可，不必一次补完全部进度。`
          : "如果你最近容易中断，可以把单次任务压到 15–20 分钟，先恢复连续打卡。",
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
          ? `你最近比较容易卡在「${weak}」。近 ${attempts.length} 次作答里做对了 ${passed} 次。建议先针对这个点做 1–2 道基础题，再回到综合题。`
          : "可以先打开学习轨迹，看最近错在哪一类，再决定今晚练什么。",
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
          ? `建议先做：Day ${nextTask.day}「${nextTask.action}${nextTask.object}」，大约 ${nextTask.minutes} 分钟。完成标准：${nextTask.completion_criteria}`
          : "当前没有待做任务，可以去练习中心自由练一题，或重新生成计划。",
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
      text: planStatus === "conflict"
        ? "今晚安排可能超时，建议先去计划页做个选择，再继续学习。"
        : "我可以帮你看计划、错因和下一步该练什么。直接说今晚还剩多少时间，或你卡在哪一题。",
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
    timer.current = window.setTimeout(() => {
      const response = reply(text);
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
      setThinking(false);
    }, 520);
  };

  const quickAsks =
    persona?.quick_asks?.length
      ? persona.quick_asks
      : ["今晚时间不够怎么办", "今天该练什么", "最近正确率怎么样", "我哪里容易错"];

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">学习对话</p>
          <h1>和知序聊聊今晚怎么学</h1>
          <p className="page-intro__description">
            结合你当前的计划、作答和待办，给出可执行的下一步。重要调整仍需要你确认。
          </p>
        </div>
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
          extra={<Tag color="green">建议供参考</Tag>}
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
                      {item.role === "assistant" ? "知序" : "你"}
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
              placeholder="例如：今晚只剩 20 分钟，先看哪一块？"
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
                <strong>{persona?.course || (setup.subject === "physics" ? "大学物理" : "高等数学")}</strong>
              </div>
              <div>
                <span>场景</span>
                <strong>{setup.mode === "final_review" ? "期末复习" : "跟课补漏"}</strong>
              </div>
              <div>
                <span>每日时间</span>
                <strong>{setup.dailyMinutes} 分钟</strong>
              </div>
              <div>
                <span>计划</span>
                <strong>
                  {planStatus === "conflict"
                    ? "待调整"
                    : plan
                      ? "进行中"
                      : "未开始"}
                </strong>
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
        title="把今晚的约束写进学习计划"
        description="确认每日时间和任务取舍后，后续练习会按新的安排推进。"
        label="进入学习计划"
        to="/plan"
        icon={<MessageOutlined />}
      />
    </div>
  );
}

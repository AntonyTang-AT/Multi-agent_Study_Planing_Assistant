import {
  ArrowRightOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Card, Input, Space, Tag } from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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

const initialMessages: ChatMessage[] = [
  {
    id: "msg_welcome",
    role: "assistant",
    text: "晚上好，我读取了当前计划和共享黑板。你可以直接说学习目标或约束；我会把事实、证据和需要你决定的选项分开呈现。",
    time: "19:42",
    options: [
      { label: "检查计划冲突", path: "/plan" },
      { label: "打开一题练习", path: "/practice" },
      { label: "查看共享黑板", path: "/blackboard" },
    ],
  },
];

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
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number | null>(null);
  const demoMode = searchParams.get("demo") === "1";

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const go = (path: string) =>
    navigate(demoMode ? `${path}?demo=1` : path);

  const reply = (text: string) => {
    if (/冲突|计划|预算/.test(text)) {
      const openConflict = blackboard.find(
        (entry) => entry.type === "conflict" && entry.status === "open",
      );
      return {
        text: openConflict
          ? `计划审计发现「${openConflict.summary}」。硬约束不能被静默放宽，请到计划页选择延长时间、降低深度或调整目标。`
          : plan
            ? "当前计划已通过审计，没有待裁决冲突。可以继续练习或查看学习轨迹。"
            : "当前还没有计划。先到首页设定考试日或当前章节，再生成审计计划。",
        options: [
          { label: plan ? "打开计划" : "去设定场景", path: plan ? "/plan" : "/" },
          { label: "查看黑板证据", path: "/blackboard" },
        ],
      };
    }
    if (/负荷|累|中断|动机/.test(text)) {
      return {
        text: "最近两次任务在进入综合题前中断。系统建议先完成一道 6 分钟基础题，再回到原计划；不会自动修改任务，决定权仍在你。",
        options: [
          { label: "查看主动干预", path: "/blackboard" },
          { label: "去练习基础题", path: "/practice" },
        ],
      };
    }
    if (/题|练习|夹逼|极限/.test(text)) {
      return {
        text: "已绑定「极限计算」练习。题目答案会先经过计算检验；若校验失败，只展示提示和审计轨迹，不展示未确认答案。",
        options: [{ label: "进入练习", path: "/practice" }],
      };
    }
    if (/时间|分钟|明晚|调整/.test(text)) {
      return {
        text: `当前每日预算是 ${setup.dailyMinutes} 分钟。如果明晚只有 20 分钟，建议保留概念回想和基础题，把综合任务延后；需要你在计划页确认后才会重排。`,
        options: [{ label: "去计划页裁决", path: "/plan" }],
      };
    }
    return {
      text: "我理解你的目标。为了避免凭空判断，我会先读取计划、轨迹与黑板中的开放条目，再把可确认事实和需要你决定的选项分开呈现。",
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
    }, 620);
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">Chat · 主 Agent 唯一用户接口</p>
          <h1>学习对话</h1>
          <p className="page-intro__description">
            自然语言进入主 Agent；复杂结论通过结构化选项交还用户，所有持久化动作仍由 backend 完成。
          </p>
        </div>
        <Tag color="green">user_options 可见</Tag>
      </section>

      <section className="chat-page">
        <Card
          className="chat-panel"
          title={
            <Space>
              <Avatar className="agent-avatar" icon={<RobotOutlined />} />
              <span>
                知序学习助手
                <small>主 Agent · 已读取当前计划与黑板</small>
              </span>
            </Space>
          }
          extra={<Tag color="green">用户裁决权保留</Tag>}
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
                      <RobotOutlined />
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
                  icon={<RobotOutlined />}
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
            {[
              "检查当前计划冲突",
              "最近学习负荷怎么样",
              "给我一道极限基础题",
              "明晚只有 20 分钟",
            ].map((prompt) => (
              <Button key={prompt} size="small" onClick={() => send(prompt)}>
                {prompt}
              </Button>
            ))}
          </div>

          <div className="chat-composer">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 4 }}
              value={input}
              placeholder="描述学习目标、约束，或直接提问..."
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
          <Card title="当前上下文">
            <div className="context-list">
              <div><span>学习场景</span><strong>{setup.mode === "final_review" ? "期末复习" : "跟课补漏"}</strong></div>
              <div><span>学科</span><strong>{setup.subject === "math" ? "高等数学" : "大学物理"}</strong></div>
              <div><span>每日预算</span><strong>{setup.dailyMinutes} 分钟</strong></div>
              <div><span>计划状态</span><strong>{plan ? "已生成" : "未生成"}</strong></div>
              <div><span>待裁决项</span><strong>{blackboard.filter((entry) => entry.status === "open").length} 条</strong></div>
            </div>
          </Card>
          <Card title="边界说明">
            <p className="context-note">
              对话不会直接修改计划。Agent 先写黑板并返回 user_options，用户确认后才进入持久化路径。
            </p>
          </Card>
        </aside>
      </section>
    </div>
  );
}

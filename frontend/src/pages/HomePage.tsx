import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  FormOutlined,
  MessageOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag } from "antd";
import { Link } from "react-router-dom";

const modules = [
  {
    to: "/chat",
    title: "学习对话",
    description: "承接目标、约束与结构化 user_options",
    icon: <MessageOutlined />,
    tone: "green",
  },
  {
    to: "/plan",
    title: "学习计划",
    description: "展示计划审计、冲突与用户裁决",
    icon: <CalendarOutlined />,
    tone: "orange",
  },
  {
    to: "/practice",
    title: "练习中心",
    description: "承载作答、校验通过、提示与弃答",
    icon: <FormOutlined />,
    tone: "blue",
  },
  {
    to: "/materials",
    title: "学习资料",
    description: "按学科、章节与场景标签浏览",
    icon: <BookOutlined />,
    tone: "amber",
  },
  {
    to: "/blackboard",
    title: "共享黑板",
    description: "让质疑、冲突和干预过程可见",
    icon: <ProjectOutlined />,
    tone: "red",
  },
] as const;

export function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">F1 · 基础工程与路由布局</p>
          <h1>
            把学习目标，
            <br />
            变成<em>可审计</em>的计划。
          </h1>
          <p>
            知序学习助手的前端基础壳已经就绪。系统会审计计划、校验答案，并把冲突与质疑交给用户裁决。
          </p>
          <div className="home-hero__actions">
            <Link to="/plan">
              <Button type="primary" size="large">
                查看计划路由
                <ArrowRightOutlined />
              </Button>
            </Link>
            <Link to="/blackboard">
              <Button size="large">查看共享黑板</Button>
            </Link>
          </div>
        </div>

        <aside className="foundation-status" aria-label="F1 完成状态">
          <div className="foundation-status__head">
            <span className="foundation-status__icon">
              <SafetyCertificateOutlined />
            </span>
            <div>
              <span>FRONTEND FOUNDATION</span>
              <strong>基础工程已就绪</strong>
            </div>
          </div>
          <div className="foundation-status__list">
            <div>
              <CheckCircleFilled />
              <span>React 18 + TypeScript 工程</span>
            </div>
            <div>
              <CheckCircleFilled />
              <span>Ant Design 顶栏与内容容器</span>
            </div>
            <div>
              <CheckCircleFilled />
              <span>6 个业务路由已注册</span>
            </div>
            <div>
              <CheckCircleFilled />
              <span>API / Agent 合同类型初版</span>
            </div>
          </div>
          <div className="foundation-status__footer">
            <Tag bordered={false}>VITE_USE_MOCK=true</Tag>
            <span>等待 F2 接入</span>
          </div>
        </aside>
      </section>

      <section className="module-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Application Shell</p>
            <h2>业务模块入口</h2>
          </div>
          <span>顶部导航或卡片均可切换路由</span>
        </div>

        <div className="module-grid">
          {modules.map((module) => (
            <Link className="module-link" to={module.to} key={module.to}>
              <Card className="module-card" bordered>
                <span className={`module-card__icon module-card__icon--${module.tone}`}>
                  {module.icon}
                </span>
                <span className="module-card__phase">路由占位</span>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <span className="module-card__action">
                  进入模块
                  <ArrowRightOutlined />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="contract-band">
        <div>
          <p className="eyebrow">Next Milestone · F2</p>
          <h2>Mock 主路径将直接建立在当前路由之上。</h2>
          <p>场景向导 → 计划冲突选项 → 共享黑板 → 练习 passed / abstain，不修改基础布局与导航。</p>
        </div>
        <div className="contract-band__steps" aria-label="F2 接入顺序">
          <span>01 场景</span>
          <span>02 冲突</span>
          <span>03 裁决</span>
          <span>04 练习</span>
        </div>
      </section>
    </div>
  );
}

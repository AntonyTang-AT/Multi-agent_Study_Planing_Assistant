import {
  AppstoreOutlined,
  BookOutlined,
  CalendarOutlined,
  CloudServerOutlined,
  FormOutlined,
  HomeOutlined,
  LineChartOutlined,
  MenuOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Tag, Tooltip } from "antd";
import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { isMockMode } from "../../api/client";
import { createSession } from "../../api/backend";
import { DemoBar } from "../DemoBar";
import { LearningJourney } from "../LearningJourney";

const navigation = [
  { to: "/", label: "首页", icon: <HomeOutlined /> },
  { to: "/chat", label: "学习对话", icon: <MessageOutlined /> },
  { to: "/plan", label: "学习计划", icon: <CalendarOutlined /> },
  { to: "/practice", label: "练习", icon: <FormOutlined /> },
  { to: "/materials", label: "资料", icon: <BookOutlined /> },
  { to: "/trace", label: "轨迹", icon: <LineChartOutlined /> },
  { to: "/blackboard", label: "黑板", icon: <ProjectOutlined /> },
];

function Brand() {
  return (
    <NavLink className="brand" to="/" aria-label="知序学习助手首页">
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M7.5 10.5 16 5l8.5 5.5v11L16 27l-8.5-5.5v-11Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m11.5 12 4.5 2.8 4.5-2.8M16 14.8V22"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span className="brand__copy">
        <strong>知序</strong>
        <small>LEARNING STUDIO</small>
      </span>
    </NavLink>
  );
}

function Navigation({
  mobile = false,
  demo = false,
}: {
  mobile?: boolean;
  demo?: boolean;
}) {
  return (
    <nav className={mobile ? "nav nav--mobile" : "nav"} aria-label="主导航">
      {navigation.map((item) => (
        <NavLink
          key={item.to}
          className={({ isActive }) => `nav__item${isActive ? " is-active" : ""}`}
          end={item.to === "/"}
          to={demo ? `${item.to}?demo=1` : item.to}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demoMode = searchParams.get("demo") === "1";

  useEffect(() => {
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    void createSession().catch(() => {
      // The interceptor already surfaced the service error.
    });
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__left">
          <Brand />
          <span className="topbar__divider" aria-hidden="true" />
          <Navigation demo={demoMode} />
        </div>

        <div className="topbar__actions">
          <Tooltip title="前端只请求 backend，不直连 Agent">
            <Tag className="status-tag" icon={<CloudServerOutlined />}>
              {isMockMode() ? "Mock 模式" : "API 模式"}
            </Tag>
          </Tooltip>
          <Tag className="phase-tag">MVP · 全链路</Tag>
          <Tooltip title="打开 3 分钟演示控制条">
            <Button
              className="demo-mode-button"
              type={searchParams.get("demo") === "1" ? "primary" : "default"}
              icon={<PlayCircleOutlined />}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("demo", "1");
                navigate({ pathname: "/", search: `?${next.toString()}` });
              }}
            >
              <span className="demo-mode-label">演示</span>
            </Button>
          </Tooltip>
          <Button
            className="mobile-menu-button"
            type="text"
            icon={<MenuOutlined />}
            aria-label="打开导航"
            onClick={() => setMobileNavOpen(true)}
          />
        </div>
      </header>

      <LearningJourney />

      <main className="app-content">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>知序学习助手 · Web Frontend</span>
        <span className="app-footer__meta">
          <AppstoreOutlined /> React 18 · Vite · TypeScript · Ant Design 5
        </span>
      </footer>
      <DemoBar />

      <Drawer
        className="mobile-drawer"
        title={<Brand />}
        placement="right"
        width={300}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      >
        <Navigation mobile demo={demoMode} />
        <div className="mobile-drawer__note">
          <strong>完整学习闭环</strong>
          <p>场景、计划、练习、轨迹与黑板共享同一份状态；智能不可用时仍保留传统学习路径。</p>
        </div>
      </Drawer>
    </div>
  );
}

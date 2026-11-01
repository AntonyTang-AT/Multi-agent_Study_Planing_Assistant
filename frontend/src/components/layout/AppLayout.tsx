import {
  AppstoreOutlined,
  BookOutlined,
  CalendarOutlined,
  CloudServerOutlined,
  FormOutlined,
  HomeOutlined,
  MenuOutlined,
  MessageOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Tag, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { isMockMode } from "../../api/client";

const navigation = [
  { to: "/", label: "首页", icon: <HomeOutlined /> },
  { to: "/chat", label: "学习对话", icon: <MessageOutlined /> },
  { to: "/plan", label: "学习计划", icon: <CalendarOutlined /> },
  { to: "/practice", label: "练习", icon: <FormOutlined /> },
  { to: "/materials", label: "资料", icon: <BookOutlined /> },
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

function Navigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav className={mobile ? "nav nav--mobile" : "nav"} aria-label="主导航">
      {navigation.map((item) => (
        <NavLink
          key={item.to}
          className={({ isActive }) => `nav__item${isActive ? " is-active" : ""}`}
          end={item.to === "/"}
          to={item.to}
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

  useEffect(() => {
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__left">
          <Brand />
          <span className="topbar__divider" aria-hidden="true" />
          <Navigation />
        </div>

        <div className="topbar__actions">
          <Tooltip title="前端只请求 backend，不直连 Agent">
            <Tag className="status-tag" icon={<CloudServerOutlined />}>
              {isMockMode() ? "Mock 模式" : "API 模式"}
            </Tag>
          </Tooltip>
          <Tag className="phase-tag">F1 基础壳</Tag>
          <Button
            className="mobile-menu-button"
            type="text"
            icon={<MenuOutlined />}
            aria-label="打开导航"
            onClick={() => setMobileNavOpen(true)}
          />
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>知序学习助手 · Web Frontend</span>
        <span className="app-footer__meta">
          <AppstoreOutlined /> React 18 · Vite · TypeScript · Ant Design 5
        </span>
      </footer>

      <Drawer
        className="mobile-drawer"
        title={<Brand />}
        placement="right"
        width={300}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      >
        <Navigation mobile />
        <div className="mobile-drawer__note">
          <strong>F1 基础工程</strong>
          <p>F2 将在此壳内接入场景向导、冲突裁决、黑板与练习 Mock 主路径。</p>
        </div>
      </Drawer>
    </div>
  );
}

import {
  AppstoreOutlined,
  BookOutlined,
  CalendarOutlined,
  CloudServerOutlined,
  FormOutlined,
  HomeOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MenuOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Drawer, Dropdown, Tag, Tooltip, message } from "antd";
import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { isMockMode } from "../../api/client";
import { useAuthStore } from "../../stores/useAuthStore";
import { useLearningStore } from "../../stores/useLearningStore";
import { DemoBar } from "../DemoBar";
import { DemoGuide } from "../DemoGuide";
import { LearningJourney } from "../LearningJourney";

const navigation = [
  { to: "/", label: "首页", icon: <HomeOutlined /> },
  { to: "/chat", label: "学习对话", icon: <MessageOutlined /> },
  { to: "/plan", label: "学习计划", icon: <CalendarOutlined /> },
  { to: "/practice", label: "练习", icon: <FormOutlined /> },
  { to: "/materials", label: "资料", icon: <BookOutlined /> },
  { to: "/trace", label: "轨迹", icon: <LineChartOutlined /> },
  { to: "/blackboard", label: "提醒", icon: <ProjectOutlined /> },
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
  const [guideOpen, setGuideOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demoMode = searchParams.get("demo") === "1";
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const hydrateForUser = useLearningStore((s) => s.hydrateForUser);
  const resetDemo = useLearningStore((s) => s.resetDemo);

  useEffect(() => {
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    if (user?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [user?.role, navigate]);

  useEffect(() => {
    void hydrateForUser(user?.id ?? null);
  }, [user?.id, hydrateForUser]);

  const enableDemo = () => {
    if (!user) {
      message.info("请先登录，再打开快捷体验");
      navigate("/login?next=" + encodeURIComponent("/?demo=1"));
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set("demo", "1");
    navigate({ pathname: location.pathname || "/", search: `?${next.toString()}` });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__left">
          <Brand />
          <span className="topbar__divider" aria-hidden="true" />
          <Navigation demo={demoMode} />
        </div>

        <div className="topbar__actions">
          <Tooltip title={isMockMode() ? "当前为本地预览数据" : "已连接学习服务"}>
            <Tag className="status-tag" icon={<CloudServerOutlined />}>
              {isMockMode() ? "本地预览" : "已连接"}
            </Tag>
          </Tooltip>
          <Tooltip title="使用说明">
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              aria-label="使用说明"
              onClick={() => setGuideOpen(true)}
            />
          </Tooltip>
          <Tooltip title="打开快捷体验条（可选）">
            <Button
              className="demo-mode-button"
              type={demoMode ? "primary" : "default"}
              icon={<PlayCircleOutlined />}
              onClick={enableDemo}
            >
              <span className="demo-mode-label">体验</span>
            </Button>
          </Tooltip>
          {user ? (
            <Dropdown
              menu={{
                items: [
                  {
                    key: "account",
                    icon: <UserOutlined />,
                    label: "账号设置",
                    onClick: () => navigate("/account"),
                  },
                  ...(user.role === "admin"
                    ? [
                        {
                          key: "admin",
                          label: "管理看板",
                          onClick: () => navigate("/admin"),
                        },
                      ]
                    : []),
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: "退出登录",
                    onClick: () => {
                      clearAuth();
                      resetDemo();
                      void hydrateForUser(null);
                      navigate("/login", { replace: true });
                    },
                  },
                ],
              }}
            >
              <Button className="auth-user-button" icon={<UserOutlined />}>
                {user.display_name}
              </Button>
            </Dropdown>
          ) : (
            <Button type="primary" onClick={() => navigate("/login")}>
              登录
            </Button>
          )}
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
        <span>知序学习助手</span>
        <span className="app-footer__meta">
          <AppstoreOutlined /> 期末复习 · 跟课补漏
        </span>
      </footer>
      <DemoBar />
      <DemoGuide open={guideOpen} onClose={() => setGuideOpen(false)} />

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
          <strong>完整学习路径</strong>
          <p>
            计划、练习、轨迹与提醒相互联动；网络异常时仍可浏览资料与本地安排。
          </p>
        </div>
      </Drawer>
    </div>
  );
}

import {
  BarChartOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Tag } from "antd";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../stores/useAuthStore";
import { useLearningStore } from "../../stores/useLearningStore";

export function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const resetDemo = useLearningStore((s) => s.resetDemo);
  const hydrateForUser = useLearningStore((s) => s.hydrateForUser);

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar__brand">
          <span className="admin-topbar__mark" aria-hidden="true" />
          <div>
            <strong>知序 · 教学管理</strong>
            <small>学习数据看板</small>
          </div>
        </div>
        <nav className="admin-topbar__nav">
          <NavLink className="admin-nav-link is-active" to="/admin">
            <BarChartOutlined />
            数据总览
          </NavLink>
          <span className="admin-nav-link is-muted">
            <TeamOutlined />
            学习者
          </span>
        </nav>
        <div className="admin-topbar__actions">
          <Tag className="admin-role-tag">管理员</Tag>
          <Dropdown
            menu={{
              items: [
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
            <Button icon={<UserOutlined />}>
              {user?.display_name || "管理员"}
            </Button>
          </Dropdown>
        </div>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

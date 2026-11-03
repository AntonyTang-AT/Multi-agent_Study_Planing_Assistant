import { Button, Card, Form, Input, Space, Tag, Typography, message } from "antd";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";

import { login } from "../api/auth";
import { DEMO_ACCOUNTS, useAuthStore } from "../stores/useAuthStore";

export function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values.username.trim(), values.password);
      setAuth(res.access_token, res.user);
      message.success(`欢迎，${res.user.display_name}`);
      if (res.user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate(next, { replace: true });
      }
    } catch {
      // toast handled by interceptor / keep form
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__panel">
        <div className="auth-page__brand">
          <strong>知序</strong>
          <span>LEARNING STUDIO</span>
        </div>
        <Typography.Title level={2}>登录学习工作台</Typography.Title>
        <Typography.Paragraph type="secondary">
          半正式账号体系：学生数据按用户隔离；管理员可查看全站统计。也可使用下方演示账号一键填入。
        </Typography.Paragraph>

        <Card className="auth-card" bordered={false}>
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: "请输入用户名" }]}
            >
              <Input size="large" placeholder="math / phys / catch / admin" autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password
                size="large"
                placeholder="密码"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登录
            </Button>
          </Form>

          <div className="auth-demo-chips">
            <Typography.Text type="secondary">演示账号快捷填入</Typography.Text>
            <Space wrap size={[8, 8]}>
              {DEMO_ACCOUNTS.map((account) => (
                <Tag
                  key={account.username}
                  className="auth-demo-chip"
                  onClick={() =>
                    form.setFieldsValue({
                      username: account.username,
                      password: account.password,
                    })
                  }
                >
                  {account.label}
                  <small>{account.hint}</small>
                </Tag>
              ))}
            </Space>
          </div>
        </Card>

        <div className="auth-page__footer">
          还没有账号？ <Link to="/register">注册学生账号</Link>
        </div>
      </div>
    </div>
  );
}

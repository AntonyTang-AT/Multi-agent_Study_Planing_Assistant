import { Button, Card, Form, Input, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { register } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";

export function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onFinish = async (values: {
    username: string;
    password: string;
    display_name?: string;
  }) => {
    setLoading(true);
    try {
      const res = await register(
        values.username.trim(),
        values.password,
        values.display_name?.trim(),
      );
      setAuth(res.access_token, res.user);
      message.success("注册成功");
      navigate("/", { replace: true });
    } catch {
      // interceptor toast
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
        <Typography.Title level={2}>注册学生账号</Typography.Title>
        <Typography.Paragraph type="secondary">
          仅开放学生角色自助注册。管理员账号由种子预置，不可在此创建。
        </Typography.Paragraph>
        <Card className="auth-card" bordered={false}>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label="用户名"
              name="username"
              rules={[
                { required: true, message: "请输入用户名" },
                { min: 3, message: "至少 3 个字符" },
              ]}
            >
              <Input size="large" autoComplete="username" />
            </Form.Item>
            <Form.Item label="显示名称" name="display_name">
              <Input size="large" placeholder="可选" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: "请输入密码" },
                { min: 6, message: "至少 6 位" },
              ]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              创建账号
            </Button>
          </Form>
        </Card>
        <div className="auth-page__footer">
          已有账号？ <Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  );
}

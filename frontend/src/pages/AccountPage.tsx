import { Button, Card, Form, Input, Typography, message } from "antd";
import { useState } from "react";

import { changePassword } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";

export function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const onFinish = async (values: {
    old_password: string;
    new_password: string;
  }) => {
    setLoading(true);
    try {
      await changePassword(values.old_password, values.new_password);
      message.success("密码已更新");
    } catch {
      // toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <header className="page-header">
        <Typography.Title level={2}>账号</Typography.Title>
        <Typography.Paragraph type="secondary">
          查看当前登录身份，并修改密码。个人计划 / 黑板 / 轨迹按用户隔离存储。
        </Typography.Paragraph>
      </header>

      <Card className="surface-card" title="基本信息">
        <p>
          <strong>用户名</strong>：{user.username || "—"}
        </p>
        <p>
          <strong>显示名</strong>：{user.display_name}
        </p>
        <p>
          <strong>角色</strong>：{user.role}
        </p>
        <p>
          <strong>用户 ID</strong>：{user.id}
        </p>
      </Card>

      <Card className="surface-card" title="修改密码">
        <Form layout="vertical" onFinish={onFinish} style={{ maxWidth: 420 }}>
          <Form.Item
            label="原密码"
            name="old_password"
            rules={[{ required: true, message: "请输入原密码" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="new_password"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, message: "至少 6 位" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存新密码
          </Button>
        </Form>
      </Card>
    </div>
  );
}

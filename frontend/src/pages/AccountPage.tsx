import { Button, Card, Form, Input, Tag, Typography, message } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";

import { changePassword } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";
import { useLearningStore } from "../stores/useLearningStore";

const scenarioLabel: Record<string, string> = {
  final_review: "期末复习",
  catch_up: "跟课补漏",
};

export function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const plan = useLearningStore((s) => s.plan);
  const planStatus = useLearningStore((s) => s.planStatus);
  const setup = useLearningStore((s) => s.setup);
  const attempts = useLearningStore((s) => s.attempts);
  const blackboard = useLearningStore((s) => s.blackboard);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const openBoard = blackboard.filter((item) => item.status === "open");
  const passed = attempts.filter((item) => item.is_correct === true).length;

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
          当前登录身份与个人学习痕迹。计划 / 黑板 / 轨迹按用户隔离存储。
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

      {user.role !== "admin" ? (
        <Card
          className="surface-card"
          title="本账号学习快照"
          extra={
            <Link to="/plan">
              <Button type="link">查看计划</Button>
            </Link>
          }
        >
          <p>
            <strong>场景</strong>：
            {scenarioLabel[setup.mode] || setup.mode} · {setup.subject} ·{" "}
            {setup.chapter}
          </p>
          <p>
            <strong>计划目标</strong>：{plan?.goal || "尚未生成计划"}
          </p>
          <p>
            <strong>状态</strong>：{" "}
            <Tag color={planStatus === "conflict" ? "orange" : "green"}>
              {planStatus === "conflict"
                ? "冲突待裁决"
                : plan
                  ? "已有计划"
                  : "空"}
            </Tag>
            <Tag>任务 {plan?.tasks.length ?? 0}</Tag>
            <Tag>作答 {attempts.length}</Tag>
            <Tag color="gold">开放黑板 {openBoard.length}</Tag>
          </p>
          <p>
            <strong>作答通过</strong>：{passed} / {attempts.length}
          </p>
          {openBoard[0] ? (
            <p>
              <strong>待处理</strong>：{openBoard[0].summary}
            </p>
          ) : null}
        </Card>
      ) : null}

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
              { min: 4, message: "至少 4 位" },
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

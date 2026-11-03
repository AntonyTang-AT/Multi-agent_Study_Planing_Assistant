import { Button, Card, Form, Input, Tag, Typography, message } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";

import { changePassword } from "../api/auth";
import { useAuthStore } from "../stores/useAuthStore";
import { useLearningStore } from "../stores/useLearningStore";

export function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const plan = useLearningStore((s) => s.plan);
  const planStatus = useLearningStore((s) => s.planStatus);
  const setup = useLearningStore((s) => s.setup);
  const attempts = useLearningStore((s) => s.attempts);
  const blackboard = useLearningStore((s) => s.blackboard);
  const persona = useLearningStore((s) => s.persona);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const openBoard = blackboard.filter((item) => item.status === "open");
  const passed = attempts.filter((item) => item.is_correct === true).length;
  const displayName = persona?.real_name || user.display_name;

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
        <Typography.Title level={2}>我的账号</Typography.Title>
        <Typography.Paragraph type="secondary">
          查看个人学习概况，或修改登录密码。每位同学的计划与作答互相隔离。
        </Typography.Paragraph>
      </header>

      <Card className="surface-card" title="基本信息">
        <p>
          <strong>姓名</strong>：{displayName}
        </p>
        <p>
          <strong>登录名</strong>：{user.username || "—"}
        </p>
        {persona ? (
          <>
            <p>
              <strong>专业班级</strong>：{persona.major}
            </p>
            <p>
              <strong>课程</strong>：{persona.course}
            </p>
            <p>
              <strong>学期状态</strong>：{persona.semester}
            </p>
          </>
        ) : (
          <p>
            <strong>角色</strong>：{user.role === "admin" ? "管理员" : "学生"}
          </p>
        )}
      </Card>

      {user.role !== "admin" ? (
        <Card
          className="surface-card"
          title="个人学习概况"
          extra={
            <Link to="/plan">
              <Button type="link">打开计划</Button>
            </Link>
          }
        >
          <p>
            <strong>当前目标</strong>：{plan?.goal || "尚未生成计划"}
          </p>
          <p>
            <strong>课程进度</strong>：{setup.chapter} · 每日{" "}
            {plan?.daily_minutes_budget ?? setup.dailyMinutes} 分钟
          </p>
          <p>
            <strong>状态</strong>：{" "}
            <Tag color={planStatus === "conflict" ? "orange" : "green"}>
              {planStatus === "conflict"
                ? "今晚安排待调整"
                : plan
                  ? "计划进行中"
                  : "尚未开始"}
            </Tag>
            <Tag>任务 {plan?.tasks.length ?? 0}</Tag>
            <Tag>
              作答 {passed}/{attempts.length}
            </Tag>
            <Tag color="gold">待处理 {openBoard.length}</Tag>
          </p>
          {persona?.focus ? (
            <p>
              <strong>本阶段重点</strong>：{persona.focus}
            </p>
          ) : null}
          {persona?.weak_points?.length ? (
            <p>
              <strong>薄弱点</strong>：{persona.weak_points.join("；")}
            </p>
          ) : null}
          {persona?.materials_focus ? (
            <p>
              <strong>常用资料</strong>：{persona.materials_focus}
            </p>
          ) : null}
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

import { ArrowRightOutlined, CheckCircleFilled } from "@ant-design/icons";
import { Button, Empty, Tag } from "antd";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface PageScaffoldProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  nextSteps: string[];
  actionLabel: string;
  actionPath: string;
}

export function PageScaffold({
  eyebrow,
  title,
  description,
  icon,
  nextSteps,
  actionLabel,
  actionPath,
}: PageScaffoldProps) {
  const navigate = useNavigate();

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-intro__description">{description}</p>
        </div>
        <Tag className="scope-tag">F1 · 路由占位</Tag>
      </section>

      <section className="placeholder-panel">
        <div className="placeholder-panel__icon">{icon}</div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className="placeholder-copy">
              <strong>页面容器已接入，业务模块将在下一里程碑实现</strong>
              <p>当前路由可访问，布局、主题、环境配置与 API 合同均已就绪。</p>
            </div>
          }
        />
        <div className="next-step-list">
          {nextSteps.map((step) => (
            <div className="next-step" key={step}>
              <CheckCircleFilled />
              <span>{step}</span>
            </div>
          ))}
        </div>
        <Button type="primary" onClick={() => navigate(actionPath)}>
          {actionLabel}
          <ArrowRightOutlined />
        </Button>
      </section>
    </div>
  );
}

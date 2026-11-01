import { ArrowRightOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

interface NextStepCardProps {
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  to: string;
  icon: ReactNode;
}

export function NextStepCard({
  eyebrow,
  title,
  description,
  label,
  to,
  icon,
}: NextStepCardProps) {
  const [searchParams] = useSearchParams();
  const target =
    searchParams.get("demo") === "1" ? `${to}?demo=1` : to;

  return (
    <Link className="next-step-card" to={target}>
      <span className="next-step-card__icon">{icon}</span>
      <span className="next-step-card__copy">
        <small>{eyebrow}</small>
        <strong>{title}</strong>
        <p>{description}</p>
      </span>
      <span className="next-step-card__action">
        {label}
        <ArrowRightOutlined />
      </span>
    </Link>
  );
}

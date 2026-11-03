import {
  ArrowRightOutlined,
  BookOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Segmented,
  Space,
  Spin,
  Tag,
} from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { agentErrorMessage } from "../api/ai";
import { fetchMaterials, type MaterialQuery } from "../api/backend";
import { NextStepCard } from "../components/NextStepCard";
import type { Material, Subject } from "../types/api";

type SubjectFilter = "all" | Subject;

const materialKind: Record<string, string> = {
  textbook: "教材",
  courseware: "课件",
  homework: "习题",
  answer_book: "答案",
  textbook_reference: "参考书",
};

export function MaterialsPage() {
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [scenarioTag, setScenarioTag] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const query: MaterialQuery = {
      subject: subject === "all" ? "" : subject,
      scenarioTag: scenarioTag === "all" ? "" : scenarioTag,
      keyword,
    };
    fetchMaterials(query)
      .then((items) => {
        if (active) setMaterials(items);
      })
      .catch((requestError) => {
        if (active) setError(agentErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [keyword, scenarioTag, subject]);

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">学习资料</p>
          <h1>学习资料</h1>
          <p className="page-intro__description">
            按学科、章节与场景标签浏览。只登记来源、页码和可信度，不转载教材正文。
          </p>
        </div>
        <Tag className="scope-tag" icon={<SafetyCertificateOutlined />}>
          来源可追溯
        </Tag>
      </section>

      <Card className="materials-toolbar-card">
        <div className="materials-toolbar">
          <Segmented
            value={subject}
            onChange={(value) => setSubject(value as SubjectFilter)}
            options={[
              { label: "全部学科", value: "all" },
              { label: "高等数学", value: "math" },
              { label: "大学物理", value: "physics" },
            ]}
          />
          <Segmented
            value={scenarioTag}
            onChange={(value) => setScenarioTag(String(value))}
            options={[
              { label: "全部场景", value: "all" },
              { label: "概念", value: "概念" },
              { label: "例题", value: "例题" },
              { label: "跟课", value: "跟课" },
            ]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索标题或章节"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </Card>

      {error ? (
        <Alert
          type="warning"
          showIcon
          message="资料接口暂不可用"
          description={error}
        />
      ) : null}

      <Spin spinning={loading}>
        {materials.length ? (
          <div className="material-grid">
            {materials.map((material) => (
              <Card className="material-card" key={material.material_id}>
                <div className="material-card__head">
                  <span className="material-card__icon">
                    {material.kind === "courseware" ? (
                      <BookOutlined />
                    ) : (
                      <FileTextOutlined />
                    )}
                  </span>
                  <Tag>{materialKind[material.kind] || material.kind}</Tag>
                </div>
                <h2>{material.title}</h2>
                <p>
                  {"summary" in material
                    ? String(material.summary)
                    : "已登记教材元数据与可定位页码。"}
                </p>
                <div className="material-card__tags">
                  <Tag color="blue">{material.subject === "math" ? "高等数学" : "大学物理"}</Tag>
                  <Tag>{material.chapter_id}</Tag>
                  {"tags" in material
                    ? (material.tags as string[]).slice(0, 2).map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))
                    : null}
                </div>
                <div className="material-card__meta">
                  <span>
                    {material.page_range
                      ? `P.${material.page_range[0]}–${material.page_range[1]}`
                      : "元数据索引"}
                  </span>
                  <span>
                    {"credibility" in material
                      ? String(material.credibility)
                      : "已登记"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Empty description="当前筛选下没有资料" />
          </Card>
        )}
      </Spin>

      <Card className="source-note-card">
        <div>
          <p className="eyebrow">使用说明</p>
          <h2>资料用来定位章节与页码。</h2>
          <p>
            这里登记教材、课件和作业的出处与页码，方便对照复习，不转载正文内容。
          </p>
        </div>
        <Space wrap>
          <Tag color="green">来源可追溯</Tag>
          <Tag color="blue">页码定位</Tag>
          <Link to="/practice">
            <Button type="primary">
              去练习
              <ArrowRightOutlined />
            </Button>
          </Link>
        </Space>
      </Card>

      <NextStepCard
        eyebrow="下一步"
        title="对照资料做一题"
        description="选好章节后去练习中心，作答会记入你的学习轨迹。"
        label="进入练习"
        to="/practice"
        icon={<FileTextOutlined />}
      />
    </div>
  );
}

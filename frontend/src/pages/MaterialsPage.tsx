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
import { Link, useSearchParams } from "react-router-dom";

import { agentErrorMessage } from "../api/ai";
import { fetchMaterials, type MaterialQuery } from "../api/backend";
import { NextStepCard } from "../components/NextStepCard";
import { chapterById } from "../data/chapters";
import type { Material, Subject } from "../types/api";

type SubjectFilter = "all" | Subject;
type KindFilter = "all" | Material["kind"];

const materialKind: Record<string, string> = {
  textbook: "教材",
  courseware: "课件",
  homework: "习题",
  answer_book: "答案",
  textbook_reference: "参考书",
};

export function MaterialsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSubject = (searchParams.get("subject") as SubjectFilter) || "all";
  const initialChapter = searchParams.get("chapter") || "";
  const initialKeyword = searchParams.get("q") || "";

  const [subject, setSubject] = useState<SubjectFilter>(
    initialSubject === "math" || initialSubject === "physics"
      ? initialSubject
      : "all",
  );
  const [kind, setKind] = useState<KindFilter>("all");
  const [chapter, setChapter] = useState(initialChapter);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextSubject = searchParams.get("subject");
    const nextChapter = searchParams.get("chapter") || "";
    const nextKeyword = searchParams.get("q") || "";
    if (nextSubject === "math" || nextSubject === "physics") {
      setSubject(nextSubject);
    } else if (!nextSubject) {
      // keep current unless cleared
    }
    setChapter(nextChapter);
    if (nextKeyword) setKeyword(nextKeyword);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const query: MaterialQuery = {
      subject: subject === "all" ? "" : subject,
      chapter: chapter || undefined,
      kind: kind === "all" ? "" : kind,
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
  }, [chapter, keyword, kind, subject]);

  const syncQuery = (next: {
    subject?: SubjectFilter;
    chapter?: string;
    q?: string;
  }) => {
    const params = new URLSearchParams(searchParams);
    if (next.subject != null) {
      if (next.subject === "all") params.delete("subject");
      else params.set("subject", next.subject);
    }
    if (next.chapter != null) {
      if (!next.chapter) params.delete("chapter");
      else params.set("chapter", next.chapter);
    }
    if (next.q != null) {
      if (!next.q) params.delete("q");
      else params.set("q", next.q);
    }
    setSearchParams(params, { replace: true });
  };

  const chapterMeta = chapter ? chapterById(chapter) : undefined;
  const practiceLink = chapter
    ? `/practice?knowledge=${encodeURIComponent(chapter)}`
    : "/practice";

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">学习资料</p>
          <h1>学习资料</h1>
          <p className="page-intro__description">
            按学科、资料类型与关键词浏览。只登记来源、页码和可信度，不转载教材正文。
          </p>
        </div>
        <Tag className="scope-tag" icon={<SafetyCertificateOutlined />}>
          来源可追溯
        </Tag>
      </section>

      {chapterMeta ? (
        <Alert
          type="info"
          showIcon
          message={`正在查看：${chapterMeta.label}`}
          description="来自计划或练习的深链定位。可清空章节筛选以浏览全部资料。"
          action={
            <Button
              size="small"
              onClick={() => {
                setChapter("");
                syncQuery({ chapter: "" });
              }}
            >
              清除章节
            </Button>
          }
        />
      ) : null}

      <Card className="materials-toolbar-card">
        <div className="materials-toolbar">
          <Segmented
            value={subject}
            onChange={(value) => {
              const next = value as SubjectFilter;
              setSubject(next);
              syncQuery({ subject: next });
            }}
            options={[
              { label: "全部学科", value: "all" },
              { label: "高等数学", value: "math" },
              { label: "大学物理", value: "physics" },
            ]}
          />
          <Segmented
            value={kind}
            onChange={(value) => setKind(value as KindFilter)}
            options={[
              { label: "全部类型", value: "all" },
              { label: "教材", value: "textbook" },
              { label: "课件", value: "courseware" },
              { label: "习题", value: "homework" },
            ]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索标题或章节"
            value={keyword}
            onChange={(event) => {
              const value = event.target.value;
              setKeyword(value);
              syncQuery({ q: value });
            }}
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
                  <Tag color="blue">
                    {material.subject === "math" ? "高等数学" : "大学物理"}
                  </Tag>
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
                <div className="material-card__actions">
                  <Link
                    to={`/practice?knowledge=${encodeURIComponent(material.chapter_id)}`}
                  >
                    <Button size="small" type="link">
                      练本章
                    </Button>
                  </Link>
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
          <Link to={practiceLink}>
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
        to={practiceLink}
        icon={<FileTextOutlined />}
      />
    </div>
  );
}

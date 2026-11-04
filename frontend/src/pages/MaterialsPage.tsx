import { MathText } from "../components/MathText";
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
  Collapse,
  Drawer,
  Empty,
  Input,
  Segmented,
  Space,
  Spin,
  Tag,
} from "antd";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiClient } from "../api/client";
import { agentErrorMessage } from "../api/ai";
import {
  fetchChapterGuide,
  fetchMaterials,
  fetchQuestions,
  type MaterialQuery,
} from "../api/backend";
import { NextStepCard } from "../components/NextStepCard";
import { chapterById } from "../data/chapters";
import type { ChapterGuide, Material, Question, Subject } from "../types/api";

type SubjectFilter = "all" | Subject;
type KindFilter = "all" | Material["kind"];

const materialKind: Record<string, string> = {
  textbook: "教材",
  courseware: "课件",
  homework: "习题",
  answer_book: "答案",
  textbook_reference: "参考书",
};

const questionTypeLabel: Record<string, string> = {
  fill: "填空",
  choice: "选择",
  calc: "计算",
  proof: "证明",
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

  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  const [guide, setGuide] = useState<ChapterGuide | null>(null);
  const [samples, setSamples] = useState<Question[]>([]);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!activeMaterial) {
      setGuide(null);
      setSamples([]);
      setGuideError(null);
      return;
    }
    let alive = true;
    const chapterId = activeMaterial.chapter_id;
    setGuideLoading(true);
    setGuideError(null);
    Promise.all([
      fetchChapterGuide(chapterId),
      fetchQuestions({ knowledgeId: chapterId }).catch(() => [] as Question[]),
    ])
      .then(([nextGuide, questions]) => {
        if (!alive) return;
        setGuide(nextGuide);
        setSamples(questions.slice(0, 3));
      })
      .catch((requestError) => {
        if (!alive) return;
        setGuide(null);
        setSamples([]);
        setGuideError(agentErrorMessage(requestError));
      })
      .finally(() => {
        if (alive) setGuideLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activeMaterial]);

  const openFile = async (material: Material, preview: boolean) => {
    setFileLoading(true);
    setFileError(null);
    try {
      const response = await apiClient.get<Blob>(
        `/api/materials/${encodeURIComponent(material.material_id)}/${preview ? "preview" : "download"}`,
        { responseType: "blob", timeout: 90_000 },
      );
      const url = URL.createObjectURL(response.data);
      if (preview) {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = material.file?.split("/").pop() || material.title;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (error) {
      // Axios blob errors must be decoded before displaying the API message.
      let message = "资料暂时无法打开，请稍后重试或下载原件";
      const blob = (error as { response?: { data?: unknown } }).response?.data;
      if (blob instanceof Blob) {
        try {
          message = JSON.parse(await blob.text()).message || message;
        } catch {
          /* keep fallback */
        }
      }
      setFileError(message);
    } finally {
      setFileLoading(false);
    }
  };

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
  const drawerPracticeLink = activeMaterial
    ? `/practice?knowledge=${encodeURIComponent(
        guide?.chapter_id || activeMaterial.chapter_id,
      )}`
    : practiceLink;
  const kindTip =
    guide?.kind_tips?.[activeMaterial?.kind || ""] ||
    guide?.kind_tips?.textbook ||
    "";

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <p className="eyebrow">学习资料</p>
          <h1>学习资料</h1>
          <p className="page-intro__description">
            查看章级导学，预览或下载已部署的资料原件；尚未部署的资料仍可按页码对照阅读。
          </p>
        </div>
        <Tag className="scope-tag" icon={<SafetyCertificateOutlined />}>
          导学自研 · 正文不转载
        </Tag>
      </section>

      {chapter ? (
        <Alert
          type="info"
          showIcon
          message={`正在查看：${chapterMeta?.label || chapter}`}
          description={
            chapterMeta
              ? "来自计划或练习的深链定位。可清空章节筛选以浏览全部资料。"
              : "已按章节关键词筛选；若结果为空，可清除筛选后重试。"
          }
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

      {fileError && !activeMaterial ? <Alert type="warning" showIcon message={fileError} /> : null}

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
                  {material.summary ||
                    "已登记出处与页码。点开查看知序章级导学。"}
                </p>
                <div className="material-card__tags">
                  <Tag color="blue">
                    {material.subject === "math" ? "高等数学" : "大学物理"}
                  </Tag>
                  <Tag>{material.chapter_id}</Tag>
                  {(material.tags || []).slice(0, 2).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
                <div className="material-card__meta">
                  <span>
                    {material.page_range
                      ? `P.${material.page_range[0]}–${material.page_range[1]}`
                      : "元数据索引"}
                  </span>
                  <span>{material.available ? "原件可用" : "原件未部署"}</span>
                </div>
                <div className="material-card__actions">
                  <Button size="small" type="link" disabled={!material.available || fileLoading}
                    onClick={() => openFile(material, false)}>下载原件</Button>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => { setActiveMaterial(material); setFileError(null); }}
                  >
                    查看导学
                  </Button>
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
          <h2>导学讲「学什么」，页码帮你对照原件。</h2>
          <p>
            抽屉里的目标、易错与样例题由知序整理；已部署原件可预览或下载；原件缺失时，请按页码对照自己的教材或联系管理员。
          </p>
        </div>
        <Space wrap>
          <Tag color="green">章级导学</Tag>
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

      <Drawer title="资料原件预览" width="90vw" open={Boolean(previewUrl)}
        onClose={() => setPreviewUrl(null)} destroyOnClose>
        {previewUrl ? <iframe title="资料 PDF 预览" src={`${previewUrl}#page=${activeMaterial?.page_range?.[0] || 1}`}
          style={{ width: "100%", height: "75vh", border: 0 }} /> : null}
      </Drawer>
      <Drawer
        className="material-guide-drawer"
        title={
          activeMaterial
            ? `${materialKind[activeMaterial.kind] || activeMaterial.kind} · ${guide?.title || activeMaterial.title}`
            : "章级导学"
        }
        placement="right"
        width={480}
        styles={{ wrapper: { maxWidth: "100vw" } }}
        open={Boolean(activeMaterial)}
        onClose={() => setActiveMaterial(null)}
        destroyOnClose
      >
        {activeMaterial ? (
          <Spin spinning={guideLoading}>
            <div className="material-guide">
              <section className="material-guide__block">
                <p className="eyebrow">本条资料</p>
                <h3>{activeMaterial.title}</h3>
                <div className="material-guide__meta">
                  <Tag>{materialKind[activeMaterial.kind] || activeMaterial.kind}</Tag>
                  <Tag>{activeMaterial.chapter_id}</Tag>
                  {activeMaterial.page_range ? (
                    <Tag color="blue">
                      P.{activeMaterial.page_range[0]}–{activeMaterial.page_range[1]}
                    </Tag>
                  ) : null}
                  {guide?.exam_hot ? <Tag color="orange">期末热点</Tag> : null}
                </div>
                <p className="material-guide__note">
                  {activeMaterial.license_note ||
                    "对照纸质书或课件原件阅读正文；此处只提供导学与定位。"}
                </p>
              </section>

              <section className="material-guide__block">
                <Space wrap>
                  <Button loading={fileLoading} disabled={!activeMaterial.preview_available}
                    onClick={() => openFile(activeMaterial, true)}>预览原件</Button>
                  <Button loading={fileLoading} disabled={!activeMaterial.available}
                    onClick={() => openFile(activeMaterial, false)}>下载原件</Button>
                </Space>
                {!activeMaterial.available ? <Alert style={{ marginTop: 12 }} type="info" showIcon
                  message="原始资料尚未部署" description="仍可查看导学；请联系管理员补充对应文件。" /> :
                  !activeMaterial.preview_available ? <p>该资料暂不支持在线预览，可下载原件阅读。</p> : null}
                {fileError ? <Alert type="warning" showIcon message={fileError} /> : null}
              </section>

              {guideError ? (
                <Alert type="warning" showIcon message={guideError} />
              ) : null}

              {guide ? (
                <>
                  <section className="material-guide__block">
                    <p className="eyebrow">本章学什么</p>
                    <h3>{guide.title}</h3>
                    <p>{guide.lead}</p>
                    {guide.objectives.length ? (
                      <ul className="material-guide__list">
                        {guide.objectives.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>

                  {guide.knowledge_points.length ? (
                    <section className="material-guide__block">
                      <p className="eyebrow">知识点</p>
                      <div className="material-guide__kps">
                        {guide.knowledge_points.map((kp) => (
                          <Tag key={kp.id}>{kp.name}</Tag>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {guide.pitfalls.length ? (
                    <section className="material-guide__block">
                      <p className="eyebrow">易错提醒</p>
                      <ul className="material-guide__list material-guide__list--warn">
                        {guide.pitfalls.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {kindTip ? (
                    <section className="material-guide__block">
                      <p className="eyebrow">怎么用这份资料</p>
                      <p>{kindTip}</p>
                    </section>
                  ) : null}
                </>
              ) : null}

              <section className="material-guide__block">
                <p className="eyebrow">样例题</p>
                {samples.length ? (
                  <Collapse
                    ghost
                    items={samples.map((question, index) => ({
                      key: question.question_id,
                      label: `第 ${index + 1} 题 · ${questionTypeLabel[question.type] || question.type}`,
                      children: (
                        <div className="material-guide__sample">
                          <p><MathText text={question.stem} /></p>
                          <p className="material-guide__answer">
                            参考答案（订正用）：<MathText text={question.answer} />
                          </p>
                          {question.exam_hot ? (
                            <Tag color="orange">期末热点</Tag>
                          ) : null}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <p className="material-guide__muted">
                    本章暂无入库样例题，可直接去做练习巩固。
                  </p>
                )}
              </section>

              <div className="material-guide__actions">
                <Link to={drawerPracticeLink}>
                  <Button type="primary" block>
                    去做本章练习
                    <ArrowRightOutlined />
                  </Button>
                </Link>
              </div>
            </div>
          </Spin>
        ) : null}
      </Drawer>
    </div>
  );
}

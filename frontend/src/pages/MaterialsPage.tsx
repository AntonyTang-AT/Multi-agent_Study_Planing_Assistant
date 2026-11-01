import { BookOutlined } from "@ant-design/icons";

import { PageScaffold } from "../components/PageScaffold";

export function MaterialsPage() {
  return (
    <PageScaffold
      eyebrow="Materials · 可追溯资料库"
      title="学习资料"
      description="资料页将按学科、章节与场景标签浏览内容，保留来源、页码、可信度和合规说明。"
      icon={<BookOutlined />}
      nextSteps={[
        "F3 对接 GET /api/materials 查询参数",
        "展示资料元数据而非转载正文",
        "为计划 Agent 与出题 Agent 提供证据引用",
      ]}
      actionLabel="返回工程总览"
      actionPath="/"
    />
  );
}

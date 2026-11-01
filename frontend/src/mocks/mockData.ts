import type {
  BlackboardEntry,
  Material,
  Question,
  Scenario,
  Subject,
} from "../types/api";

export interface DemoQuestion extends Question {
  options: Array<{
    key: string;
    label: string;
  }>;
}

export interface MaterialCard extends Material {
  summary: string;
  tags: string[];
  credibility: string;
}

export const demoQuestion: DemoQuestion = {
  question_id: "math_f2_demo_001",
  subject: "math",
  knowledge_ids: ["math.a1.ch02"],
  scenario_tags: ["final_review"],
  chapter: "极限",
  exam_hot: true,
  difficulty: 2,
  type: "choice",
  stem: "当 x 趋近于 0 时，下面的极限等于多少？",
  answer: "-9/2",
  assumptions: ["使用 sin(3x) 的三阶泰勒展开"],
  error_tags: ["formula_misuse"],
  verify_hint: {
    expr: "limit((sin(3*x)-3*x)/x^3, x, 0)",
    expected: "-9/2",
  },
  source: "自编演示题 · 对齐第一重要极限",
  license_note: "仅用于本地机制验证",
  options: [
    { key: "A", label: "-3/2" },
    { key: "B", label: "3/2" },
    { key: "C", label: "-9/2" },
    { key: "D", label: "9/2" },
  ],
};

export const demoMaterials: MaterialCard[] = [
  {
    material_id: "mat_math_limit_textbook",
    subject: "math",
    chapter_id: "math.a1.ch02",
    kind: "textbook",
    title: "教材 · 极限",
    file: "高数/00_教材/HNU大学数学1 第3版.pdf",
    page_range: [28, 74],
    page_status: "verified_toc",
    license_note: "校内教学使用 · 仅登记元数据与页码",
    status: "downloaded",
    summary: "极限定义、存在准则、夹逼定理与常见计算结构。",
    tags: ["高等数学", "概念", "极限"],
    credibility: "官方教材",
  },
  {
    material_id: "mat_math_limit_courseware",
    subject: "math",
    chapter_id: "math.a1.ch02",
    kind: "courseware",
    title: "课件 · 极限与连续",
    file: "高数/01_课件/湖南大学《高等数学》课件（第2章）.pptx",
    page_range: null,
    license_note: "校内教学使用 · 仅登记元数据",
    status: "downloaded",
    summary: "课堂重点、例题结构与教师强调的易错点。",
    tags: ["高等数学", "课件", "跟课"],
    credibility: "课程组",
  },
  {
    material_id: "mat_math_limit_homework",
    subject: "math",
    chapter_id: "math.a1.ch02",
    kind: "homework",
    title: "习题册 · 夹逼定理",
    file: "高数/02_习题册/综合题二 极限.pdf",
    page_range: null,
    license_note: "校内教学使用 · 仅登记元数据",
    status: "downloaded",
    summary: "按放缩方向与上下界构造整理的练习入口。",
    tags: ["高等数学", "例题", "夹逼定理"],
    credibility: "已校对",
  },
  {
    material_id: "mat_physics_error",
    subject: "physics",
    chapter_id: "physics.ch03",
    kind: "courseware",
    title: "实验讲义 · 误差传递",
    file: "大物/实验/误差传递.pdf",
    page_range: [1, 16],
    license_note: "校内教学使用 · 仅登记元数据与页码",
    status: "downloaded",
    summary: "不确定度传播、有效数字与实验报告表达。",
    tags: ["大学物理", "实验", "误差"],
    credibility: "实验中心",
  },
];

export const initialBlackboard: BlackboardEntry[] = [
  {
    entry_id: "bb_demo_conflict",
    type: "conflict",
    summary: "计划第 3 天预计超出每日时间预算",
    severity: "high",
    evidence_refs: ["plan#day3", "constraint#daily_minutes"],
    status: "open",
  },
  {
    entry_id: "bb_demo_challenge",
    type: "challenge",
    summary: "答案草稿依赖未声明的等价替换假设",
    severity: "high",
    evidence_refs: ["question#math_f2_demo_001", "verify#step2"],
    status: "open",
  },
  {
    entry_id: "bb_demo_intervention",
    type: "intervention",
    summary: "连续中断后建议使用低门槛任务恢复节奏",
    severity: "medium",
    evidence_refs: ["trace#recent_attempts", "signal#motivation"],
    status: "open",
  },
];

export interface ScenarioInput {
  scenario: Scenario;
  subject: Subject;
  dailyMinutes: number;
  examDate: string;
  chapter: string;
}

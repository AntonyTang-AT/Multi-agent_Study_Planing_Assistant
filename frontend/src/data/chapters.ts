/** 与 data/taxonomy/*_outline.json 章级节点对齐，供场景向导与深链使用。 */

export interface ChapterOption {
  id: string;
  name: string;
  label: string;
  examHot?: boolean;
}

export const MATH_CHAPTERS: ChapterOption[] = [
  { id: "math.a1.ch01", name: "集合与函数", label: "第 1 章 · 集合与函数" },
  {
    id: "math.a1.ch02",
    name: "极限",
    label: "第 2 章 · 极限",
    examHot: true,
  },
  {
    id: "math.a1.ch03",
    name: "函数的连续性",
    label: "第 3 章 · 函数的连续性",
    examHot: true,
  },
  {
    id: "math.a1.ch04",
    name: "函数的导数和微分",
    label: "第 4 章 · 导数和微分",
    examHot: true,
  },
  {
    id: "math.a1.ch05",
    name: "导数与微分的应用举例",
    label: "第 5 章 · 导数应用",
  },
  { id: "math.a1.ch06", name: "函数的积分", label: "第 6 章 · 积分" },
  {
    id: "math.a1.ch07",
    name: "定积分的应用举例",
    label: "第 7 章 · 定积分应用",
  },
  {
    id: "math.a1.ch08",
    name: "常微分方程",
    label: "第 8 章 · 常微分方程",
  },
];

export const PHYSICS_CHAPTERS: ChapterOption[] = [
  { id: "phy.kinematics", name: "质点运动学", label: "质点运动学" },
  {
    id: "phy.dynamics",
    name: "质点力学的基本规律 守恒定律",
    label: "质点力学 / 守恒定律",
    examHot: true,
  },
  { id: "phy.rigid", name: "刚体的定轴转动", label: "刚体定轴转动" },
  { id: "phy.vibration", name: "振动", label: "振动" },
  { id: "phy.wave", name: "波动", label: "波动", examHot: true },
  { id: "phy.interference", name: "光的干涉", label: "光的干涉" },
  { id: "phy.diffraction", name: "光的衍射", label: "光的衍射" },
  { id: "phy.polarization", name: "光的偏振", label: "光的偏振" },
  { id: "phy.kinetic", name: "气体分子运动论", label: "气体动理论" },
  {
    id: "phy.thermo",
    name: "热力学基本原理",
    label: "热力学基本原理",
    examHot: true,
  },
];

export function chaptersForSubject(
  subject: "math" | "physics",
): ChapterOption[] {
  return subject === "physics" ? PHYSICS_CHAPTERS : MATH_CHAPTERS;
}

export function chapterById(id: string): ChapterOption | undefined {
  return [...MATH_CHAPTERS, ...PHYSICS_CHAPTERS].find((item) => item.id === id);
}

export function chapterByLabelOrName(
  subject: "math" | "physics",
  value: string,
): ChapterOption | undefined {
  const list = chaptersForSubject(subject);
  return list.find(
    (item) =>
      item.label === value ||
      item.name === value ||
      item.id === value ||
      value.includes(item.name),
  );
}

/** Agent 粗粒度 ID → 资料包章级 ID（与 data/taxonomy/aliases.json 对齐） */
const AGENT_CHAPTER_FALLBACK: Record<string, string> = {
  "math.limit": "math.a1.ch02",
  "math.derivative": "math.a1.ch04",
  "math.mvt": "math.a1.ch05",
  "math.integral": "math.a1.ch06",
  "math.ode": "math.a1.ch08",
  "phy.mech": "phy.dynamics",
  "phy.wave": "phy.wave",
  "phy.optics": "phy.interference",
  "phy.thermo": "phy.thermo",
};

/** 从知识点 ID 归一到章级 ID（math.a1.ch02 / phy.dynamics） */
export function chapterIdFromKnowledge(knowledgeId: string): string {
  if (!knowledgeId) return "";
  if (AGENT_CHAPTER_FALLBACK[knowledgeId]) {
    return AGENT_CHAPTER_FALLBACK[knowledgeId];
  }
  const parts = knowledgeId.split(".");
  // 已是细章：math.a1.ch02 / math.a1.ch02.kp01
  if (knowledgeId.startsWith("math.a1.ch") && parts.length >= 3) {
    return parts.slice(0, 3).join(".");
  }
  // 物理细章：phy.dynamics / phy.dynamics.kp01
  if (knowledgeId.startsWith("phy.") && parts.length >= 2) {
    return parts.slice(0, 2).join(".");
  }
  if (knowledgeId.startsWith("physics.") && parts.length >= 2) {
    return parts.slice(0, 2).join(".");
  }
  return knowledgeId;
}

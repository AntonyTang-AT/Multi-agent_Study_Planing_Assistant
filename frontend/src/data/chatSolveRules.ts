/** 对话页做题问答：题型识别、章节映射、本地微规则（无 LLM）。 */

export interface SolveChapter {
  id: string;
  label: string;
  subject: "math" | "physics";
  guideSteps: string[];
}

export interface LocalSolveHit {
  chapterId: string;
  title: string;
  steps: string[];
  /** 可用 $...$ 包裹，供 MathText 渲染 */
  answer: string;
}

export interface ChatSolveOption {
  label: string;
  path: string;
}

export interface ChatSolveResult {
  text: string;
  options: ChatSolveOption[];
  chapterId: string;
  questionId?: string;
}

const CHAPTERS: SolveChapter[] = [
  {
    id: "math.a1.ch04",
    label: "导数与微分",
    subject: "math",
    guideSteps: [
      "确认是用定义还是运算法则（幂函数、积商、复合）。",
      "写出中间步骤，特别留意复合函数要乘内层导数。",
      "用一两个特殊点或已知公式验算。",
    ],
  },
  {
    id: "math.a1.ch02",
    label: "极限",
    subject: "math",
    guideSteps: [
      "先尝试直接代入；不定型再考虑通分、有理化或等价无穷小。",
      "看清 $x\\to a$ 还是 $x\\to\\infty$，以及左/右极限。",
      "两个重要极限与等价代换要核对方能成立的形式。",
    ],
  },
  {
    id: "math.a1.ch03",
    label: "函数的连续性",
    subject: "math",
    guideSteps: [
      "在一点连续需：有定义、左右极限存在且相等、并等于函数值。",
      "分段函数优先检查分界点。",
      "间断点先分类，再谈补定义或去间断。",
    ],
  },
  {
    id: "math.a1.ch06",
    label: "积分",
    subject: "math",
    guideSteps: [
      "先辨不定积分还是定积分；定积分注意上下限。",
      "优先基本积分表，再用换元或分部。",
      "换元后记得回代或改限。",
    ],
  },
  {
    id: "math.a1.ch01",
    label: "集合与函数",
    subject: "math",
    guideSteps: [
      "先写清定义域与对应关系。",
      "奇偶性、单调性要按定义验证。",
      "涉及反函数时先检查是否一一对应。",
    ],
  },
  {
    id: "phy.dynamics",
    label: "质点力学 / 守恒",
    subject: "physics",
    guideSteps: [
      "隔离物体，画全受力（含摩擦等题干条件）。",
      "再判断用牛顿定律还是动量/机械能守恒。",
      "检查系统选取与守恒条件是否成立。",
    ],
  },
  {
    id: "phy.kinematics",
    label: "质点运动学",
    subject: "physics",
    guideSteps: [
      "先固定参考系与坐标系。",
      "位矢求导得速度、加速度；曲线运动分切向/法向。",
      "相对运动注意速度合成方向。",
    ],
  },
];

const TOPIC_RULES: { pattern: RegExp; chapterId: string }[] = [
  { pattern: /导数|求导|微分|导函数|f'\(|y'/, chapterId: "math.a1.ch04" },
  { pattern: /极限|无穷小|无穷大|lim\b|趋近/, chapterId: "math.a1.ch02" },
  { pattern: /连续|间断|间断点/, chapterId: "math.a1.ch03" },
  { pattern: /积分|原函数|定积分|不定积分/, chapterId: "math.a1.ch06" },
  { pattern: /定义域|反函数|奇偶|集合与函数/, chapterId: "math.a1.ch01" },
  { pattern: /斜面|摩擦|牛顿|动量|机械能|受力/, chapterId: "phy.dynamics" },
  { pattern: /速度|加速度|位矢|运动学|抛体/, chapterId: "phy.kinematics" },
];

const SOLVE_HINT =
  /导数|求导|微分|极限|积分|定积分|连续|间断|定义域|反函数|怎么做|怎么求|如何求|求一下|等于多少|这题|解一下|计算|求\s*[fFyY]|f\s*\(|lim\b|\\\\lim|斜面|摩擦|牛顿|动量|机械能|抛体|加速度/;

export function isSolveIntent(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (SOLVE_HINT.test(t)) return true;
  // 短代数提问：含 x 且像在问结果
  if (/[xX]/.test(t) && /(是什么|等于|求|导数|极限)/.test(t)) return true;
  if (/\$/.test(t) && t.length < 200) return true;
  return false;
}

export function detectSolveChapter(text: string): SolveChapter | null {
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(text)) {
      return CHAPTERS.find((c) => c.id === rule.chapterId) || null;
    }
  }
  return null;
}

export function chapterById(id: string): SolveChapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

/** 本地微规则：答辩高频、无需 LLM。 */
export function matchLocalSolve(text: string): LocalSolveHit | null {
  const raw = text.replace(/\s+/g, "");

  // 5x / 5*x / y=5x 的导数（必须出现求导相关词）
  let m =
    raw.match(/([+-]?\d+(?:\.\d+)?)[xX](?:的)?(?:导数|求导|微分)/) ||
    raw.match(/(?:导数|求导|微分).{0,10}([+-]?\d+(?:\.\d+)?)[xX]/) ||
    raw.match(/([+-]?\d+(?:\.\d+)?)[xX].{0,8}(?:是什么|等于多少)/);
  if (m && /导数|求导|微分/.test(text)) {
    const c = m[1];
    return {
      chapterId: "math.a1.ch04",
      title: `一次函数 $${c}x$ 的导数`,
      steps: [
        "幂函数法则：$(x^n)'=n x^{n-1}$，这里 $n=1$。",
        `常数倍法则：$(c\\,x)'=c\\,(x)'=c$。`,
        `因此 $(${c}x)'=${c}$。`,
      ],
      answer: `$${c}$`,
    };
  }

  // x^n 导数（简单整数）
  m = raw.match(/[xX]\^(\d+).{0,8}(?:导数|求导)|(?:导数|求导).{0,8}[xX]\^(\d+)/);
  if (m) {
    const n = Number(m[1] || m[2]);
    if (Number.isFinite(n) && n >= 1 && n <= 8) {
      const ans = n === 1 ? "1" : `${n}x^{${n - 1}}`;
      return {
        chapterId: "math.a1.ch04",
        title: `$x^{${n}}$ 的导数`,
        steps: [
          "使用幂函数求导公式 $(x^n)'=n x^{n-1}$。",
          `代入 $n=${n}$ 得 $(x^{${n}})'=${ans}$。`,
        ],
        answer: `$${ans}$`,
      };
    }
  }

  // lim x->0 sinx/x
  if (/sin.?[xX].*[xX]|[xX].*sin.?[xX]/.test(raw) && /极限|lim|趋/.test(text)) {
    return {
      chapterId: "math.a1.ch02",
      title: "重要极限 $\\lim_{x\\to 0}\\dfrac{\\sin x}{x}$",
      steps: [
        "这是两个重要极限之一，当 $x\\to 0$ 时成立。",
        "可直接使用结论，不必再洛必达（除非题目要求）。",
      ],
      answer: "$1$",
    };
  }

  return null;
}

export function tokenizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\$/g, " ")
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .filter((t) => t.length >= 1);
}

/** 在题库 stem 中打分，返回最佳命中下标；过低则 -1。 */
export function bestQuestionIndex(
  text: string,
  stems: string[],
): number {
  const tokens = new Set(tokenizeForMatch(text).filter((t) => t.length >= 2));
  if (!tokens.size || !stems.length) return -1;
  let best = -1;
  let bestScore = 0;
  stems.forEach((stem, index) => {
    const stemTokens = tokenizeForMatch(stem);
    let score = 0;
    for (const t of stemTokens) {
      if (tokens.has(t)) score += t.length >= 2 ? 2 : 1;
    }
    // 数字特征
    const nums = text.match(/\d+/g) || [];
    for (const n of nums) {
      if (stem.includes(n)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return bestScore >= 4 ? best : -1;
}

export function buildSolveMessage(parts: {
  title: string;
  chapterLabel: string;
  steps: string[];
  answer?: string;
  note?: string;
  conflictNote?: string;
}): string {
  const lines = [
    `【做题问答】${parts.title}`,
    `对应章节：${parts.chapterLabel}`,
    "",
    "简要步骤：",
    ...parts.steps.map((s, i) => `${i + 1}. ${s}`),
  ];
  if (parts.answer) {
    lines.push("", `参考答案：${parts.answer}`);
  }
  if (parts.note) {
    lines.push("", parts.note);
  }
  if (parts.conflictNote) {
    lines.push("", parts.conflictNote);
  }
  return lines.join("\n");
}

export function practicePath(chapterId: string, questionId?: string): string {
  const params = new URLSearchParams({ knowledge: chapterId });
  if (questionId) params.set("question", questionId);
  return `/practice?${params.toString()}`;
}

export function materialsPath(chapterId: string, subject: "math" | "physics"): string {
  return `/materials?subject=${subject}&chapter=${encodeURIComponent(chapterId)}`;
}

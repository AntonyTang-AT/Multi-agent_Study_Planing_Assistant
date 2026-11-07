import type { BlackboardEntry } from "../types/api";

export interface BlackboardViewModel {
  typeLabel: string;
  severityLabel: string;
  title: string;
  why: string;
  nextStep: string;
  actionLabel: string;
  actionPath: string;
  tone: "conflict" | "challenge" | "intervention" | "hypothesis" | "stage" | "default";
}

const TYPE_LABEL: Record<string, string> = {
  conflict: "时间冲突",
  challenge: "作答提醒",
  intervention: "节奏干预",
  hypothesis: "学习假设",
  stage_conclusion: "阶段结论",
};

const SEVERITY_LABEL: Record<string, string> = {
  high: "高优先",
  medium: "中优先",
  low: "低优先",
};

/** 把后端黑板条目翻译成答辩同学能看懂的「是什么 / 为什么 / 下一步」 */
export function describeBlackboardEntry(entry: BlackboardEntry): BlackboardViewModel {
  const type = entry.type || "default";
  const typeLabel = TYPE_LABEL[type] || "学习提醒";
  const severityLabel = SEVERITY_LABEL[entry.severity] || "待关注";
  const evidence = entry.evidence_refs || [];
  const suggested = evidence.find((item) => /建议/.test(item));

  switch (type) {
    case "conflict":
      return {
        typeLabel,
        severityLabel,
        title: "今晚的任务可能塞不下",
        why: "系统发现某天任务时长超过了你设定的每日可用时间。若不处理，容易熬夜或中途放弃。",
        nextStep:
          suggested?.replace(/^建议[^·]*·\s*/, "") ||
          "去学习计划页，选择「压缩任务 / 顺延 / 加时」中的一种。",
        actionLabel: "去调整计划",
        actionPath: "/plan",
        tone: "conflict",
      };
    case "challenge":
      return {
        typeLabel,
        severityLabel,
        title: "这道题有个容易踩的坑",
        why: "作答或草稿里出现了可疑假设、漏条件或常见错因。提醒不是惩罚，是帮你在订正前先停一下。",
        nextStep:
          suggested?.replace(/^建议[^·]*·\s*/, "") ||
          "打开练习中心，对照提示把缺的条件补全后再提交。",
        actionLabel: "去看相关练习",
        actionPath: "/practice",
        tone: "challenge",
      };
    case "intervention":
      return {
        typeLabel,
        severityLabel,
        title: "学习节奏可能断了",
        why: "检测到较长时间没有练习，或模拟了“几天没登录”。系统会把任务收短，方便你重新起步。",
        nextStep:
          suggested?.replace(/^建议[^·]*·\s*/, "") ||
          "先做一截 15 分钟热身，完成比完美更重要。",
        actionLabel: "开始短练习",
        actionPath: "/practice",
        tone: "intervention",
      };
    case "hypothesis":
      return {
        typeLabel,
        severityLabel,
        title: "一条可验证的学习假设",
        why: "这是针对你错因提出的改进猜测。你可以按它试几天，看正确率有没有变化。",
        nextStep:
          suggested?.replace(/^建议[^·]*·\s*/, "") ||
          "下次做同类题时，先按这条假设检查，再动笔。",
        actionLabel: "去练习验证",
        actionPath: "/practice",
        tone: "hypothesis",
      };
    case "stage_conclusion":
      return {
        typeLabel,
        severityLabel,
        title: "阶段小结（可存档）",
        why: "系统根据近几次练习给出的阶段判断，用来决定下一周把力气花在哪里。",
        nextStep:
          suggested?.replace(/^建议[^·]*·\s*/, "") ||
          "到学习轨迹确认强弱项，再回到计划微调重点。",
        actionLabel: "查看学习轨迹",
        actionPath: "/trace",
        tone: "stage",
      };
    default:
      return {
        typeLabel,
        severityLabel,
        title: "需要你看一眼的提醒",
        why: "多智能体在计划、作答或节奏上发现了值得确认的信号。",
        nextStep: "阅读摘要后标记「已了解」，重要项可跳转到对应页面处理。",
        actionLabel: "打开资料页",
        actionPath: "/materials",
        tone: "default",
      };
  }
}

export function sortBlackboardEntries(entries: BlackboardEntry[]): BlackboardEntry[] {
  const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...entries].sort((a, b) => {
    const openA = a.status === "open" ? 0 : 1;
    const openB = b.status === "open" ? 0 : 1;
    if (openA !== openB) return openA - openB;
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });
}

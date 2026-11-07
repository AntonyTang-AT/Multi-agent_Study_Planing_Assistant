/** 黑板上的“老师 / 助手”角色设定 —— 公共传话台 */

export interface AgentPersona {
  id: string;
  name: string;
  title: string;
  color: string;
}

export const AGENT_ROSTER: Record<string, AgentPersona> = {
  planner: {
    id: "planner",
    name: "程计",
    title: "计划助手",
    color: "#2f8667",
  },
  tutor: {
    id: "tutor",
    name: "温题",
    title: "习题助教",
    color: "#bd5149",
  },
  coach: {
    id: "coach",
    name: "安节",
    title: "节奏教练",
    color: "#c47a1d",
  },
  analyst: {
    id: "analyst",
    name: "析因",
    title: "学情分析",
    color: "#47758e",
  },
  code: {
    id: "code",
    name: "码小助",
    title: "代码助教",
    color: "#5b4db8",
  },
};

export interface AgentMessage {
  agentId: keyof typeof AGENT_ROSTER | string;
  text: string;
  to?: string; // 对谁说：user / 其他 agent 名
}

/** 从 evidence_refs 解析「传话 · 角色：内容」 */
export function parseAgentThread(evidenceRefs: string[] | undefined): AgentMessage[] {
  const out: AgentMessage[] = [];
  for (const raw of evidenceRefs || []) {
    const m = raw.match(/^传话\s*·\s*([^：:]+)[：:]\s*(.+)$/);
    if (!m) continue;
    const who = m[1].trim();
    const text = m[2].trim();
    const agentId =
      Object.values(AGENT_ROSTER).find(
        (a) => a.name === who || a.title === who || a.id === who,
      )?.id || who;
    out.push({ agentId, text });
  }
  return out;
}

export function evidenceWithoutThread(evidenceRefs: string[] | undefined): string[] {
  return (evidenceRefs || []).filter((item) => !/^传话\s*·/.test(item));
}

/** 旧数据没有传话行时，按提醒类型补一条可读的协作示意 */
export function fallbackAgentThread(type: string | undefined): AgentMessage[] {
  switch (type) {
    case "conflict":
      return [
        { agentId: "planner", text: "今天任务时长已经顶满每日预算，需要用户拍板怎么改。" },
        { agentId: "coach", text: "别直接砍掉全部，先给用户三个选项：压缩 / 顺延 / 加时。" },
        { agentId: "analyst", text: "我会记下这次选择，方便下周排期时避开同类冲突。" },
      ];
    case "challenge":
      return [
        { agentId: "tutor", text: "草稿里好像漏了关键条件，先别让用户提交。" },
        { agentId: "analyst", text: "同类错因最近出现过，建议写进黑板提醒。" },
        { agentId: "coach", text: "提醒要温和：指出缺什么，再引导回练习页。" },
      ];
    case "intervention":
      return [
        { agentId: "coach", text: "已经两天没有练习信号了，需要短任务把节奏拉回来。" },
        { agentId: "planner", text: "我把今日目标收成 15 分钟热身，完成即可。" },
        { agentId: "tutor", text: "热身题我准备好了，用户点开始就能做。" },
      ];
    case "hypothesis":
      return [
        { agentId: "analyst", text: "根据错因提出一条可验证假设，先贴到黑板上。" },
        { agentId: "tutor", text: "下次同类题我会按这条假设先检查再动笔提示。" },
      ];
    case "stage_conclusion":
      return [
        { agentId: "analyst", text: "本阶段强弱项已汇总，结论可供计划助手引用。" },
        { agentId: "planner", text: "收到，下周排期会把力气放在未过线的知识点上。" },
      ];
    default:
      return [
        { agentId: "analyst", text: "发现值得确认的信号，先写到公共黑板上。" },
        { agentId: "coach", text: "等用户确认后，我们再继续后续动作。" },
      ];
  }
}

export function resolveAgent(persona: AgentPersona | undefined, agentId: string): AgentPersona {
  if (persona) return persona;
  return {
    id: agentId,
    name: agentId,
    title: "助手",
    color: "#5a6b63",
  };
}

export interface CollabLogItem {
  entryId: string;
  entrySummary: string;
  entryStatus: string;
  entryType: string;
  agentId: string;
  text: string;
  order: number;
}

/** 把所有黑板条目里的传话摊平成一条协作时间线（含历史已处理） */
export function buildCollabLog(
  entries: { entry_id: string; summary: string; status: string; type: string; evidence_refs?: string[] }[],
): CollabLogItem[] {
  const out: CollabLogItem[] = [];
  let order = 0;
  // 历史在前、待办在后：先 resolved 再 open，同组保持原序
  const sorted = [...entries].sort((a, b) => {
    const rank = (s: string) => (s === "open" ? 1 : 0);
    return rank(a.status) - rank(b.status);
  });
  for (const entry of sorted) {
    const parsed = parseAgentThread(entry.evidence_refs);
    const thread =
      parsed.length > 0 ? parsed : fallbackAgentThread(entry.type);
    for (const msg of thread) {
      out.push({
        entryId: entry.entry_id,
        entrySummary: entry.summary,
        entryStatus: entry.status,
        entryType: entry.type,
        agentId: String(msg.agentId),
        text: msg.text,
        order: order++,
      });
    }
  }
  return out;
}

/** Lightweight offline tutor for Python sandbox errors / stuck code. */

export interface TutorMessage {
  role: "assistant" | "user";
  text: string;
}

/** 去掉 Pyodide 内部栈，只留学员代码相关帧与最终异常行 */
export function simplifyPythonTraceback(raw: string): string {
  if (!raw.trim()) return "";
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (
      /\/lib\/python|_pyodide|_base\.py|pyodide\.asm|site-packages|CodeRunner|coroutine\s*=\s*eval\(/i.test(
        line,
      )
    ) {
      // 跳过本帧，以及紧随的 "^^^^" 指示行
      if (i + 1 < lines.length && /^\s*[\^~]+/.test(lines[i + 1])) i += 1;
      continue;
    }
    kept.push(line);
  }
  const text = kept.join("\n").trim();
  if (text) return text;
  // 兜底：至少保留最后一行异常类型
  const last = [...lines].reverse().find((l) => /\w+Error|\w+Exception|AssertionError/.test(l));
  return last || raw.slice(0, 400);
}

function detectErrorKind(stderr: string): string {
  const text = stderr || "";
  if (/SyntaxError|IndentationError|TabError/i.test(text)) return "syntax";
  if (/NameError/i.test(text)) return "name";
  if (/TypeError/i.test(text)) return "type";
  if (/IndexError|KeyError/i.test(text)) return "index";
  if (/ZeroDivisionError/i.test(text)) return "div0";
  if (/AssertionError/i.test(text)) return "assert";
  if (/ModuleNotFoundError|ImportError/i.test(text)) return "import";
  if (text.trim()) return "runtime";
  return "none";
}

function extractAssertMessage(stderr: string): string | null {
  const m = stderr.match(/AssertionError:\s*(.+)/);
  return m?.[1]?.trim() || null;
}

/** 结合题面与源码，指出「能跑但自测挂」的高概率原因 */
function diagnoseLogicBug(input: {
  code: string;
  exerciseTitle?: string;
  statement?: string;
  hint?: string;
  assertMessage?: string | null;
}): string[] {
  const code = input.code || "";
  const blob = `${input.exerciseTitle || ""}\n${input.statement || ""}\n${input.hint || ""}`;
  const tips: string[] = [];

  if (/\.lower\s*\(/.test(code) && /大小写|区分大小写|char_freq|频次/.test(blob)) {
    tips.push(
      "源码里用了 `s.lower()`（或类似大小写折叠）。本题要求区分大小写：`\"AbA\"` 应得到 `{\"A\":2,\"b\":1}`，转成小写后 `A` 会变成 `a`，自测就会挂。",
    );
  }
  if (/\.upper\s*\(/.test(code) && /大小写|区分大小写|char_freq|频次/.test(blob)) {
    tips.push("源码里用了 `.upper()`，会把大小写并成一类，和「区分大小写」的题意冲突。");
  }
  if (/for\s+\w+\s+in\s+range\s*\(\s*len\s*\(/.test(code) && /字符|字符串|频次/.test(blob)) {
    tips.push("统计字符时更直接的写法是 `for ch in s:`，不必先 `range(len(s))`。");
  }
  if (/^\s*pass\s*$/m.test(code) || /return\s+None\b/.test(code)) {
    tips.push("函数体里还有 `pass` 或返回了 `None`，自测拿不到正确结果。");
  }
  if (/sorted\s*\(\s*s\s*\)/.test(code) && /频次|char_freq/.test(blob)) {
    tips.push("`sorted(s)` 会打乱原序，频次统计一般不需要排序。");
  }
  if (/set\s*\(\s*s\s*\)/.test(code) && /频次|次数|char_freq/.test(blob)) {
    tips.push("`set(s)` 会去重，只能知道「出现过哪些字符」，拿不到次数。");
  }
  if (input.assertMessage) {
    tips.push(`自测给出的期望信息：${input.assertMessage}`);
  }
  return tips;
}

export function tutorReply(input: {
  question: string;
  code: string;
  stderr: string;
  stdout: string;
  checkPassed: boolean | null;
  exerciseTitle?: string;
  hint?: string;
  statement?: string;
}): string {
  const q = input.question.trim();
  const cleanStderr = simplifyPythonTraceback(input.stderr);
  const kind = detectErrorKind(cleanStderr || input.stderr);
  const assertMessage = extractAssertMessage(cleanStderr || input.stderr);
  const logicTips = diagnoseLogicBug({
    code: input.code,
    exerciseTitle: input.exerciseTitle,
    statement: input.statement,
    hint: input.hint,
    assertMessage,
  });
  const lower = q.toLowerCase();

  if (/报错|错误|exception|traceback|怎么了|为什么|什么意思/.test(q) || lower.includes("error")) {
    if (kind === "assert" || input.checkPassed === false) {
      const head =
        "这是自测断言失败（AssertionError）：你的函数已经跑完了，但返回值对不上题目样例。";
      if (logicTips.length) {
        return [head, "", "我根据你当前代码看到：", ...logicTips.map((t, i) => `${i + 1}. ${t}`), "", "改完后请再点「运行并自测」。"].join("\n");
      }
      return `${head}\n对照样例用 print 打印返回值，例如 print(char_freq(\"AbA\"))，看和期望差在哪。\n精简报错：\n${cleanStderr.slice(0, 400) || "（无更多信息）"}`;
    }

    switch (kind) {
      case "syntax":
        return "这是语法/缩进问题。检查：冒号后是否换行缩进、括号是否成对、是否混用 Tab 与空格。\n" + cleanStderr.slice(0, 300);
      case "name":
        return "NameError：用到了未定义的名字。常见原因是拼写错误，或在赋值前就使用。报错里的名字请在代码里搜一遍。\n" + cleanStderr.slice(0, 300);
      case "type":
        return "TypeError：类型不匹配（例如数字和字符串直接相加）。用 print(type(x)) 看类型，必要时转换。\n" + cleanStderr.slice(0, 300);
      case "index":
        return "下标或键不存在。先看长度，或用 dict.get(key)；循环注意 range 上界。\n" + cleanStderr.slice(0, 300);
      case "div0":
        return "除数为 0。计算前先判断分母。";
      case "import":
        return "当前沙箱是精简环境，未安装的第三方库会 ImportError。基础练习请用纯 Python。";
      case "runtime":
        return `运行期异常（已去掉沙箱内部栈）：\n${cleanStderr.slice(0, 500)}\n先看最后一行异常类型，以及指向的你的代码行。`;
      default:
        return "我这边还没看到可识别的异常类型。先点「运行并自测」复现一次，或把 stderr 原文贴过来。";
    }
  }

  if (/提示|不会|卡|hint|思路/.test(q)) {
    if (logicTips.length) {
      return `先别急着大改，优先检查：\n${logicTips.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
    }
    if (input.hint) {
      return `可以先试这个提示：${input.hint}\n不要一次改太多，改完立刻运行看输出。`;
    }
    return "先用自然语言写出步骤（输入是什么、要产出什么、中间要存哪些变量），再逐行翻译成代码。";
  }

  if (/通过|对不对|自测|check|没过|失败/.test(q)) {
    if (input.checkPassed === true) {
      return "自测已通过。接下来可以点下方「真实平台题」去洛谷/力扣用同样知识点加练。";
    }
    if (input.checkPassed === false || kind === "assert") {
      if (logicTips.length) {
        return ["自测未通过。根据你现在的代码，更可能的问题是：", ...logicTips.map((t, i) => `${i + 1}. ${t}`)].join("\n");
      }
      return "自测未通过：程序能运行，但结果与样例不一致。对着样例 print 返回值，逐步核对。";
    }
    return "这题还没跑自测。写完后点「运行并自测」。";
  }

  if (/洛谷|力扣|leetcode|平台|外链/.test(q)) {
    return "沙箱负责「本地快速试错」；洛谷/力扣负责「评测输入输出与题感」。建议：沙箱过关 → 打开推荐外链 → 用相同知识点再做 1 题。";
  }

  if (logicTips.length && (input.checkPassed === false || kind === "assert")) {
    return ["我注意到自测可能和这段代码有关：", ...logicTips.map((t, i) => `${i + 1}. ${t}`), "", "你可以问我：报错什么意思 / 给我一个提示。"].join("\n");
  }

  if (input.exerciseTitle) {
    return `当前练习是「${input.exerciseTitle}」。你可以问我：报错什么意思、要个提示、自测为啥没过。`;
  }

  return "我是计概代码小助教：看报错、给提示、解释自测失败。把问题发我，或点下方快捷句。";
}

export const TUTOR_QUICK_ASKS = [
  "这段报错什么意思",
  "给我一个提示",
  "自测为啥没过",
  "沙箱和洛谷有啥区别",
];

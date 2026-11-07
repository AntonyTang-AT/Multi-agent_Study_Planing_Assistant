import {
  BookOutlined,
  CodeOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Input,
  Segmented,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  CS_PRACTICE_TRACKS,
  CS_SHOWCASE_DEMOS,
  type CsLocalExercise,
  type CsPracticeTrack,
  type ExternalPlatform,
} from "../../data/csPracticeTracks";
import { TUTOR_QUICK_ASKS, tutorReply, type TutorMessage } from "../../lib/csCodeTutor";
import { getPyodide, runPython } from "../../lib/pyodideRunner";

const platformColor: Record<ExternalPlatform, string> = {
  luogu: "orange",
  leetcode: "gold",
  educoder: "blue",
};

const platformLabel: Record<ExternalPlatform, string> = {
  luogu: "洛谷",
  leetcode: "力扣",
  educoder: "Educoder",
};

const difficultyLabel = {
  warm: "热身",
  medium: "进阶",
  hard: "挑战",
} as const;

const difficultyColor = {
  warm: "default",
  medium: "blue",
  hard: "magenta",
} as const;

function initialTutor(track: CsPracticeTrack, exercise: CsLocalExercise): TutorMessage[] {
  return [
    {
      role: "assistant",
      text: `你好，我是计概代码小助教。当前「${track.title} / ${exercise.title}」（${difficultyLabel[exercise.difficulty]}）。请先读完整题面（描述 / 输入输出 / 样例），再写代码自测。可载入参考实现或顶部演示代码。`,
    },
  ];
}

function ProblemStatement({ exercise }: { exercise: CsLocalExercise }) {
  return (
    <div className="cs-problem-card">
      <Space wrap style={{ marginBottom: 8 }}>
        <Tag color={difficultyColor[exercise.difficulty]}>
          {difficultyLabel[exercise.difficulty]}
        </Tag>
        <Tag>函数题 · 沙箱自测</Tag>
      </Space>
      <h3>{exercise.title}</h3>
      <div className="cs-problem-card__section">
        <strong>题目描述</strong>
        <p>{exercise.statement}</p>
      </div>
      {exercise.inputSpec ? (
        <div className="cs-problem-card__section">
          <strong>输入说明</strong>
          <p>{exercise.inputSpec}</p>
        </div>
      ) : null}
      {exercise.outputSpec ? (
        <div className="cs-problem-card__section">
          <strong>输出说明</strong>
          <p>{exercise.outputSpec}</p>
        </div>
      ) : null}
      <div className="cs-problem-card__section">
        <strong>样例</strong>
        <div className="cs-problem-card__samples">
          {exercise.samples.map((sample, index) => (
            <div key={index} className="cs-problem-card__sample">
              {sample.input != null ? <div>输入：{sample.input}</div> : null}
              <div>输出：{sample.output}</div>
              {sample.note ? <div>说明：{sample.note}</div> : null}
            </div>
          ))}
        </div>
      </div>
      {exercise.constraints ? (
        <div className="cs-problem-card__section">
          <strong>数据范围 / 约定</strong>
          <p>{exercise.constraints}</p>
        </div>
      ) : null}
    </div>
  );
}

export function PythonIdeWorkspace() {
  const [trackId, setTrackId] = useState(CS_PRACTICE_TRACKS[0].id);
  const track = useMemo(
    () => CS_PRACTICE_TRACKS.find((t) => t.id === trackId) || CS_PRACTICE_TRACKS[0],
    [trackId],
  );
  const [exerciseId, setExerciseId] = useState(track.local[0]?.id || "");
  const exercise = useMemo(
    () => track.local.find((e) => e.id === exerciseId) || track.local[0],
    [track, exerciseId],
  );

  const [code, setCode] = useState(exercise?.starterCode || "");
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [checkPassed, setCheckPassed] = useState<boolean | null>(null);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const [tutor, setTutor] = useState<TutorMessage[]>(() =>
    initialTutor(track, exercise),
  );
  const [ask, setAsk] = useState("");

  useEffect(() => {
    let alive = true;
    setRuntimeError(null);
    getPyodide()
      .then(() => {
        if (alive) setRuntimeReady(true);
      })
      .catch((error) => {
        if (!alive) return;
        setRuntimeReady(false);
        setRuntimeError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const first = track.local[0];
    setExerciseId(first?.id || "");
    setCode(first?.starterCode || "");
    setStdout("");
    setStderr("");
    setCheckPassed(null);
    if (first) setTutor(initialTutor(track, first));
  }, [track]);

  useEffect(() => {
    if (!exercise) return;
    setCode(exercise.starterCode);
    setStdout("");
    setStderr("");
    setCheckPassed(null);
  }, [exercise?.id]);

  const onRun = async (withCheck: boolean) => {
    if (!runtimeReady) {
      message.warning("Python 运行时还在加载，请稍候");
      return;
    }
    setRunning(true);
    try {
      const result = await runPython(
        code,
        withCheck ? exercise?.checkCode : undefined,
      );
      setStdout(result.stdout);
      setStderr(result.stderr);
      setCheckPassed(withCheck ? result.checkPassed : null);
      if (!result.ok) {
        message.error("运行出错，看看右侧助教");
        setTutor((prev) => [
          ...prev,
          {
            role: "assistant",
            text: tutorReply({
              question: "这段报错什么意思",
              code,
              stderr: result.stderr,
              stdout: result.stdout,
              checkPassed: null,
              exerciseTitle: exercise?.title,
              hint: exercise?.hint,
              statement: exercise?.statement,
            }),
          },
        ]);
      } else if (withCheck && result.checkPassed) {
        message.success("自测通过");
      } else if (withCheck && result.checkPassed === false) {
        message.warning("跑通了，但自测未通过");
        setTutor((prev) => [
          ...prev,
          {
            role: "assistant",
            text: tutorReply({
              question: "自测为啥没过",
              code,
              stderr: result.stderr,
              stdout: result.stdout,
              checkPassed: false,
              exerciseTitle: exercise?.title,
              hint: exercise?.hint,
              statement: exercise?.statement,
            }),
          },
        ]);
      } else {
        message.success("运行完成");
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "运行失败");
    } finally {
      setRunning(false);
    }
  };

  const sendAsk = (text: string) => {
    const question = text.trim();
    if (!question) return;
    const reply = tutorReply({
      question,
      code,
      stderr,
      stdout,
      checkPassed,
      exerciseTitle: exercise?.title,
      hint: exercise?.hint,
      statement: exercise?.statement,
    });
    setTutor((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "assistant", text: reply },
    ]);
    setAsk("");
  };

  const loadShowcase = (demoId: string) => {
    const demo = CS_SHOWCASE_DEMOS.find((item) => item.id === demoId);
    if (!demo) return;
    setCode(demo.code);
    setStdout("");
    setStderr("");
    setCheckPassed(null);
    message.info(`已载入演示：${demo.title}（点「仅运行」即可展示）`);
  };

  return (
    <div className="page-stack cs-practice">
      <section className="page-intro">
        <div>
          <p className="eyebrow">计概 · Python 练习台</p>
          <h1>线上沙箱 + 代码小助教</h1>
          <p className="page-intro__description">
            题目已加到进阶 / 挑战档；上方有写好的演示代码可一键载入。左侧运行自测，右侧助教解读报错，下方链到洛谷 / 力扣。
          </p>
        </div>
        <div className="page-intro__actions">
          <Tag color={runtimeReady ? "green" : "default"}>
            {runtimeReady ? "Pyodide 已就绪" : "加载 Python 中…"}
          </Tag>
          <Link to="/materials?subject=cs">
            <Button icon={<BookOutlined />}>计概资料</Button>
          </Link>
        </div>
      </section>

      {runtimeError ? (
        <Alert
          type="warning"
          showIcon
          message="浏览器 Python 运行时加载失败"
          description={`${runtimeError}（需能访问 jsDelivr CDN）。仍可浏览推荐外链题。`}
        />
      ) : null}

      <Card size="small" className="cs-track-bar">
        <Segmented
          value={trackId}
          onChange={(value) => setTrackId(String(value))}
          options={CS_PRACTICE_TRACKS.map((item) => ({
            label: item.title,
            value: item.id,
          }))}
        />
        <Typography.Paragraph type="secondary" style={{ margin: "10px 0 0" }}>
          {track.summary}
        </Typography.Paragraph>
        <Space wrap style={{ marginTop: 8 }}>
          <Tag icon={<ThunderboltOutlined />} color="purple">
            演示代码
          </Tag>
          {CS_SHOWCASE_DEMOS.map((demo) => (
            <Button key={demo.id} size="small" onClick={() => loadShowcase(demo.id)}>
              {demo.title}
            </Button>
          ))}
        </Space>
      </Card>

      <div className="cs-practice-layout">
        <div className="cs-practice-main">
          <Card
            className="cs-ide-card"
            title={
              <Space wrap>
                <CodeOutlined />
                <span>{exercise?.title || "练习"}</span>
                {exercise ? (
                  <Tag color={difficultyColor[exercise.difficulty]}>
                    {difficultyLabel[exercise.difficulty]}
                  </Tag>
                ) : null}
              </Space>
            }
            extra={
              <Space wrap>
                {track.local.map((item) => (
                  <Button
                    key={item.id}
                    size="small"
                    type={item.id === exercise?.id ? "primary" : "default"}
                    onClick={() => setExerciseId(item.id)}
                  >
                    {item.title}
                  </Button>
                ))}
              </Space>
            }
          >
            {exercise ? <ProblemStatement exercise={exercise} /> : null}
            <textarea
              className="cs-code-editor"
              value={code}
              spellCheck={false}
              onChange={(event) => setCode(event.target.value)}
              aria-label="Python 代码编辑器"
            />
            <Space wrap style={{ marginTop: 12 }}>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={running}
                disabled={!runtimeReady}
                onClick={() => onRun(true)}
              >
                运行并自测
              </Button>
              <Button
                icon={<PlayCircleOutlined />}
                loading={running}
                disabled={!runtimeReady}
                onClick={() => onRun(false)}
              >
                仅运行
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => setCode(exercise?.starterCode || "")}
              >
                重置模板
              </Button>
              <Button
                onClick={() => {
                  if (!exercise?.solutionCode) return;
                  setCode(exercise.solutionCode);
                  setCheckPassed(null);
                  message.info("已载入参考实现，可点「运行并自测」验证");
                }}
              >
                载入参考实现
              </Button>
              {checkPassed === true ? <Tag color="success">自测通过</Tag> : null}
              {checkPassed === false ? <Tag color="warning">自测未过</Tag> : null}
            </Space>
            <div className="cs-console">
              <div>
                <strong>stdout</strong>
                <pre>{stdout || "（暂无输出）"}</pre>
              </div>
              <div>
                <strong>stderr</strong>
                <pre className={stderr ? "is-error" : undefined}>
                  {stderr || "（无报错）"}
                </pre>
              </div>
            </div>
          </Card>

          <Card
            className="cs-external-card"
            title={
              <Space>
                <LinkOutlined />
                本章推荐 · 真实平台
              </Space>
            }
          >
            <div className="cs-external-list">
              {track.external.map((item) => (
                <a
                  key={item.url}
                  className="cs-external-item"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Tag color={platformColor[item.platform]}>
                    {platformLabel[item.platform]}
                  </Tag>
                  <div>
                    <strong>{item.title}</strong>
                    {item.note ? <span>{item.note}</span> : null}
                  </div>
                </a>
              ))}
            </div>
          </Card>
        </div>

        <Card
          className="cs-tutor-card"
          title={
            <Space>
              <RobotOutlined />
              代码小助教
            </Space>
          }
        >
          <div className="cs-tutor-thread">
            {tutor.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`cs-tutor-bubble cs-tutor-bubble--${item.role}`}
              >
                {item.text}
              </div>
            ))}
          </div>
          <Space wrap style={{ marginBottom: 8 }}>
            {TUTOR_QUICK_ASKS.map((item) => (
              <Button key={item} size="small" onClick={() => sendAsk(item)}>
                {item}
              </Button>
            ))}
          </Space>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              value={ask}
              placeholder="例如：NameError 怎么办？"
              onChange={(event) => setAsk(event.target.value)}
              onPressEnter={() => sendAsk(ask)}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => sendAsk(ask)}
            >
              发送
            </Button>
          </Space.Compact>
        </Card>
      </div>
    </div>
  );
}

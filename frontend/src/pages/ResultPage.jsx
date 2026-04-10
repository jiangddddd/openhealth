import { useEffect, useRef, useState } from "react";

import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { createFeedback, fetchDreamDetail, submitFollowup } from "../services/api.js";
import {
  trackDreamResultView,
  trackFollowupResultView,
  trackFollowupSubmit,
} from "../services/tracker.js";

function displayText(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => displayText(item)).join("、");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}：${displayText(item)}`)
      .join("\n");
  }
  return String(value);
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => displayText(item)).filter((item) => item && item !== "-");
  }
  if (value === null || value === undefined || value === "") {
    return [];
  }
  if (typeof value === "string") {
    return value
      .replaceAll("，", ",")
      .replaceAll("、", ",")
      .replaceAll("；", ",")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => displayText(item))
      .filter((item) => item && item !== "-");
  }
  return [String(value)];
}

function normalizeFollowupResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      closerState: displayText(value),
      deeperReason: "-",
      suggestion: "-",
    };
  }
  return {
    closerState: displayText(value.closerState),
    deeperReason: displayText(value.deeperReason),
    suggestion: displayText(value.suggestion),
  };
}

function normalizeDetail(detail) {
  const base = detail?.baseInterpretation || {};
  return {
    ...detail,
    tags: normalizeList(detail?.tags),
    followupInterpretation: normalizeFollowupResult(detail?.followupInterpretation),
    baseInterpretation: {
      ...base,
      goodFor: normalizeList(base?.goodFor),
      avoidFor: normalizeList(base?.avoidFor),
    },
  };
}

function renderList(items, emptyText) {
  if (!items.length) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <ul className="note-bullet-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function ResultPage({
  token,
  selectedDreamId,
  navigate,
  showToast,
}) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    detail: null,
    answer: "",
    followupLoading: false,
    followupResult: null,
  });
  const trackedFollowupIds = useRef(new Set());

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token || !selectedDreamId) {
        if (active) {
          setState((prev) => ({ ...prev, loading: false, error: "EMPTY" }));
        }
        return;
      }

      try {
        const detail = await fetchDreamDetail(token, selectedDreamId);
        const normalizedDetail = normalizeDetail(detail);
        if (active) {
          setState({
            loading: false,
            error: "",
            detail: normalizedDetail,
            answer: "",
            followupLoading: false,
            followupResult: null,
          });
        }
      } catch (error) {
        if (active) {
          setState((prev) => ({ ...prev, loading: false, error: error.message }));
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [selectedDreamId, token]);

  useEffect(() => {
    if (!token || !state.detail?.dreamRecordId) {
      return;
    }
    trackDreamResultView(token, {
      dreamRecordId: state.detail.dreamRecordId,
    });
  }, [state.detail?.dreamRecordId, token]);

  useEffect(() => {
    const followupId = state.detail?.followupId;
    if (!token || !state.detail?.dreamRecordId || !followupId || !state.detail?.followupAnswer) {
      return;
    }
    if (trackedFollowupIds.current.has(followupId)) {
      return;
    }
    trackedFollowupIds.current.add(followupId);
    trackFollowupResultView(token, {
      dreamRecordId: state.detail.dreamRecordId,
      followupId,
    });
  }, [state.detail, token]);

  if (state.loading) {
    return (
      <>
        <PageHeader
          title="梦境笔记"
          description="把这场梦整理成一篇能回看的内容，先读结论，再慢慢看它映射到你最近的状态。"
        />
        <Card>
          <p className="muted">结果加载中...</p>
        </Card>
      </>
    );
  }

  if (state.error || !state.detail) {
    return (
      <>
        <PageHeader
          title="梦境笔记"
          description="把这场梦整理成一篇能回看的内容，先读结论，再慢慢看它映射到你最近的状态。"
        />
        <EmptyState
          title="还没有可展示的梦境笔记"
          description={state.error || "先记录一场梦，系统会帮你整理标题、摘要、基础解读和追问。"}
          buttonText="去记录梦境"
          onAction={() => navigate("input")}
        />
      </>
    );
  }

  const detail = state.detail;
  const base = detail.baseInterpretation || {};
  const hasFollowupAnswer = Boolean(detail.followupAnswer);
  const hasFollowupResult = hasFollowupAnswer || Boolean(state.followupResult);
  const followupInterpretation = state.followupResult || detail.followupInterpretation;
  const articleSections = [
    {
      title: "一句结论",
      content: displayText(base.conclusion),
      emphasis: true,
    },
    {
      title: "梦里的信号",
      content: displayText(base.symbols),
    },
    {
      title: "它更像在映射什么",
      content: displayText(base.mapping),
      multiline: true,
    },
    {
      title: "这个梦在提醒你",
      content: displayText(base.reminder),
    },
  ];

  const handleFollowup = async () => {
    if (!state.answer.trim()) {
      showToast("先写下此刻最真实的一点感受。");
      return;
    }

    setState((prev) => ({ ...prev, followupLoading: true }));
    try {
      const trimmedAnswer = state.answer.trim();
      const data = await submitFollowup(token, {
        dreamRecordId: Number(selectedDreamId),
        followupQuestion: detail.followupQuestion,
        userAnswer: trimmedAnswer,
      });
      trackFollowupSubmit(token, {
        dreamRecordId: Number(selectedDreamId),
        followupId: data.followupId,
        answerLength: trimmedAnswer.length,
      });
      setState((prev) => ({
        ...prev,
        answer: "",
        followupLoading: false,
        detail: {
          ...prev.detail,
          followupId: data.followupId,
          followupAnswer: trimmedAnswer,
          followupInterpretation: normalizeFollowupResult(data.followupInterpretation),
        },
        followupResult: normalizeFollowupResult(data.followupInterpretation),
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, followupLoading: false }));
      showToast(error.message);
    }
  };

  const handleLike = async () => {
    try {
      await createFeedback(token, {
        targetType: "dream",
        targetId: Number(selectedDreamId),
        feedbackType: "like",
        content: "这次解读挺像在说我。",
      });
      showToast("已经收到你的反馈。");
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <>
      <PageHeader
        title="梦境笔记"
        description="像看一篇笔记一样回看这场梦，把它的线索、提醒和延伸都放在同一页里。"
      />

      <div className="note-detail-layout">
        <div className="note-main-column">
          <Card className="note-article-card">
            <div className="note-article-head">
              <div className="note-article-meta">
                <span className="record-type-badge record-type-dream">梦境笔记</span>
                <span className="small">{detail.createdAt || "刚刚更新"}</span>
              </div>
              <h2 className="note-article-title">
                {detail.autoTitle || "这场梦正在提醒你一些最近没被说出口的情绪"}
              </h2>
              <p className="note-article-summary">
                {detail.summary || "它不一定是在预示什么，更像是把你最近的情绪轮廓推到台前。"}
              </p>

              <div className="note-note-tags">
                {(detail.tags || []).length ? (
                  detail.tags.map((tag) => (
                    <span key={tag} className="chip active">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="chip">等待生成标签</span>
                )}
              </div>
            </div>

            <div className="note-article-lead">
              <span className="note-section-label">原始记录</span>
              <p>{detail.dreamText || "这条梦境记录暂时没有原文内容。"}</p>
            </div>

            <div className="note-article-grid">
              {articleSections.map((section) => (
                <section
                  key={section.title}
                  className={`note-article-section ${section.emphasis ? "note-article-section-emphasis" : ""}`.trim()}
                >
                  <span className="note-section-label">{section.title}</span>
                  <p style={section.multiline ? { whiteSpace: "pre-line" } : undefined}>
                    {section.content}
                  </p>
                </section>
              ))}
            </div>

            <section className="note-article-section note-article-section-split">
              <div>
                <span className="note-section-label">今天适合</span>
                {renderList(base.goodFor || [], "今天适合的方向还在整理中。")}
              </div>
              <div>
                <span className="note-section-label">今天不太适合</span>
                {renderList(base.avoidFor || [], "今天暂时没有明显需要避开的提醒。")}
              </div>
            </section>
          </Card>

          <Card className="note-followup-card">
            <div className="note-followup-head">
              <div>
                <span className="note-section-label">继续往下看</span>
                <h3 className="section-title">这条追问会让解读更贴近你当下的处境</h3>
              </div>
              <span className="small">{hasFollowupAnswer ? "已完成补充" : "等待你的回答"}</span>
            </div>

            <div className="note-followup-question">
              <span className="note-section-label">AI 追问</span>
              <p>
                {detail.followupQuestion ||
                  "这个梦最让你放不下的感觉，像不像现实里某件还没真正处理完的事？"}
              </p>
            </div>

            {hasFollowupAnswer ? (
              <div className="note-followup-answer">
                <span className="note-section-label">你的回答</span>
                <p style={{ whiteSpace: "pre-line" }}>{displayText(detail.followupAnswer)}</p>
              </div>
            ) : (
              <div className="note-followup-form">
                <textarea
                  className="textarea"
                  style={{ minHeight: 132 }}
                  placeholder="最近现实里最让你放不下的情绪，或者一直挂在心上的那件事，写下来就可以。"
                  value={state.answer}
                  onChange={(event) => setState((prev) => ({ ...prev, answer: event.target.value }))}
                />
                <div className="note-action-row">
                  <Button onClick={handleFollowup} disabled={state.followupLoading}>
                    {state.followupLoading ? "生成中..." : "生成补充解读"}
                  </Button>
                </div>
              </div>
            )}

            {hasFollowupResult ? (
              <div className="note-followup-grid">
                <article className="note-followup-panel">
                  <span className="note-section-label">更贴近你的状态</span>
                  <p style={{ whiteSpace: "pre-line" }}>{followupInterpretation.closerState}</p>
                </article>
                <article className="note-followup-panel">
                  <span className="note-section-label">更深一层的原因</span>
                  <p style={{ whiteSpace: "pre-line" }}>{followupInterpretation.deeperReason}</p>
                </article>
                <article className="note-followup-panel">
                  <span className="note-section-label">接下来可以做什么</span>
                  <p style={{ whiteSpace: "pre-line" }}>{followupInterpretation.suggestion}</p>
                </article>
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="note-side-column">
          <Card className="note-side-card">
            <span className="note-side-label">这篇笔记的重点</span>
            <h3>{detail.summary || "今天更适合先看清自己的情绪，再做下一步判断。"}</h3>
            <p className="muted">
              这不是一次一次性的结果页，而是一条可以回看、继续补充和继续延展的梦境笔记。
            </p>

            <div className="note-side-stats">
              <div className="note-side-stat">
                <span>标签数</span>
                <strong>{detail.tags?.length || 0}</strong>
              </div>
              <div className="note-side-stat">
                <span>追问状态</span>
                <strong>{hasFollowupAnswer ? "已补充" : "待补充"}</strong>
              </div>
            </div>

            <div className="note-side-tags">
              {(detail.tags || []).length ? (
                detail.tags.map((tag) => <span key={tag}>{tag}</span>)
              ) : (
                <span>等待生成标签</span>
              )}
            </div>

            <div className="note-action-stack">
              <Button onClick={() => navigate("membership")}>解锁深度解析</Button>
              <Button variant="secondary" onClick={handleLike}>
                喜欢这次解读
              </Button>
            </div>
          </Card>

          <Card className="note-side-card">
            <span className="note-side-label">继续浏览</span>
            <h3>把今天的记录继续补完整</h3>
            <p className="muted">
              你可以继续记录新的梦境，或者回到历史页，把最近几次的情绪线索串在一起看。
            </p>

            <div className="note-action-stack">
              <Button variant="secondary" onClick={() => navigate("input")}>
                再记一场梦
              </Button>
              <Button variant="secondary" onClick={() => navigate("history")}>
                查看历史记录
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

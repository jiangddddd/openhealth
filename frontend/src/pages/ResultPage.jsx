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
      .replaceAll(";", ",")
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
        console.log("dream detail response:", normalizedDetail);
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
        <PageHeader title="梦境解析结果" description="你的梦里正在传递怎样的信号？" />
        <Card>
          <p className="muted">结果加载中...</p>
        </Card>
      </>
    );
  }

  if (state.error || !state.detail) {
    return (
      <>
        <PageHeader title="梦境解析结果" description="你的梦里正在传递怎样的信号？" />
        <EmptyState
          title="还没有可展示的解析"
          description={state.error || "先记录一个梦，结果页就会自动展示你的基础解读和追问。"}
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

  const handleFollowup = async () => {
    if (!state.answer.trim()) {
      showToast("先写下你的回答。");
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
        content: "这次还挺像在说我的",
      });
      showToast("已记录你的喜欢反馈。");
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <>
      <PageHeader title={detail.autoTitle || "梦境解析结果"} description="你的梦里正在传递怎样的信号？" />

      <Card>
        <div className="chip-row">
          {(detail.tags || []).map((tag) => (
            <span key={tag} className="chip active">
              {tag}
            </span>
          ))}
        </div>
        <p className="small" style={{ marginTop: 12 }}>
          记录时间：{detail.createdAt}
        </p>
        <div className="history-dream-text" style={{ marginTop: 12 }}>
          {detail.dreamText || "未保存原文内容"}
        </div>
        <p className="muted">{detail.summary || ""}</p>
      </Card>

      <Card title="基础解读">
        <div className="result-grid">
          <div className="result-item">
            <h4>一句结论</h4>
            <p>{displayText(base.conclusion)}</p>
          </div>
          <div className="result-item">
            <h4>梦中象征</h4>
            <p>{displayText(base.symbols)}</p>
          </div>
          <div className="result-item">
            <h4>现实映射</h4>
            <p style={{ whiteSpace: "pre-line" }}>{displayText(base.mapping)}</p>
          </div>
          <div className="result-item">
            <h4>提醒</h4>
            <p>{displayText(base.reminder)}</p>
          </div>
          <div className="result-item">
            <h4>宜</h4>
            <ul>{(base.goodFor || []).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="result-item">
            <h4>忌</h4>
            <ul>{(base.avoidFor || []).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </Card>

      <Card title="再问你一个问题">
        <div className="stack">
          <div className="result-item">
            <h4>AI 追问</h4>
            <p>{detail.followupQuestion || "这个梦最让你放不下的感觉，像不像现实里的某件事？"}</p>
          </div>
          {hasFollowupAnswer ? (
            <div className="result-item">
              <h4>你的回答</h4>
              <p style={{ whiteSpace: "pre-line" }}>{displayText(detail.followupAnswer)}</p>
            </div>
          ) : (
            <>
              <textarea
                className="textarea"
                style={{ minHeight: 120 }}
                placeholder="写下你的回答，让这次解读更贴近你的真实状态。"
                value={state.answer}
                onChange={(event) => setState((prev) => ({ ...prev, answer: event.target.value }))}
              />
              <Button onClick={handleFollowup} disabled={state.followupLoading}>
                {state.followupLoading ? "生成中..." : "生成补充解析"}
              </Button>
            </>
          )}
          {hasFollowupResult ? (
            <Card title="补充解析">
              <div className="result-grid">
                <div className="result-item">
                  <h4>更贴近你的状态</h4>
                  <p style={{ whiteSpace: "pre-line" }}>
                    {displayText((detail.followupInterpretation || state.followupResult).closerState)}
                  </p>
                </div>
                <div className="result-item">
                  <h4>更深一层的原因</h4>
                  <p style={{ whiteSpace: "pre-line" }}>
                    {displayText((detail.followupInterpretation || state.followupResult).deeperReason)}
                  </p>
                </div>
                <div className="result-item">
                  <h4>一个建议</h4>
                  <p style={{ whiteSpace: "pre-line" }}>
                    {displayText((detail.followupInterpretation || state.followupResult).suggestion)}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </Card>

      <Card title="继续解锁更完整解读">
        <p className="muted">
          深度版会补充情绪根源、内在课题和更完整的行动建议，适合持续记录的用户。
        </p>
        <div className="inline-actions">
          <Button onClick={() => navigate("membership")}>去会员页看看</Button>
          <Button variant="secondary" onClick={handleLike}>
            喜欢这次解读
          </Button>
        </div>
      </Card>
    </>
  );
}

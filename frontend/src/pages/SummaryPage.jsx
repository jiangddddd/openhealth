import { useEffect, useMemo, useState } from "react";

import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { fetchSummaryToday, generateSummary } from "../services/api.js";

function parseSummaryData(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function SummaryPage({
  token,
  navigate,
  showToast,
  selectedSummaryData,
  setSelectedSummaryData,
  setHistoryFilter,
}) {
  const summaryDetail = useMemo(() => parseSummaryData(selectedSummaryData), [selectedSummaryData]);
  const [state, setState] = useState({
    loading: !summaryDetail,
    data: summaryDetail,
    error: "",
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (summaryDetail) {
        setState({ loading: false, data: summaryDetail, error: "" });
        return;
      }
      if (!token) {
        if (active) {
          setState({ loading: false, data: null, error: "NOT_LOGIN" });
        }
        return;
      }

      try {
        const todaySummary = await fetchSummaryToday(token);
        if (!active) {
          return;
        }
        if (todaySummary) {
          setState({ loading: false, data: todaySummary, error: "" });
          return;
        }
        const generated = await generateSummary(token, { forceRegenerate: false });
        if (active) {
          setState({ loading: false, data: generated, error: "" });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, data: null, error: error.message });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [summaryDetail, token]);

  if (state.loading) {
    return (
      <>
        <PageHeader title="今天的情绪总结" description="从今天的记录里，我们帮你整理出了几个更值得留意的点。" />
        <Card>
          <p className="muted">总结生成中...</p>
        </Card>
      </>
    );
  }

  if (state.error || !state.data) {
    return (
      <>
        <PageHeader title="今天的情绪总结" description="从今天的记录里，我们帮你整理出了几个更值得留意的点。" />
        <EmptyState
          title="今天还没有可展示的总结"
          description={state.error === "NOT_LOGIN" ? "先登录，再让今天的记录慢慢整理成更清楚的线索。" : state.error || "今天还没有足够的记录。先记一次心情，我们再帮你整理今天的状态。"}
          buttonText="去记录今天的心情"
          onAction={() => navigate("mood")}
        />
      </>
    );
  }

  const detail = state.data;

  return (
    <>
      <PageHeader title="今天的情绪总结" description="从今天的记录里，我们帮你整理出了几个更值得留意的点。" />

      <Card className="summary-hero-card">
        <div className="summary-hero">
          <div className="summary-hero-top">
            <div>
              <div className="summary-date">{detail.summaryDate}</div>
              <div className="badge">今日状态总结</div>
            </div>
            <span className="record-type-badge record-type-summary">总结</span>
          </div>
          <h3 className="section-title">今天的整体状态</h3>
          <div className="summary-lead-text">{detail.overallStatus}</div>
          <p className="section-desc">这不是判断，而是帮你更快看见今天的状态重点。</p>
        </div>
      </Card>

      <div className="page-grid page-grid-summary">
        <Card title="今天更容易被什么影响">
          <div className="result-item">
            <p>{detail.mainFactors}</p>
          </div>
        </Card>

        <Card title="你需要留意的点">
          <div className="result-item">
            <p>{detail.attentionPoint}</p>
          </div>
        </Card>

        <Card title="给你的一个提醒" className="span-2">
          <div className="result-item">
            <p>{detail.reminder}</p>
          </div>
        </Card>

        <Card title="今天可以怎样照顾自己" className="span-2 summary-diet-card">
          <p className="section-desc">从饮食和节奏上，给今天的状态一点更轻的支持。</p>
          <div className="result-grid summary-diet-grid">
            <div className="result-item">
              <h4>今天适合的饮食方向</h4>
              <p>{detail.dietAdvice.direction}</p>
            </div>
            <div className="result-item">
              <h4>可以优先吃什么</h4>
              <ul>{(detail.dietAdvice.eatMore || []).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="result-item">
              <h4>今天尽量少一点什么</h4>
              <ul>{(detail.dietAdvice.eatLess || []).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="result-item">
              <h4>一个补充提醒</h4>
              <p>{detail.dietAdvice.tip}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="membership-cta-card">
        <div className="stack">
          <Button
            onClick={() => {
              setSelectedSummaryData("");
              navigate("mood");
            }}
          >
            重新记录心情
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedSummaryData("");
              setHistoryFilter("summary");
              navigate("history");
            }}
          >
            查看历史总结
          </Button>
          <Button variant="secondary" onClick={() => navigate("membership")}>
            查看增强版总结
          </Button>
        </div>
      </Card>
    </>
  );
}

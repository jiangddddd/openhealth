import { useEffect, useState } from "react";

import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { fetchDreamList, fetchMoodList, fetchSummaryList } from "../services/api.js";
import { trackDreamEntryClick, trackHistoryItemClick, trackHistoryView } from "../services/tracker.js";

function formatTimeLabel(value) {
  if (!value || typeof value !== "string" || value.length < 16) {
    return "";
  }
  return value.slice(11, 16);
}

function formatGroupDate(value) {
  if (!value) {
    return "更早之前";
  }
  const today = new Date();
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return String(value);
  }
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.round((startToday - startTarget) / 86400000);
  if (diffDays === 0) {
    return "今天";
  }
  if (diffDays === 1) {
    return "昨天";
  }
  return `${target.getMonth() + 1} 月 ${target.getDate()} 日`;
}

function getRecordTypeLabel(type) {
  if (type === "dream") {
    return "梦境";
  }
  if (type === "mood") {
    return "心情";
  }
  return "总结";
}

function formatArchiveDate(item) {
  return item.date || item.recordDate || item.summaryDate || "";
}

function formatLatestArchiveLabel(item) {
  if (!item) {
    return "刚开始整理";
  }
  const dateText = formatArchiveDate(item);
  const timeText = formatTimeLabel(item.updatedAt || item.createdAt || "");
  const typeLabel = getRecordTypeLabel(item.recordType);
  if (dateText && timeText) {
    return `${typeLabel} · ${dateText} ${timeText}`;
  }
  if (dateText) {
    return `${typeLabel} · ${dateText}`;
  }
  return `${typeLabel} · 最近更新`;
}

export default function HistoryPage({
  token,
  navigate,
  openLogin,
  setSelectedDreamId,
  setSelectedMoodData,
  setSelectedSummaryData,
  historyFilter,
  setHistoryFilter,
}) {
  const [state, setState] = useState({ loading: true, error: "", dreams: [], moods: [], summaries: [] });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", dreams: [], moods: [], summaries: [] });
        }
        return;
      }

      try {
        const [dreams, moods, summaries] = await Promise.all([
          fetchDreamList(token, 1, 20),
          fetchMoodList(token, 1, 20),
          fetchSummaryList(token, 1, 20),
        ]);
        if (active) {
          trackHistoryView(token);
          setState({
            loading: false,
            error: "",
            dreams: dreams.list || [],
            moods: moods.list || [],
            summaries: summaries.list || [],
          });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, dreams: [], moods: [], summaries: [] });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  if (state.loading) {
    return (
      <>
        <PageHeader
          title="我的记录"
          description="梦境、心情和总结，都会慢慢连成属于你的线索。"
          action={<span className="history-header-pill">正在整理</span>}
        />
        <div className="card">
          <p className="muted">历史记录加载中...</p>
        </div>
      </>
    );
  }

  if (state.error === "NOT_LOGIN") {
    return (
      <>
        <PageHeader
          title="我的记录"
          description="梦境、心情和总结，都会慢慢连成属于你的线索。"
          action={<span className="history-header-pill">登录后开启</span>}
        />
        <EmptyState
          title="登录后查看你的个人档案"
          description="先登录，梦境、心情和总结才会慢慢沉淀成可回看的时间线。"
          buttonText="先去登录"
          onAction={openLogin}
        />
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <PageHeader
          title="我的记录"
          description="梦境、心情和总结，都会慢慢连成属于你的线索。"
          action={<span className="history-header-pill">暂时不可用</span>}
        />
        <EmptyState
          title="记录暂时没有加载成功"
          description={state.error}
          buttonText="重新加载"
          onAction={() => window.location.reload()}
        />
      </>
    );
  }

  const mergedList = [
    ...state.dreams.map((item) => ({ ...item, recordType: "dream" })),
    ...state.moods.map((item) => ({ ...item, recordType: "mood" })),
    ...state.summaries.map((item) => ({ ...item, recordType: "summary" })),
  ].sort((a, b) => String(b.updatedAt || b.createdAt || b.date).localeCompare(String(a.updatedAt || a.createdAt || a.date)));

  const visibleList =
    historyFilter === "dream"
      ? mergedList.filter((item) => item.recordType === "dream")
      : historyFilter === "mood"
        ? mergedList.filter((item) => item.recordType === "mood")
        : historyFilter === "summary"
          ? mergedList.filter((item) => item.recordType === "summary")
          : mergedList;

  const groupedList = visibleList.reduce((accumulator, item) => {
    const groupKey = item.date || item.recordDate || item.summaryDate || "unknown";
    const currentGroup = accumulator[groupKey] || [];
    return {
      ...accumulator,
      [groupKey]: [...currentGroup, item],
    };
  }, {});

  const groupKeys = Object.keys(groupedList).sort((a, b) => String(b).localeCompare(String(a)));
  const latestRecord = mergedList[0] || null;
  const filterItems = [
    { key: "all", label: "全部", count: mergedList.length },
    { key: "dream", label: "梦境", count: state.dreams.length },
    { key: "mood", label: "心情", count: state.moods.length },
    { key: "summary", label: "总结", count: state.summaries.length },
  ];

  if (!visibleList.length) {
    const hasAnyRecords = mergedList.length > 0;
    const isFilteredEmpty = historyFilter !== "all" && hasAnyRecords;
    return (
      <>
        <PageHeader
          title="我的记录"
          description="梦境、心情和总结，都会慢慢连成属于你的线索。"
          action={<span className="history-header-pill">当前为空</span>}
        />
        <EmptyState
          title={isFilteredEmpty ? "当前筛选下暂无记录" : "这里还没有可展示的记录"}
          description={
            isFilteredEmpty
              ? "你已经有其他类型的记录了，先切回“全部”看看。"
              : "从第一次心情记录开始，你会慢慢看见自己的变化。"
          }
          buttonText={isFilteredEmpty ? "查看全部记录" : "开始记录"}
          onAction={() => {
            if (isFilteredEmpty) {
              setHistoryFilter("all");
              return;
            }
            trackDreamEntryClick(token, { fromPage: "history", pageName: "history" });
            navigate("record");
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="我的记录"
        description="梦境、心情和总结，都会慢慢连成属于你的线索。"
        action={<span className="history-header-pill">展示中 · {visibleList.length} 条</span>}
      />

      <section className="card history-archive-card">
        <div className="history-archive-grid">
          <div className="history-archive-main">
            <div className="history-kicker">Personal Archive</div>
            <h2 className="history-archive-title">每一次记录都不是孤立的，它们会在时间里互相照亮。</h2>
            <p className="history-archive-description">
              当你把梦境、心情和总结放进同一条时间线里看，很多原本零散的感受就会慢慢变得更有上下文。
            </p>
            <div className="history-archive-tags">
              <span className="history-meta-chip">{formatLatestArchiveLabel(latestRecord)}</span>
              <span className="history-meta-chip">{state.dreams.length} 条梦境记录</span>
              <span className="history-meta-chip">{state.moods.length} 条心情记录</span>
            </div>
          </div>

          <div className="history-archive-side">
            <article className="history-spotlight-card">
              <span>最近更新</span>
              <strong>{latestRecord ? getRecordTypeLabel(latestRecord.recordType) : "还没有内容"}</strong>
              <p>{latestRecord ? formatLatestArchiveLabel(latestRecord) : "开始记录后，这里会先告诉你最新发生了什么。"}</p>
            </article>

            <div className="history-overview-grid">
              <article className="history-overview-card">
                <span>梦境</span>
                <strong>{state.dreams.length}</strong>
                <p>保存最近反复出现的画面与符号。</p>
              </article>
              <article className="history-overview-card">
                <span>心情</span>
                <strong>{state.moods.length}</strong>
                <p>保留每天最重要的情绪快照。</p>
              </article>
              <article className="history-overview-card">
                <span>总结</span>
                <strong>{state.summaries.length}</strong>
                <p>让零散记录沉淀成更完整的一页。</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="history-filter-panel">
        <div className="history-filter-head">
          <div>
            <div className="history-filter-kicker">筛选视图</div>
            <h3 className="section-title">按你想看的方式重新编排时间线</h3>
          </div>
          <button type="button" className="ghost-button" onClick={() => navigate("trend")}>
            去看趋势
          </button>
        </div>

        <div className="history-filter-pills">
          {filterItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`history-filter-pill ${historyFilter === item.key ? "active" : ""}`}
              onClick={() => setHistoryFilter(item.key)}
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="history-timeline-shell">
        <div className="history-filter-kicker">时间线</div>
        <div className="history-timeline-list">
          {groupKeys.map((groupKey) => (
            <section key={groupKey} className="history-timeline-section">
              <div className="history-timeline-head">
                <div className="history-timeline-date">
                  <strong>{formatGroupDate(groupKey)}</strong>
                  <span>{groupedList[groupKey].length} 条记录</span>
                </div>
                <div className="history-timeline-line" aria-hidden="true" />
              </div>

              <div className="history-timeline-cards">
                {groupedList[groupKey].map((item, index) => (
                  <button
                    key={`${item.recordType}-${item.dreamRecordId || item.moodRecordId || item.summaryId || index}`}
                    type="button"
                    className={`archive-entry-card archive-entry-card-${item.recordType}`}
                    onClick={() => {
                      if (item.recordType === "dream") {
                        trackHistoryItemClick(token, { dreamRecordId: item.dreamRecordId });
                        setSelectedDreamId(String(item.dreamRecordId));
                        navigate("result");
                        return;
                      }
                      if (item.recordType === "mood") {
                        setSelectedMoodData(JSON.stringify(item));
                        navigate("mood");
                        return;
                      }
                      setSelectedSummaryData(JSON.stringify(item));
                      navigate("summary");
                    }}
                  >
                    <div className="archive-entry-top">
                      <span className={`record-type-badge record-type-${item.recordType}`}>
                        {getRecordTypeLabel(item.recordType)}
                      </span>
                      <span className="archive-entry-time">
                        {item.recordType === "mood"
                          ? `${item.recordDate}${formatTimeLabel(item.createdAt) ? ` · ${formatTimeLabel(item.createdAt)}` : ""}`
                          : formatArchiveDate(item)}
                      </span>
                    </div>

                    <div className="archive-entry-body">
                      <strong className="archive-entry-title">
                        {item.recordType === "dream"
                          ? item.autoTitle || "未命名梦境"
                          : item.recordType === "mood"
                            ? `${item.moodType} · 强度 ${item.moodIntensity}`
                            : "每日总结"}
                      </strong>
                    </div>

                    {item.recordType === "dream" ? (
                      <>
                        <div className="archive-entry-tags">
                          {(item.tags || []).map((tag) => (
                            <span key={tag} className="archive-entry-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="archive-entry-quote">{item.dreamText || "未保存原文内容"}</div>
                        <div className="archive-entry-copy">{item.summary || "点击查看这次解析"}</div>
                      </>
                    ) : null}

                    {item.recordType === "mood" ? (
                      <>
                        <div className="archive-entry-meter">
                          <div className="archive-entry-meter-fill" style={{ width: `${(Number(item.moodIntensity) || 0) * 20}%` }} />
                        </div>
                        <div className="archive-entry-tags">
                          {(item.moodTags || []).map((tag) => (
                            <span key={tag} className="archive-entry-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="archive-entry-copy">{item.moodReason || "点击查看这次心情记录"}</div>
                      </>
                    ) : null}

                    {item.recordType === "summary" ? (
                      <div className="archive-summary-block">
                        <div className="section-eyebrow">今日整体状态</div>
                        <div className="archive-entry-copy">{item.overallStatus}</div>
                        <div className="archive-entry-helper">{item.reminder}</div>
                      </div>
                    ) : null}

                    <div className="archive-entry-foot">
                      <span>打开这条记录</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </>
  );
}

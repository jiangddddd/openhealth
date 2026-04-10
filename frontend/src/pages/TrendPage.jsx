import { useEffect, useMemo, useState } from "react";

import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { fetchDreamList, fetchMoodList, fetchProfile, fetchSummaryList } from "../services/api.js";

function getDateKey(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(dateKey) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateKey;
  }
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function getLatestMoodByDate(moods) {
  const latestByDate = new Map();
  moods.forEach((item) => {
    const dateKey = getDateKey(item.recordDate || item.createdAt);
    if (dateKey && !latestByDate.has(dateKey)) {
      latestByDate.set(dateKey, item);
    }
  });
  return latestByDate;
}

function buildRecentSevenDays(moods) {
  const latestByDate = getLatestMoodByDate(moods);
  const days = [];
  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - offset);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;
    const mood = latestByDate.get(dateKey) || null;
    days.push({
      dateKey,
      label: formatDayLabel(dateKey),
      moodType: mood?.moodType || "未记录",
      moodIntensity: mood?.moodIntensity || 0,
      hasRecord: Boolean(mood),
    });
  }
  return days;
}

function getTopEntries(items, iteratee, limit = 5) {
  const counts = new Map();
  items.forEach((item) => {
    const values = iteratee(item).filter(Boolean);
    values.forEach((value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function getAverageIntensity(moods) {
  if (!moods.length) {
    return 0;
  }
  const total = moods.reduce((sum, item) => sum + (Number(item.moodIntensity) || 0), 0);
  return total / moods.length;
}

function getIntensityDescription(value) {
  if (value >= 4) {
    return "比较明显";
  }
  if (value >= 2.5) {
    return "时有波动";
  }
  return "相对轻一些";
}

function buildTrendChart(days) {
  const width = 640;
  const height = 210;
  const paddingX = 28;
  const paddingTop = 18;
  const paddingBottom = 28;
  const chartHeight = height - paddingTop - paddingBottom;
  const stepX = (width - paddingX * 2) / Math.max(days.length - 1, 1);

  const points = days.map((item, index) => {
    const intensity = Number(item.moodIntensity) || 0;
    const x = paddingX + stepX * index;
    const y = paddingTop + chartHeight - (intensity / 5) * chartHeight;
    return {
      ...item,
      x,
      y,
      intensity,
    };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = [
    `M ${points[0]?.x || paddingX} ${height - paddingBottom}`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
    `L ${points[points.length - 1]?.x || width - paddingX} ${height - paddingBottom}`,
    "Z",
  ].join(" ");

  return {
    width,
    height,
    points,
    linePoints,
    areaPath,
  };
}

function buildPeriodCards(days, averageIntensity, dominantMood, dominantTrigger) {
  const recentThree = days.slice(-3).filter((item) => item.hasRecord);
  const recentWeekCount = days.filter((item) => item.hasRecord).length;
  const recentThreeAverage = recentThree.length
    ? recentThree.reduce((sum, item) => sum + item.moodIntensity, 0) / recentThree.length
    : 0;

  return [
    {
      title: "最近 3 天",
      value: recentThree.length ? `${getIntensityDescription(recentThreeAverage)}的起伏` : "还在慢慢形成",
      text: recentThree.length
        ? "这几天的感受更值得被留意一下，也许它正在反复提醒你什么。"
        : "先继续记录几天，这里会更快出现属于你的短周期变化。",
    },
    {
      title: "最近 7 天",
      value: `${recentWeekCount} 天有记录`,
      text:
        recentWeekCount >= 5
          ? "这周已经有比较稳定的记录，开始能看见一些重复出现的节奏。"
          : "再多记录几天，趋势会更完整，也更容易看见真正的波动点。",
    },
    {
      title: "当前阶段",
      value: dominantMood?.label || "慢慢看见",
      text: dominantTrigger
        ? `最近更容易被“${dominantTrigger.label}”牵动，先别急着解决，先把它看清楚。`
        : averageIntensity
          ? "你已经开始有自己的节奏线索了，继续记录会更清楚。"
          : "现在先保持记录，状态线索会慢慢连起来。",
    },
  ];
}

export default function TrendPage({ token, openLogin, navigate }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    profile: null,
    moods: [],
    dreams: [],
    summaries: [],
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({
            loading: false,
            error: "NOT_LOGIN",
            profile: null,
            moods: [],
            dreams: [],
            summaries: [],
          });
        }
        return;
      }

      try {
        const [profile, moods, dreams, summaries] = await Promise.all([
          fetchProfile(token),
          fetchMoodList(token, 1, 50),
          fetchDreamList(token, 1, 30),
          fetchSummaryList(token, 1, 30),
        ]);

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: "",
          profile,
          moods: moods.list || [],
          dreams: dreams.list || [],
          summaries: summaries.list || [],
        });
      } catch (error) {
        if (active) {
          setState({
            loading: false,
            error: error.message,
            profile: null,
            moods: [],
            dreams: [],
            summaries: [],
          });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const recentSevenDays = useMemo(() => buildRecentSevenDays(state.moods), [state.moods]);
  const dominantMoods = useMemo(() => getTopEntries(state.moods, (item) => [item.moodType]), [state.moods]);
  const dominantTriggers = useMemo(() => getTopEntries(state.moods, (item) => item.moodTags || []), [state.moods]);
  const dominantDreamSignals = useMemo(
    () => getTopEntries(state.dreams, (item) => item.tags || item.dreamSymbols || []),
    [state.dreams],
  );
  const averageIntensity = useMemo(() => getAverageIntensity(state.moods), [state.moods]);
  const chart = useMemo(() => buildTrendChart(recentSevenDays), [recentSevenDays]);

  const enoughData = state.moods.length >= 3 || state.summaries.length >= 2;
  const recentSummary = state.summaries[0] || null;
  const trackedDays = recentSevenDays.filter((item) => item.hasRecord).length;
  const strongestMood = dominantMoods[0] || null;
  const strongestTrigger = dominantTriggers[0] || null;
  const strongestDreamSignal = dominantDreamSignals[0] || null;
  const periodCards = buildPeriodCards(recentSevenDays, averageIntensity, strongestMood, strongestTrigger);
  const cycleText = strongestMood
    ? `当你处在${strongestTrigger ? `和${strongestTrigger.label}相关` : "比较疲惫或用力过度"}的状态时，更容易出现${strongestMood.label}这样${getIntensityDescription(averageIntensity)}的情绪波动。`
    : "当你开始持续记录之后，这里会慢慢出现更贴近你的情绪循环。";
  const reminderText =
    recentSummary?.reminder ||
    "不是所有波动都需要立刻解决。但当你开始看见它们的规律，就已经是在慢慢找回主动权了。";
  const trendHeadline = strongestMood
    ? `最近最常出现的是“${strongestMood.label}”，整体波动属于${getIntensityDescription(averageIntensity)}。`
    : "趋势才刚开始形成，继续记录几天之后，这页会更像属于你的情绪图谱。";

  if (state.loading) {
    return (
      <>
        <PageHeader
          title="我的情绪轨迹"
          description="连续记录后，你会更容易看见自己的情绪节奏和触发点。"
          action={<span className="trend-header-pill">正在整理</span>}
        />
        <Card>
          <p className="muted">趋势整理中...</p>
        </Card>
      </>
    );
  }

  if (state.error === "NOT_LOGIN") {
    return (
      <>
        <PageHeader
          title="我的情绪轨迹"
          description="连续记录后，你会更容易看见自己的情绪节奏和触发点。"
          action={<span className="trend-header-pill">登录后开启</span>}
        />
        <EmptyState
          title="登录后查看你的情绪轨迹"
          description="先登录，再让梦境、心情和总结慢慢连成更完整的线索。"
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
          title="我的情绪轨迹"
          description="连续记录后，你会更容易看见自己的情绪节奏和触发点。"
          action={<span className="trend-header-pill">暂时不可用</span>}
        />
        <EmptyState
          title="趋势暂时还没有准备好"
          description={state.error}
          buttonText="查看我的记录"
          onAction={() => navigate("history")}
        />
      </>
    );
  }

  if (!enoughData) {
    return (
      <>
        <PageHeader
          title="我的情绪轨迹"
          description="连续记录后，你会更容易看见自己的情绪节奏和触发点。"
          action={<span className="trend-header-pill">数据还在积累</span>}
        />
        <EmptyState
          title="你的情绪轨迹还在形成。"
          description="连续记录几天后，这里会慢慢出现属于你的变化曲线和模式提醒。"
          buttonText="去记录"
          onAction={() => navigate("record")}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="我的情绪轨迹"
        description="连续记录后，你会更容易看见自己的情绪节奏和触发点。"
        action={<span className="trend-header-pill">近 7 天 · {trackedDays} 天有记录</span>}
      />

      <Card className="trend-atlas-card">
        <div className="trend-atlas-grid">
          <div className="trend-atlas-main">
            <div className="trend-kicker">Emotion Atlas</div>
            <h2 className="trend-atlas-title">你的变化，正在从零散记录变成可以阅读的节奏。</h2>
            <p className="trend-atlas-description">
              不需要一下子把自己想明白。先把情绪、梦境和总结放进时间里看，你会更容易发现那些反复出现的模式。
            </p>
            <div className="trend-atlas-tags">
              <span className="trend-meta-chip">连续记录 {state.profile?.consecutiveDays || 0} 天</span>
              <span className="trend-meta-chip">{strongestMood ? `高频情绪：${strongestMood.label}` : "高频情绪还在形成"}</span>
              <span className="trend-meta-chip">{strongestTrigger ? `主要触发：${strongestTrigger.label}` : "触发点还在形成"}</span>
            </div>
          </div>

          <div className="trend-atlas-side">
            <article className="trend-spotlight-card">
              <span>一句看法</span>
              <strong>{trendHeadline}</strong>
              <p>{reminderText}</p>
            </article>
            <article className="trend-spotlight-card">
              <span>近期梦境信号</span>
              <strong>{strongestDreamSignal?.label || "还没有明显主题"}</strong>
              <p>
                {strongestDreamSignal
                  ? `梦里“${strongestDreamSignal.label}”出现得更多，也许它正和最近的情绪波动互相呼应。`
                  : "当梦境记录再多一些，这里会慢慢出现更稳定的主题线索。"}
              </p>
            </article>
          </div>
        </div>
      </Card>

      <section className="trend-section">
        <div className="trend-section-head">
          <div>
            <div className="trend-section-kicker">快速概览</div>
            <h3 className="section-title">先看今天最值得记住的几件事</h3>
          </div>
          <p className="trend-section-description">把近一周的核心节奏压缩成几块更容易理解的小面板。</p>
        </div>

        <div className="trend-overview-grid">
          <article className="trend-overview-card">
            <span>近 7 天记录</span>
            <strong>{trackedDays}/7</strong>
            <p>记录越连续，图谱里的节奏感就会越清楚。</p>
          </article>
          <article className="trend-overview-card">
            <span>平均强度</span>
            <strong>{averageIntensity ? averageIntensity.toFixed(1) : "-"}</strong>
            <p>最近的整体起伏属于{averageIntensity ? getIntensityDescription(averageIntensity) : "还在形成"}。</p>
          </article>
          <article className="trend-overview-card">
            <span>高频情绪</span>
            <strong>{strongestMood?.label || "慢慢形成"}</strong>
            <p>{strongestMood ? "它是最近最常浮上来的情绪表情。" : "继续记录后，这里会先稳定下来。"}</p>
          </article>
          <article className="trend-overview-card">
            <span>主要触发点</span>
            <strong>{strongestTrigger?.label || "继续记录"}</strong>
            <p>{strongestTrigger ? "这是近期更容易牵动你的那件事。" : "当你多标一点原因后，它会更快出现。"}</p>
          </article>
        </div>
      </section>

      <div className="trend-window-grid">
        {periodCards.map((card) => (
          <article key={card.title} className="trend-window-card">
            <span>{card.title}</span>
            <h3>{card.value}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>

      <div className="trend-dashboard-grid">
        <Card title="最近 7 天情绪变化" className="trend-dashboard-card trend-chart-surface">
          <div className="trend-chart-head trend-chart-head-polished">
            <div className="helper-text">折线代表每天记录到的主要情绪强度，越高表示这一天的感受越明显。</div>
            <div className="trend-chart-badge">最近 7 天</div>
          </div>
          <div className="trend-svg-wrap">
            <svg className="trend-svg" viewBox={`0 0 ${chart.width} ${chart.height}`} aria-label="最近 7 天情绪变化趋势">
              {[1, 2, 3, 4, 5].map((level) => {
                const y = chart.height - 28 - ((level / 5) * (chart.height - 46));
                return (
                  <g key={level}>
                    <line x1="28" y1={y} x2={chart.width - 28} y2={y} className="trend-grid-line" />
                    <text x="6" y={y + 4} className="trend-axis-text">
                      {level}
                    </text>
                  </g>
                );
              })}
              <path d={chart.areaPath} className="trend-area-path" />
              <polyline points={chart.linePoints} className="trend-line-path" />
              {chart.points.map((point) => (
                <g key={point.dateKey}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.hasRecord ? 5 : 3.5}
                    className={point.hasRecord ? "trend-point-active" : "trend-point-muted"}
                  />
                  <text x={point.x} y={chart.height - 6} className="trend-axis-text trend-axis-day" textAnchor="middle">
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="trend-chart-caption">{trendHeadline}</div>
        </Card>

        <Card title="最近最常出现的状态" className="trend-dashboard-card">
          <div className="trend-bar-list">
            {dominantMoods.length ? (
              dominantMoods.map((item) => {
                const percent = strongestMood ? (item.count / strongestMood.count) * 100 : 0;
                return (
                  <div key={item.label} className="trend-bar-item">
                    <div className="list-item-top">
                      <strong>{item.label}</strong>
                      <span>{item.count} 次</span>
                    </div>
                    <div className="trend-bar-track">
                      <div className="trend-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="muted">继续记录后，这里会慢慢出现更清楚的状态线索。</p>
            )}
          </div>
        </Card>

        <Card title="最容易影响你的事情" className="trend-dashboard-card">
          <div className="trend-bar-list">
            {dominantTriggers.length ? (
              dominantTriggers.map((item) => {
                const percent = strongestTrigger ? (item.count / strongestTrigger.count) * 100 : 0;
                return (
                  <div key={item.label} className="trend-bar-item">
                    <div className="list-item-top">
                      <strong>{item.label}</strong>
                      <span>{item.count} 次</span>
                    </div>
                    <div className="trend-bar-track soft">
                      <div className="trend-bar-fill soft" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="muted">如果你在记录时顺手标一下原因，之后会更容易看见真正的触发点。</p>
            )}
          </div>
        </Card>

        <Card title="你最近可能在重复这样的循环" className="trend-dashboard-card trend-cycle-surface">
          <div className="trend-cycle-grid">
            <div className="trend-cycle-node">
              <div className="section-eyebrow">触发点</div>
              <strong>{strongestTrigger?.label || "还在慢慢形成"}</strong>
              <p>{strongestTrigger ? "它是最近更容易牵动你的那件事。" : "继续记录后会更清楚。"}</p>
            </div>
            <div className="trend-cycle-arrow">→</div>
            <div className="trend-cycle-node">
              <div className="section-eyebrow">情绪反应</div>
              <strong>{strongestMood?.label || "慢慢看见"}</strong>
              <p>{strongestMood ? `它常以${getIntensityDescription(averageIntensity)}的方式出现。` : "你的主要情绪还在形成。"}</p>
            </div>
            <div className="trend-cycle-arrow">→</div>
            <div className="trend-cycle-node">
              <div className="section-eyebrow">给自己的提醒</div>
              <strong>先照顾好自己</strong>
              <p>{cycleText}</p>
            </div>
          </div>
        </Card>

        <Card title="最近常出现的梦境信号" className="trend-dashboard-card">
          <div className="result-item">
            <h4>{strongestDreamSignal?.label || "还没有明显主题"}</h4>
            <p>
              {strongestDreamSignal
                ? `梦里“${strongestDreamSignal.label}”这类线索出现得更多，也许它和你最近反复在意的事情有关。`
                : "当梦境记录变多后，这里也会慢慢看见一些重复出现的画面。"}
            </p>
          </div>
        </Card>

        <Card title="一个趋势提醒" className="trend-dashboard-card">
          <div className="result-item">
            <p>{reminderText}</p>
          </div>
        </Card>
      </div>

      <Card className="trend-action-card">
        <div className="trend-action-copy">
          <div className="trend-section-kicker">下一步</div>
          <h3 className="section-title">继续记录，图谱就会越来越像你自己。</h3>
          <p className="trend-section-description">趋势页不会替你下结论，它只是把最近反复出现的东西更温柔地摆到你面前。</p>
        </div>
        <div className="trend-action-buttons">
          <Button onClick={() => navigate("mood")}>去记录今天的心情</Button>
          <Button variant="secondary" onClick={() => navigate("history")}>
            查看我的记录
          </Button>
        </div>
      </Card>
    </>
  );
}

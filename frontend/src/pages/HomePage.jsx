import { useEffect, useState } from "react";

import Button from "../components/Button.jsx";
import { fetchHomeOverview, fetchProfile } from "../services/api.js";
import { trackDreamEntryClick, trackHomeView } from "../services/tracker.js";

function truncateText(value, maxLength = 36) {
  if (!value) {
    return "";
  }

  const text = String(value).trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function AtlasHomeSection({
  tone = "default",
  statusLabel,
  statusText,
  title,
  body,
  actions = [],
  signalItems = [],
  entries = [],
  utilityItems = [],
}) {
  return (
    <section className={`atlas-home atlas-home-${tone}`.trim()}>
      <div className="atlas-home-inner">
        <div className="atlas-home-copy">
          <div className="atlas-home-lockup">
            <span className="atlas-home-tagline">梦境与情绪日志</span>
            <span className="atlas-home-name">MYDREAM</span>
          </div>

          <div className="atlas-home-meta">
            <span className="atlas-home-meta-chip">{statusLabel}</span>
            <span className="atlas-home-meta-text">{statusText}</span>
          </div>

          <h1 className="atlas-home-title">{title}</h1>
          <p className="atlas-home-body">{body}</p>

          {actions.length ? (
            <div className="atlas-home-actions">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="atlas-home-scene" aria-hidden="true">
          <div className="atlas-home-scene-kicker">Dream. Mood. Trace.</div>
          <div className="atlas-home-scene-word">MYDREAM</div>

          <div className="atlas-home-signal-list">
            {signalItems.map((item) => (
              <div key={item.label} className="atlas-home-signal-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {entries.length ? (
        <div className="atlas-home-dock" aria-label="核心入口">
          {entries.map((item) => (
            <button
              key={item.key}
              type="button"
              className="atlas-home-dock-item"
              onClick={item.onClick}
            >
              <span className="atlas-home-dock-label">{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <span className="atlas-home-dock-action">{item.action}</span>
            </button>
          ))}
        </div>
      ) : null}

      {utilityItems.length ? (
        <div className="atlas-home-utility-row">
          {utilityItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className="atlas-home-utility-link"
              onClick={item.onClick}
            >
              <strong>{item.label}</strong>
              <span>{item.text}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function HomePage({
  token,
  navigate,
  openLogin,
  setSelectedDreamId,
  setSelectedMoodData,
  setSelectedSummaryData,
  previousRoute,
}) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    profile: null,
    overview: null,
  });

  useEffect(() => {
    trackHomeView(token, {
      source: previousRoute || "direct",
      isLogin: Boolean(token),
    });
  }, [token, previousRoute]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", profile: null, overview: null });
        }
        return;
      }

      try {
        const [profile, overview] = await Promise.all([
          fetchProfile(token),
          fetchHomeOverview(token),
        ]);

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: "",
          profile,
          overview,
        });
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, profile: null, overview: null });
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [token]);

  const openDreamComposer = () => {
    trackDreamEntryClick(token, { fromPage: "home", pageName: "home" });
    navigate("input");
  };

  const openMoodComposer = () => {
    setSelectedMoodData("");
    navigate("mood");
  };

  const openTodaySummary = () => {
    setSelectedSummaryData("");
    navigate("summary");
  };

  const openLatestDream = (latestDream) => {
    if (!latestDream) {
      openDreamComposer();
      return;
    }

    setSelectedDreamId(String(latestDream.dreamRecordId));
    navigate("result");
  };

  const openLatestMood = (latestMood) => {
    if (!latestMood) {
      openMoodComposer();
      return;
    }

    setSelectedMoodData(JSON.stringify(latestMood));
    navigate("mood");
  };

  if (state.loading) {
    return (
      <AtlasHomeSection
        tone="loading"
        statusLabel="正在整理"
        statusText="Dream. Mood. Trace."
        title="把今天留下来。"
        body="正在准备你的首页。"
        signalItems={[
          { label: "梦境", value: "准备载入" },
          { label: "心情", value: "准备载入" },
          { label: "摘要", value: "准备载入" },
        ]}
      />
    );
  }

  if (state.error) {
    const needLogin = state.error === "NOT_LOGIN";

    return (
      <AtlasHomeSection
        tone={needLogin ? "guest" : "error"}
        statusLabel={needLogin ? "登录后开启" : "暂时不可用"}
        statusText={needLogin ? "先登录，再开始记录。" : "稍后再试"}
        title={needLogin ? "把今天留下来。" : "首页暂时没加载出来。"}
        body={needLogin ? "梦境、心情和摘要都会收在这里。" : state.error}
        actions={[
          {
            label: needLogin ? "登录" : "重新加载",
            variant: "primary",
            onClick: needLogin ? openLogin : () => window.location.reload(),
          },
          ...(needLogin
            ? [
                {
                  label: "看引导",
                  variant: "secondary",
                  onClick: () => navigate("welcome"),
                },
              ]
            : []),
        ]}
        signalItems={[
          { label: "入口", value: "梦境 / 心情 / 摘要" },
          { label: "方式", value: "更短的文案，更直接的动作" },
          { label: "目标", value: "先把今天留下来" },
        ]}
      />
    );
  }

  const profile = state.profile || {};
  const overview = state.overview || {};
  const latestDream = overview.latestDream || null;
  const latestMood = overview.latestMood || null;
  const todaySummary = overview.todaySummary || null;
  const totalDreamCount = Number(profile.totalDreamCount || 0);
  const consecutiveDays = Number(profile.consecutiveDays || 0);
  const membershipLabel = profile.membershipStatus === "pro" ? "PRO 会员" : "基础版";

  const latestDreamTitle = latestDream?.autoTitle || latestDream?.title || "还没有梦境记录";
  const latestMoodTitle = latestMood
    ? `${latestMood.moodType} ${latestMood.moodIntensity}/5`
    : "还没有心情记录";
  const summaryLead = truncateText(
    todaySummary?.reminder || latestMood?.moodReason || latestDream?.summary || "今晚先留下一条记录。",
    24,
  );

  const entries = [
    {
      key: "dream",
      label: "梦境",
      title: latestDream?.autoTitle || latestDream?.title || "去记一场梦",
      text: truncateText(latestDream?.summary || "醒来还记得的画面，先留住。", 26),
      action: latestDream ? "继续看这场梦" : "开始记录",
      onClick: () => openLatestDream(latestDream),
    },
    {
      key: "mood",
      label: "心情",
      title: latestMood ? `${latestMood.moodType} · ${latestMood.moodIntensity}/5` : "记下此刻心情",
      text: truncateText(latestMood?.moodReason || "把今天最真实的波动留下。", 26),
      action: latestMood ? "继续看这次心情" : "开始记录",
      onClick: () => openLatestMood(latestMood),
    },
    {
      key: "summary",
      label: "摘要",
      title: todaySummary ? "今日摘要已就绪" : "今天还没有摘要",
      text: truncateText(todaySummary?.overallStatus || "完成一条记录后会自动整理。", 26),
      action: todaySummary ? "打开今日摘要" : "先去记录",
      onClick: () => {
        if (todaySummary) {
          openTodaySummary();
          return;
        }

        openMoodComposer();
      },
    },
  ];

  const utilityItems = [
    {
      key: "trend",
      label: "趋势",
      text: consecutiveDays > 0 ? `已连续记录 ${consecutiveDays} 天` : "从今天开始积累轨迹",
      onClick: () => navigate("trend"),
    },
    {
      key: "history",
      label: "历史",
      text: totalDreamCount > 0 ? `已沉淀 ${totalDreamCount} 条记录` : "你的记录会在这里沉淀",
      onClick: () => navigate("history"),
    },
  ];

  return (
    <AtlasHomeSection
      statusLabel={membershipLabel}
      statusText={consecutiveDays > 0 ? `连续 ${consecutiveDays} 天` : "今晚开始记录"}
      title="把今天留下来。"
      body="记梦，记心情。"
      actions={[
        { label: "记梦", variant: "primary", onClick: openDreamComposer },
        { label: "记心情", variant: "secondary", onClick: openMoodComposer },
      ]}
      signalItems={[
        { label: "此刻", value: summaryLead },
        { label: "梦境", value: truncateText(latestDreamTitle, 18) },
        { label: "心情", value: latestMoodTitle },
      ]}
      entries={entries}
      utilityItems={utilityItems}
    />
  );
}

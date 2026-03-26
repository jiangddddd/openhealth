import { useEffect, useState } from "react";

import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Button from "../components/Button.jsx";
import { fetchDreamList, fetchFortune, fetchProfile } from "../services/api.js";

function DreamSummary({ item, onOpen }) {
  return (
    <article className="list-item" onClick={() => onOpen(item.dreamRecordId)}>
      <div className="list-item-top">
        <strong>{item.autoTitle || "未命名梦境"}</strong>
        <span className="small">{item.date}</span>
      </div>
      <div className="chip-row">
        {(item.tags || []).map((tag) => (
          <span key={tag} className="chip active">
            {tag}
          </span>
        ))}
      </div>
      <div className="muted">{item.summary || "点击查看这次解析"}</div>
    </article>
  );
}

export default function HomePage({
  token,
  navigate,
  openLogin,
  setSelectedDreamId,
}) {
  const [state, setState] = useState({ loading: true, error: "", profile: null, fortune: null, latest: null });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", profile: null, fortune: null, latest: null });
        }
        return;
      }

      try {
        const [profile, fortune, dreamList] = await Promise.all([
          fetchProfile(token),
          fetchFortune(token),
          fetchDreamList(token, 1, 1),
        ]);
        if (!active) {
          return;
        }
        setState({
          loading: false,
          error: "",
          profile,
          fortune,
          latest: dreamList.list?.[0] || null,
        });
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, profile: null, fortune: null, latest: null });
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
        <PageHeader title="梦语" description="记录你的梦，也记录你的内心变化" />
        <Card>
          <p className="muted">首页加载中...</p>
        </Card>
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <PageHeader title="梦语" description="记录你的梦，也记录你的内心变化" />
        <EmptyState
          title="还没有登录"
          description="登录后就可以开始记录梦境、查看今日运势和历史档案。"
          buttonText="先去登录"
          onAction={openLogin}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="梦语" description="每一个梦，都可能藏着一点提醒" />
      <Card>
        <div className="hero-card">
          <div className="badge">
            {state.profile.membershipStatus === "pro" ? "Pro 会员" : "免费版"}
          </div>
          <h2 className="hero-title">昨晚，你做梦了吗？</h2>
          <p className="hero-desc">
            输入你的梦境，AI 会从象征、情绪和现实映射的角度，为你生成一份温和的解读。
          </p>
        </div>
      </Card>

      <Card title="今天想做什么">
        <div className="double-action">
          <Button onClick={() => navigate("input")}>记录我的梦</Button>
          <Button
            variant="secondary"
            onClick={() =>
              document.getElementById("fortune-card")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            看看今日运势
          </Button>
        </div>
      </Card>

      <Card title="今日运势">
        <div id="fortune-card" className="stack">
          <div className="muted">{state.fortune.overallStatus}</div>
          <div className="result-item">
            <h4>今日提醒</h4>
            <p>{state.fortune.reminderText}</p>
          </div>
          <div className="chip-row">
            {(state.fortune.goodFor || []).map((item) => (
              <span key={item} className="chip active">
                {item}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {state.latest ? (
        <Card title="你最近的梦">
          <DreamSummary
            item={state.latest}
            onOpen={(id) => {
              setSelectedDreamId(String(id));
              navigate("result");
            }}
          />
        </Card>
      ) : (
        <EmptyState
          title="你还没有记录过梦"
          description="第一个梦，会是认识自己的入口。"
          buttonText="现在去记录"
          onAction={() => navigate("input")}
        />
      )}

      <Card title="连续记录提醒">
        <p className="muted">
          你已经累计记录 <strong>{state.profile.totalDreamCount}</strong> 个梦，连续记录{" "}
          <strong>{state.profile.consecutiveDays}</strong> 天。再坚持几天，就能更容易看见重复主题。
        </p>
      </Card>
    </>
  );
}

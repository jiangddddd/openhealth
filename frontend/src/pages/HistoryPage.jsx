import { useEffect, useState } from "react";

import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { fetchDreamList } from "../services/api.js";
import { trackDreamEntryClick, trackHistoryItemClick, trackHistoryView } from "../services/tracker.js";

export default function HistoryPage({
  token,
  navigate,
  openLogin,
  setSelectedDreamId,
}) {
  const [state, setState] = useState({ loading: true, error: "", list: [] });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", list: [] });
        }
        return;
      }

      try {
        const data = await fetchDreamList(token, 1, 20);
        if (active) {
          trackHistoryView(token);
          setState({ loading: false, error: "", list: data.list || [] });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, list: [] });
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
        <PageHeader title="我的梦境记录" description="连续记录后，你会更容易看见重复出现的主题。" />
        <Card>
          <p className="muted">历史记录加载中...</p>
        </Card>
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <PageHeader title="我的梦境记录" description="连续记录后，你会更容易看见重复出现的主题。" />
        <EmptyState
          title="还没有历史记录"
          description="登录后记录几次梦境，你会更容易看见重复出现的主题和情绪。"
          buttonText="现在去登录"
          onAction={openLogin}
        />
      </>
    );
  }

  if (!state.list.length) {
    return (
      <>
        <PageHeader title="我的梦境记录" description="连续记录后，你会更容易看见重复出现的主题。" />
        <EmptyState
          title="这里还没有梦境记录"
          description="记录几次后，这些线索会慢慢连起来。"
          buttonText="去记录一个梦"
          onAction={() => {
            trackDreamEntryClick(token, { fromPage: "history", pageName: "history" });
            navigate("input");
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="我的梦境记录" description="连续记录后，你会更容易看见重复出现的主题。" />
      <Card title="历史档案">
        {state.list.map((item) => (
          <article
            key={item.dreamRecordId}
            className="list-item"
            onClick={() => {
              trackHistoryItemClick(token, { dreamRecordId: item.dreamRecordId });
              setSelectedDreamId(String(item.dreamRecordId));
              navigate("result");
            }}
          >
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
            <div className="history-dream-text">{item.dreamText || "未保存原文内容"}</div>
            <div className="muted">{item.summary || "点击查看这次解析"}</div>
          </article>
        ))}
      </Card>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";

import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";
import TagSelector from "../components/TagSelector.jsx";
import { createMoodRecord, fetchMoodList } from "../services/api.js";

const moodOptions = ["开心", "平静", "焦虑", "疲惫", "难过", "烦躁", "迷茫"];
const reasonTags = ["工作", "感情", "家庭", "睡眠", "身体状态", "社交", "学习", "其他"];

function parseMoodData(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatTimeLabel(value) {
  if (!value || typeof value !== "string" || value.length < 16) {
    return "";
  }
  return value.slice(11, 16);
}

function getIntensityLabel(level) {
  if (level <= 2) {
    return "轻一些";
  }
  if (level === 3) {
    return "中等";
  }
  return "比较明显";
}

export default function MoodPage({
  token,
  navigate,
  showToast,
  selectedMoodData,
  setSelectedMoodData,
}) {
  const moodDetail = useMemo(() => parseMoodData(selectedMoodData), [selectedMoodData]);
  const [moodType, setMoodType] = useState(moodDetail?.moodType ? [moodDetail.moodType] : []);
  const [moodIntensity, setMoodIntensity] = useState(moodDetail?.moodIntensity || 3);
  const [moodReason, setMoodReason] = useState(moodDetail?.moodReason || "");
  const [moodTags, setMoodTags] = useState(moodDetail?.moodTags || []);
  const [loading, setLoading] = useState(false);
  const [recentState, setRecentState] = useState({ loading: false, items: [] });

  const isDetailMode = Boolean(moodDetail);

  useEffect(() => {
    setMoodType(moodDetail?.moodType ? [moodDetail.moodType] : []);
    setMoodIntensity(moodDetail?.moodIntensity || 3);
    setMoodReason(moodDetail?.moodReason || "");
    setMoodTags(moodDetail?.moodTags || []);
  }, [moodDetail]);

  useEffect(() => {
    let active = true;

    async function loadRecentMoods() {
      if (!token) {
        if (active) {
          setRecentState({ loading: false, items: [] });
        }
        return;
      }

      if (active) {
        setRecentState((prev) => ({ ...prev, loading: true }));
      }

      try {
        const data = await fetchMoodList(token, 1, 8);
        if (active) {
          setRecentState({
            loading: false,
            items: data.list || [],
          });
        }
      } catch {
        if (active) {
          setRecentState({ loading: false, items: [] });
        }
      }
    }

    loadRecentMoods();
    return () => {
      active = false;
    };
  }, [token]);

  const latestMood = recentState.items[0] || null;

  const handleSubmit = async () => {
    if (!token) {
      showToast("请先登录。");
      return;
    }
    if (!moodType.length) {
      showToast("先选择今天的心情。");
      return;
    }

    setLoading(true);
    try {
      await createMoodRecord(token, {
        moodType: moodType[0],
        moodIntensity,
        moodReason: moodReason.trim() || null,
        moodTags,
      });
      setSelectedMoodData("");
      showToast("已记录。今天的心情，已经被轻轻接住了。");
      navigate("summary");
    } catch (error) {
      showToast(error.message);
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isDetailMode ? "心情记录详情" : "记录今天的心情"}
        description={
          isDetailMode ? "看看你当时的状态、强度和原因。" : "这里没有对错，也不需要解释得很完整。只要把你此刻最真实的状态记下来就好。"
        }
      />

      {!isDetailMode ? (
        <Card className="mood-intro-card">
          <div className="mood-intro-grid">
            <div>
              <div className="section-eyebrow">心情记录</div>
              <h3 className="section-title">用一分钟，留下此刻的情绪</h3>
              <p className="section-desc">
                你记录下来的，不只是情绪本身。时间久了，你会更容易看见哪些事情在反复影响你。
              </p>
            </div>
            <div className="mood-intro-tips">
              <div className="mood-tip-pill">短一点也没关系</div>
              <div className="mood-tip-pill">支持同日多条记录</div>
              <div className="mood-tip-pill">自动整理成今日总结</div>
            </div>
          </div>
        </Card>
      ) : null}

      {isDetailMode ? (
        <div className="page-grid page-grid-form">
          <Card className="span-2 mood-detail-card">
            <div className="mood-detail-top">
              <div>
                <div className="section-eyebrow">记录快照</div>
                <h3 className="section-title">{moodDetail.moodType}</h3>
                <p className="section-desc">
                  {moodDetail.recordDate || ""} {formatTimeLabel(moodDetail.createdAt)}
                </p>
              </div>
              <span className="record-type-badge record-type-mood">心情</span>
            </div>
            <div className="mood-detail-meter">
              <div className="mood-detail-meter-fill" style={{ width: `${(moodDetail.moodIntensity / 5) * 100}%` }} />
            </div>
            <div className="helper-text">
              强度 {moodDetail.moodIntensity} / 5，属于{getIntensityLabel(moodDetail.moodIntensity)}的状态
            </div>
            {(moodDetail.moodTags || []).length ? (
              <div className="chip-row">
                {moodDetail.moodTags.map((tag) => (
                  <span key={tag} className="chip active">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="history-dream-text mood-detail-text">
              {moodDetail.moodReason || "这次记录里没有补充原因。"}
            </div>
          </Card>

          <Card title="继续记录" className="span-2">
            <div className="stack">
              <p className="muted">如果后面还有新的情绪变化，也可以继续补一条。系统会按时间保留下来，方便你回看整天的波动轨迹。</p>
              <div className="inline-actions">
                <Button
                  onClick={() => {
                    setSelectedMoodData("");
                  }}
                >
                  再记一条新的心情
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedMoodData("");
                    navigate("history");
                  }}
                >
                  返回我的记录
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
          <div className="page-grid page-grid-form">
            <Card title="你现在更接近哪种感觉？" className="span-2">
              <TagSelector options={moodOptions} value={moodType} onChange={setMoodType} />
            </Card>

            <Card title="这种感觉有多明显？">
              <div className="stack">
                <div className="mood-level-row">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`mood-level-dot ${level <= moodIntensity ? "active" : ""}`}
                      onClick={() => setMoodIntensity(level)}
                      aria-label={`心情强度 ${level}`}
                    />
                  ))}
                </div>
                <div className="small">不用太纠结，大概选一个最接近的就好。当前强度：{moodIntensity} / 5，{getIntensityLabel(moodIntensity)}</div>
              </div>
            </Card>

            <Card title="这份心情更像和什么有关？">
              <TagSelector
                options={reasonTags}
                value={moodTags}
                onChange={setMoodTags}
                multiple
                limit={4}
              />
            </Card>

            <Card title="今天为什么会这样？" className="span-2">
              <textarea
                className="textarea"
                style={{ minHeight: 120 }}
                placeholder="其实说不上来，就是有点闷。"
                value={moodReason}
                onChange={(event) => setMoodReason(event.target.value)}
              />
            </Card>
          </div>

          <Card>
            <div className="stack">
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "保存中..." : "保存今天的心情"}
              </Button>
            </div>
          </Card>

          <Card title="最近几次心情变化">
            <div className="section-eyebrow">情绪轨迹</div>
            {latestMood ? (
              <p className="section-desc">
                最近一次是 {latestMood.moodType}，强度 {latestMood.moodIntensity} / 5。把记录放进时间里看，更容易发现自己的变化规律。
              </p>
            ) : (
              <p className="section-desc">你记录过的心情，会按时间顺序保留在这里，慢慢形成自己的情绪轨迹。</p>
            )}
            {recentState.loading ? (
              <p className="muted">正在加载最近记录...</p>
            ) : recentState.items.length ? (
              <div className="mood-timeline">
                {recentState.items.map((item, index) => (
                  <article
                    key={item.moodRecordId || index}
                    className="mood-timeline-item"
                    onClick={() => setSelectedMoodData(JSON.stringify(item))}
                  >
                    <div className="mood-timeline-marker">{recentState.items.length - index}</div>
                    <div className="mood-timeline-body">
                      <div className="list-item-top">
                        <strong>{item.moodType}</strong>
                        <span className="small">
                          {item.recordDate} {formatTimeLabel(item.createdAt)}
                        </span>
                      </div>
                      <div className="helper-text">强度 {item.moodIntensity} / 5</div>
                      {(item.moodTags || []).length ? (
                        <div className="chip-row">
                          {item.moodTags.map((tag) => (
                            <span key={tag} className="chip active">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="muted">{item.moodReason || "这次没有填写补充说明。"}</div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">你还没有心情记录，先从今天这一条开始。</p>
            )}
          </Card>
        </>
      )}
    </>
  );
}

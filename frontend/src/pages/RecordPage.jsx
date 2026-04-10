import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";

export default function RecordPage({ navigate, setSelectedMoodData }) {
  const options = [
    {
      key: "dream",
      label: "梦境记录",
      eyebrow: "Dream Log",
      title: "把醒来后还停留在脑海里的画面，先轻轻留下来。",
      description: "不需要写得完整，先抓住人物、地点、颜色、反复出现的符号和那一瞬间的感受。",
      hints: ["适合醒来后立刻记", "重点是画面和细节", "后续更适合接解析结果"],
      footer: "去记录梦境",
      onClick: () => navigate("input"),
      tone: "dream",
    },
    {
      key: "mood",
      label: "心情记录",
      eyebrow: "Mood Note",
      title: "把今天此刻最真实的情绪，整理成一张小小的快照。",
      description: "先承认它，再试着说出原因。哪怕只写一句，也是在帮自己把混乱变得更清楚。",
      hints: ["适合任何当下", "重点是强度和原因", "后续更容易串起趋势变化"],
      footer: "去记录心情",
      onClick: () => {
        setSelectedMoodData("");
        navigate("mood");
      },
      tone: "mood",
    },
  ];

  return (
    <>
      <PageHeader
        title="记录今天的自己"
        description="不需要一次写很多，只要先抓住今天最真实的一个瞬间。"
        action={<span className="record-header-pill">双入口记录</span>}
      />

      <Card className="record-hero-card">
        <div className="record-hero-grid">
          <div className="record-hero-main">
            <div className="record-kicker">Today Capture</div>
            <h2 className="record-hero-title">先选一个入口，让今天的线索有地方落下。</h2>
            <p className="record-hero-description">
              你可以从梦境开始，也可以从心情开始。前者更像抓住夜里留下的意象，后者更像整理此刻真实的波动。
            </p>
            <div className="record-hero-tags">
              <span className="record-meta-chip">梦境适合留住画面</span>
              <span className="record-meta-chip">心情适合留住状态</span>
              <span className="record-meta-chip">所有记录都会继续串成趋势</span>
            </div>
          </div>

          <div className="record-hero-side">
            <article className="record-note-card">
              <span>轻量开始</span>
              <strong>先写一句也足够</strong>
              <p>不需要把自己解释清楚，先把那个最想留下来的瞬间写下来就已经很有价值。</p>
            </article>
            <article className="record-note-card">
              <span>慢慢成线</span>
              <strong>记录会自己连起来</strong>
              <p>今天的一条梦境或心情，之后都会在趋势页和历史页里长成更完整的脉络。</p>
            </article>
          </div>
        </div>
      </Card>

      <section className="record-choice-section">
        <div className="record-choice-grid">
          {options.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={`record-choice-card record-choice-card-${item.tone}`}
              onClick={item.onClick}
            >
              <div className="record-choice-top">
                <span className="record-choice-badge">{item.eyebrow}</span>
                <span className="record-choice-index">0{index + 1}</span>
              </div>

              <div className="record-choice-body">
                <div className="record-choice-label">{item.label}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>

              <div className="record-choice-points">
                {item.hints.map((hint) => (
                  <span key={hint}>{hint}</span>
                ))}
              </div>

              <div className="record-choice-footer">
                <span>{item.footer}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

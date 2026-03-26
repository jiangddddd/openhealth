import { useState } from "react";

import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import PageHeader from "../components/PageHeader.jsx";
import TagSelector from "../components/TagSelector.jsx";
import { submitDream } from "../services/api.js";
import { trackDreamSubmit } from "../services/tracker.js";

const emotionOptions = ["害怕", "焦虑", "难过", "开心", "迷茫", "平静", "说不上来"];
const peopleOptions = ["前任", "家人", "朋友", "同事", "陌生人", "没有特别的人"];
const symbolOptions = ["被追赶", "掉下来", "水", "黑暗", "动物", "回到过去", "考试", "迷路", "吵架", "重逢"];

export default function InputPage({
  token,
  navigate,
  showToast,
  setSelectedDreamId,
}) {
  const [dreamText, setDreamText] = useState("");
  const [emotion, setEmotion] = useState([]);
  const [people, setPeople] = useState([]);
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token) {
      showToast("请先登录。");
      return;
    }
    if (!dreamText.trim() || dreamText.trim().length < 10) {
      showToast("梦境内容至少写 10 个字。");
      return;
    }

    setLoading(true);
    try {
      const trimmedDreamText = dreamText.trim();
      const data = await submitDream(token, {
        dreamText: trimmedDreamText,
        emotionAfterWaking: emotion[0] || null,
        dreamPeople: people,
        dreamSymbols: symbols,
      });
      trackDreamSubmit(token, {
        dreamRecordId: data.dreamRecordId,
        dreamTextLength: trimmedDreamText.length,
        hasEmotion: Boolean(emotion[0]),
        hasPeople: people.length > 0,
        hasSymbols: symbols.length > 0,
      });
      setSelectedDreamId(String(data.dreamRecordId));
      showToast("解析完成，正在进入结果页。");
      navigate("result");
    } catch (error) {
      showToast(error.message);
      setLoading(false);
    }
  };

  return (
    <>
      {loading ? (
        <div className="loading-overlay">
          <div className="loading-overlay-card">
            <div className="loading-spinner loading-spinner-large" aria-hidden="true" />
            <div className="loading-overlay-title">AI 正在解析你的梦境</div>
            <div className="loading-overlay-desc">
              正在提取梦里的线索、情绪和象征含义，请稍等一下，别着急。
            </div>
            <div className="loading-progress">
              <div className="loading-progress-bar" />
            </div>
            <div className="loading-progress-text">正在生成你的专属解读...</div>
          </div>
        </div>
      ) : null}
      <PageHeader
        title="记录梦境"
        description="尽量写下你记得的细节，比如人物、地点、感受和发生了什么。"
      />
      <Card title="梦境内容">
        <label className="field-label" htmlFor="dream-text">
          写下你刚刚做的梦
        </label>
        <textarea
          id="dream-text"
          className="textarea"
          placeholder="例如：我梦见自己一直在找路，怎么都走不出去，后来还下起了雨，醒来以后有点慌。"
          value={dreamText}
          onChange={(event) => setDreamText(event.target.value)}
        />
        <div className="helper-text">
          你的记录会用于生成更贴近状态的解读，这更像一次自我探索，而不是绝对判断。
        </div>
      </Card>

      <Card title="补充一点信息，解读会更准确">
        <div className="stack">
          <div>
            <p className="field-label">醒来后的感觉</p>
            <TagSelector options={emotionOptions} value={emotion} onChange={setEmotion} />
          </div>
          <div>
            <p className="field-label">梦里出现的人</p>
            <TagSelector
              options={peopleOptions}
              value={people}
              onChange={setPeople}
              multiple
              limit={3}
            />
          </div>
          <div>
            <p className="field-label">最深的画面</p>
            <TagSelector
              options={symbolOptions}
              value={symbols}
              onChange={setSymbols}
              multiple
              limit={3}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="stack">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "解析中..." : "开始解析这个梦"}
          </Button>
          <Button variant="secondary" onClick={() => showToast("草稿功能已预留，MVP 先不落库。")}>
            保存草稿
          </Button>
        </div>
      </Card>
    </>
  );
}

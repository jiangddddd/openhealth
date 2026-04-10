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
      showToast("已记录。现在，去看看这个梦更像在提醒你什么。");
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
            <div className="loading-overlay-title">正在整理这场梦的线索</div>
            <div className="loading-overlay-desc">
              正在提取梦里的画面、情绪和象征含义，请稍等一下，不用着急。
            </div>
            <div className="loading-progress">
              <div className="loading-progress-bar" />
            </div>
            <div className="loading-progress-text">正在生成更贴近你当下状态的解读...</div>
          </div>
        </div>
      ) : null}
      <PageHeader
        title="记下你刚刚做的梦"
        description="不用写得很完整。把你记得的画面、人物和感受留下来就好。"
      />
      <Card title="梦境内容">
        <label className="field-label" htmlFor="dream-text">
          把你记得的梦写下来
        </label>
        <textarea
          id="dream-text"
          className="textarea"
          placeholder="例如：我梦见自己一直在找路，怎么都走不出去，后来还下起了雨，醒来以后有点慌。"
          value={dreamText}
          onChange={(event) => setDreamText(event.target.value)}
        />
        <div className="helper-text">
          我们会根据你的记录，整理出更贴近你当下状态的梦境解读。
        </div>
      </Card>

      <Card title="补充一点细节，解读会更贴近你">
        <div className="stack">
          <div>
            <p className="field-label">醒来后，你最明显的感觉是？</p>
            <TagSelector options={emotionOptions} value={emotion} onChange={setEmotion} />
          </div>
          <div>
            <p className="field-label">梦里有没有特别明显的人？</p>
            <TagSelector
              options={peopleOptions}
              value={people}
              onChange={setPeople}
              multiple
              limit={3}
            />
          </div>
          <div>
            <p className="field-label">梦里最深的画面是什么？</p>
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

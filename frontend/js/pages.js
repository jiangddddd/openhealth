import {
  createFeedback,
  createOrder,
  fetchDreamDetail,
  fetchDreamList,
  fetchFortune,
  fetchMembershipInfo,
  fetchOrder,
  fetchProfile,
  getSelectedDreamId,
  submitDream,
  submitFollowup,
} from "./api.js";
import { button, card, chipGroup, emptyState, pageHeader } from "./components.js";

const emotionOptions = ["害怕", "焦虑", "难过", "开心", "迷茫", "平静", "说不上来"];
const peopleOptions = ["前任", "家人", "朋友", "同事", "陌生人", "没有特别的人"];
const symbolOptions = ["被追赶", "掉下来", "水", "黑暗", "动物", "回到过去", "考试", "迷路", "吵架", "重逢"];

function renderDreamSummary(item) {
  return `
    <article class="list-item" data-dream-item="${item.dreamRecordId}">
      <div class="list-item-top">
        <strong>${item.autoTitle || "未命名梦境"}</strong>
        <span class="small">${item.date}</span>
      </div>
      <div class="chip-row">
        ${(item.tags || []).map((tag) => `<span class="chip active">${tag}</span>`).join("")}
      </div>
      <div class="muted">${item.summary || "点击查看这次解析"}</div>
    </article>
  `;
}

export async function renderHomePage() {
  let profile = null;
  let fortune = null;
  let dreamList = null;

  try {
    [profile, fortune, dreamList] = await Promise.all([
      fetchProfile(),
      fetchFortune(),
      fetchDreamList(1, 1),
    ]);
  } catch (_error) {
    return `
      ${pageHeader("梦语", "记录你的梦，也记录你的内心变化")}
      ${emptyState("还没有登录", "登录后就可以开始记录梦境、查看今日运势和历史档案。", button("先去登录", "primary", 'data-open-login="true"'))}
    `;
  }

  const latest = dreamList.list?.[0];
  return `
    ${pageHeader("梦语", "每一个梦，都可能藏着一点提醒")}
    ${card(
      "",
      `
        <div class="hero-card">
          <div class="badge">${profile.membershipStatus === "pro" ? "Pro 会员" : "免费版"}</div>
          <h2 class="hero-title">昨晚，你做梦了吗？</h2>
          <p class="hero-desc">输入你的梦境，AI 会从象征、情绪和现实映射的角度，为你生成一份温和的解读。</p>
        </div>
      `
    )}
    ${card(
      "今天想做什么",
      `
        <div class="double-action">
          ${button("记录我的梦", "primary", 'data-go="input" data-requires-login="true"')}
          ${button("看看今日运势", "secondary", 'data-scroll-target="fortune-card"')}
        </div>
      `
    )}
    ${card(
      "今日运势",
      `
        <div id="fortune-card" class="stack">
          <div class="muted">${fortune.overallStatus}</div>
          <div class="result-item">
            <h4>今日提醒</h4>
            <p>${fortune.reminderText}</p>
          </div>
          <div class="chip-row">
            ${(fortune.goodFor || []).map((item) => `<span class="chip active">${item}</span>`).join("")}
          </div>
        </div>
      `
    )}
    ${latest
      ? card("你最近的梦", renderDreamSummary(latest))
      : emptyState("你还没有记录过梦", "第一个梦，会是认识自己的入口。", button("现在去记录", "primary", 'data-go="input" data-requires-login="true"'))}
    ${card(
      "连续记录提醒",
      `
        <p class="muted">你已经累计记录 <strong>${profile.totalDreamCount}</strong> 个梦，连续记录 <strong>${profile.consecutiveDays}</strong> 天。再坚持几天，就能更容易看见重复主题。</p>
      `
    )}
  `;
}

export function renderInputPage() {
  return `
    ${pageHeader("记录梦境", "尽量写下你记得的细节，比如人物、地点、感受和发生了什么。")}
    ${card(
      "梦境内容",
      `
        <label class="field-label" for="dream-text">写下你刚刚做的梦</label>
        <textarea id="dream-text" class="textarea" placeholder="例如：我梦见自己一直在找路，怎么都走不出去，后来还下起了雨，醒来以后有点慌。"></textarea>
        <div class="helper-text">你的记录会用于生成更贴近状态的解读，这更像一次自我探索，而不是绝对判断。</div>
      `
    )}
    ${card(
      "补充一点信息，解读会更准确",
      `
        <div class="stack">
          <div>
            <p class="field-label">醒来后的感觉</p>
            ${chipGroup(emotionOptions, [], "emotion-selector")}
          </div>
          <div>
            <p class="field-label">梦里出现的人</p>
            ${chipGroup(peopleOptions, [], "people-selector")}
          </div>
          <div>
            <p class="field-label">最深的画面</p>
            ${chipGroup(symbolOptions, [], "symbol-selector")}
          </div>
        </div>
      `
    )}
    ${card(
      "",
      `
        <div class="stack">
          ${button("开始解析这个梦", "primary", 'id="submit-dream"')}
          ${button("保存草稿", "secondary", 'id="save-draft"')}
        </div>
      `
    )}
  `;
}

export async function renderResultPage() {
  const detail = await fetchDreamDetail(getSelectedDreamId());
  if (!detail) {
    return emptyState("还没有可展示的解析", "先记录一个梦，结果页就会自动展示你的基础解读和追问。", button("去记录梦境", "primary", 'data-go="input" data-requires-login="true"'));
  }

  const base = detail.baseInterpretation || {};
  return `
    ${pageHeader(detail.autoTitle || "梦境解析结果", "你的梦里正在传递怎样的信号？")}
    ${card(
      "",
      `
        <div class="chip-row">
          ${(detail.tags || []).map((tag) => `<span class="chip active">${tag}</span>`).join("")}
        </div>
        <p class="small" style="margin-top: 12px;">记录时间：${detail.createdAt}</p>
        <p class="muted">${detail.summary || ""}</p>
      `
    )}
    ${card(
      "基础解读",
      `
        <div class="result-grid">
          <div class="result-item"><h4>一句结论</h4><p>${base.conclusion || "-"}</p></div>
          <div class="result-item"><h4>梦中象征</h4><p>${base.symbols || "-"}</p></div>
          <div class="result-item"><h4>现实映射</h4><p>${base.mapping || "-"}</p></div>
          <div class="result-item"><h4>提醒</h4><p>${base.reminder || "-"}</p></div>
          <div class="result-item"><h4>宜</h4><ul>${(base.goodFor || []).map((item) => `<li>${item}</li>`).join("")}</ul></div>
          <div class="result-item"><h4>忌</h4><ul>${(base.avoidFor || []).map((item) => `<li>${item}</li>`).join("")}</ul></div>
        </div>
      `
    )}
    ${card(
      "再问你一个问题",
      `
        <div class="stack">
          <div class="result-item">
            <h4>AI 追问</h4>
            <p id="followup-question">${detail.followupQuestion || "这个梦最让你放不下的感觉，像不像现实里的某件事？"}</p>
          </div>
          <textarea id="followup-answer" class="textarea" style="min-height: 120px;" placeholder="写下你的回答，让这次解读更贴近你的真实状态。"></textarea>
          ${button("生成补充解析", "primary", 'id="submit-followup"')}
          <div id="followup-result"></div>
        </div>
      `
    )}
    ${card(
      "继续解锁更完整解读",
      `
        <p class="muted">深度版会补充情绪根源、内在课题和更完整的行动建议，适合持续记录的用户。</p>
        <div class="inline-actions">
          ${button("去会员页看看", "primary", 'data-go="membership"')}
          ${button("喜欢这次解读", "secondary", 'id="like-dream"')}
        </div>
      `
    )}
  `;
}

export async function renderHistoryPage() {
  let data;
  try {
    data = await fetchDreamList(1, 20);
  } catch (_error) {
    return emptyState("还没有历史记录", "登录后记录几次梦境，你会更容易看见重复出现的主题和情绪。", button("现在去登录", "primary", 'data-open-login="true"'));
  }

  if (!data.list?.length) {
    return emptyState("这里还没有梦境记录", "记录几次后，这些线索会慢慢连起来。", button("去记录一个梦", "primary", 'data-go="input" data-requires-login="true"'));
  }

  return `
    ${pageHeader("我的梦境记录", "连续记录后，你会更容易看见重复出现的主题。")}
    ${card("历史档案", data.list.map(renderDreamSummary).join(""))}
  `;
}

export async function renderMembershipPage() {
  let profile;
  let membership;
  try {
    [profile, membership] = await Promise.all([fetchProfile(), fetchMembershipInfo()]);
  } catch (_error) {
    return emptyState("登录后查看会员与档案", "你可以先登录，再查看会员权益、购买方案和个人记录概览。", button("现在去登录", "primary", 'data-open-login="true"'));
  }

  return `
    ${pageHeader("我的 / 会员", "把一次解梦，变成长期陪伴。")}
    ${card(
      "",
      `
        <div class="stack">
          <div class="badge">${profile.membershipStatus === "pro" ? "当前 Pro 会员" : "当前免费用户"}</div>
          <div class="stats-grid">
            <div class="stat-box"><strong>${profile.totalDreamCount}</strong><span class="small">累计梦境</span></div>
            <div class="stat-box"><strong>${profile.consecutiveDays}</strong><span class="small">连续记录</span></div>
            <div class="stat-box"><strong>${profile.membershipExpireAt ? "已开通" : "未开通"}</strong><span class="small">会员状态</span></div>
          </div>
        </div>
      `
    )}
    ${card(
      "Pro 可以为你解锁什么",
      `<ul class="benefit-list">${membership.benefits.map((item) => `<li>${item}</li>`).join("")}</ul>`
    )}
    ${card(
      "选择方案",
      `
        <div class="stack">
          ${membership.plans
            .map(
              (plan, index) => `
                <article class="price-card ${index === 0 ? "active" : ""}" data-plan-type="${plan.planType}">
                  <div class="list-item-top">
                    <strong>${plan.planName}</strong>
                    <span class="badge">${index === 0 ? "推荐" : "长期更省"}</span>
                  </div>
                  <p class="muted">￥${plan.price} / ${plan.planType === "monthly" ? "月" : "年"}</p>
                </article>
              `
            )
            .join("")}
          ${button("开通 Pro", "primary", 'id="create-order"')}
          <button class="secondary-button" id="logout-button">退出登录</button>
        </div>
      `
    )}
    <div id="order-result"></div>
  `;
}

export function bindInputPageEvents({ navigate, ensureLoggedIn, toast }) {
  const selections = {
    emotion: [],
    people: [],
    symbols: [],
  };

  function handleGroupClick(selector, key, multiple = false, limit = 1) {
    document.querySelector(`[data-component="${selector}"]`)?.addEventListener("click", (event) => {
      const target = event.target.closest(".chip");
      if (!target) {
        return;
      }
      const value = target.dataset.value;
      const current = selections[key];
      const exists = current.includes(value);
      let next = [];

      if (multiple) {
        next = exists ? current.filter((item) => item !== value) : [...current, value].slice(0, limit);
      } else {
        next = exists ? [] : [value];
      }

      selections[key] = next;
      document.querySelectorAll(`[data-component="${selector}"] .chip`).forEach((chip) => {
        chip.classList.toggle("active", next.includes(chip.dataset.value));
      });
    });
  }

  handleGroupClick("emotion-selector", "emotion");
  handleGroupClick("people-selector", "people", true, 3);
  handleGroupClick("symbol-selector", "symbols", true, 3);

  document.getElementById("save-draft")?.addEventListener("click", () => {
    toast("草稿功能已预留，MVP 先不落库。");
  });

  document.getElementById("submit-dream")?.addEventListener("click", async () => {
    const canContinue = await ensureLoggedIn();
    if (!canContinue) {
      return;
    }

    const dreamText = document.getElementById("dream-text")?.value?.trim();
    if (!dreamText || dreamText.length < 10) {
      toast("梦境内容至少写 10 个字。");
      return;
    }

    const buttonNode = document.getElementById("submit-dream");
    buttonNode.textContent = "解析中...";
    buttonNode.disabled = true;
    try {
      await submitDream({
        dreamText,
        emotionAfterWaking: selections.emotion[0] || null,
        dreamPeople: selections.people,
        dreamSymbols: selections.symbols,
      });
      toast("解析完成，正在进入结果页。");
      navigate("result");
    } catch (error) {
      toast(error.message);
      buttonNode.textContent = "开始解析这个梦";
      buttonNode.disabled = false;
    }
  });
}

export function bindResultPageEvents({ navigate, toast }) {
  document.getElementById("submit-followup")?.addEventListener("click", async () => {
    const question = document.getElementById("followup-question")?.textContent?.trim();
    const userAnswer = document.getElementById("followup-answer")?.value?.trim();
    const dreamRecordId = getSelectedDreamId();

    if (!userAnswer) {
      toast("先写下你的回答。");
      return;
    }

    const resultContainer = document.getElementById("followup-result");
    resultContainer.innerHTML = card("生成中", `<p class="muted">正在结合你的回答整理补充解析...</p>`);
    try {
      const data = await submitFollowup({
        dreamRecordId: Number(dreamRecordId),
        followupQuestion: question,
        userAnswer,
      });

      const extra = data.followupInterpretation;
      resultContainer.innerHTML = card(
        "补充解析",
        `
          <div class="result-grid">
            <div class="result-item"><h4>更贴近你的状态</h4><p>${extra.closerState}</p></div>
            <div class="result-item"><h4>更深一层的原因</h4><p>${extra.deeperReason}</p></div>
            <div class="result-item"><h4>一个建议</h4><p>${extra.suggestion}</p></div>
          </div>
        `
      );
    } catch (error) {
      resultContainer.innerHTML = "";
      toast(error.message);
    }
  });

  document.getElementById("like-dream")?.addEventListener("click", async () => {
    try {
      await createFeedback({
        targetType: "dream",
        targetId: Number(getSelectedDreamId()),
        feedbackType: "like",
        content: "这次还挺像在说我的",
      });
      toast("已记录你的喜欢反馈。");
    } catch (error) {
      toast(error.message);
    }
  });

}

export function bindHistoryPageEvents({ navigate, setSelectedDreamId }) {
  document.querySelectorAll("[data-dream-item]").forEach((item) => {
    item.addEventListener("click", () => {
      setSelectedDreamId(item.dataset.dreamItem);
      navigate("result");
    });
  });
}

export function bindHomePageEvents({ navigate }) {
  document.querySelectorAll("[data-dream-item]").forEach((item) => {
    item.addEventListener("click", () => {
      localStorage.setItem("selected_dream_id", item.dataset.dreamItem);
      navigate("result");
    });
  });

  document.querySelectorAll("[data-scroll-target]").forEach((node) => {
    node.addEventListener("click", () => {
      document.getElementById(node.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

export function bindMembershipPageEvents({ toast, refreshPage, logout }) {
  document.querySelectorAll(".price-card").forEach((cardNode) => {
    cardNode.addEventListener("click", () => {
      document.querySelectorAll(".price-card").forEach((item) => item.classList.remove("active"));
      cardNode.classList.add("active");
    });
  });

  document.getElementById("create-order")?.addEventListener("click", async () => {
    const planNode = document.querySelector(".price-card.active");
    const planType = planNode?.dataset.planType || "monthly";
    try {
      const order = await createOrder({
        productType: "membership",
        planType,
        payChannel: "wechatpay",
      });
      const detail = await fetchOrder(order.orderId);
      document.getElementById("order-result").innerHTML = card(
        "订单已创建",
        `
          <div class="stack">
            <div class="result-item"><h4>订单号</h4><p>${order.orderNo}</p></div>
            <div class="result-item"><h4>支付状态</h4><p>${detail.payStatus}</p></div>
          </div>
        `
      );
      toast("MVP 版已创建 mock 订单。");
    } catch (error) {
      toast(error.message);
    }
  });

  document.getElementById("logout-button")?.addEventListener("click", () => {
    logout();
    toast("已退出登录。");
    refreshPage();
  });
}

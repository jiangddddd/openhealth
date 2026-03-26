export function pageHeader(title, desc, actionHtml = "") {
  return `
    <div class="page-header">
      <div>
        <h1>${title}</h1>
        <p>${desc}</p>
      </div>
      ${actionHtml}
    </div>
  `;
}

export function card(title, content, extraClass = "") {
  return `
    <section class="card ${extraClass}">
      ${title ? `<h3 class="card-title">${title}</h3>` : ""}
      ${content}
    </section>
  `;
}

export function button(text, variant = "primary", attrs = "") {
  const klass = variant === "secondary" ? "secondary-button" : "primary-button";
  return `<button class="${klass}" ${attrs}>${text}</button>`;
}

export function chipGroup(items, selected = [], key = "tag-selector") {
  return `
    <div class="chip-row" data-component="${key}">
      ${items
        .map(
          (item) => `
            <button
              type="button"
              class="chip ${selected.includes(item) ? "active" : ""}"
              data-value="${item}"
            >
              ${item}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

export function emptyState(title, desc, buttonHtml = "") {
  return `
    <div class="card empty-state">
      <h3>${title}</h3>
      <p>${desc}</p>
      ${buttonHtml}
    </div>
  `;
}

export function bottomNav(current) {
  const items = [
    { key: "home", label: "首页" },
    { key: "input", label: "记录" },
    { key: "result", label: "结果" },
    { key: "history", label: "历史" },
    { key: "membership", label: "我的" },
  ];
  return `
    <nav class="bottom-nav">
      ${items
        .map(
          (item) => `
            <a href="#/${item.key}" class="nav-item ${current === item.key ? "active" : ""}">
              ${item.label}
            </a>
          `
        )
        .join("")}
    </nav>
  `;
}

export function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

export function loginModal() {
  return `
    <div class="modal-mask" data-modal="login">
      <div class="modal-card stack">
        <div>
          <h3 class="card-title">手机号登录</h3>
          <p class="muted">MVP 版使用 mock 登录，验证码填任意 6 位即可。</p>
        </div>
        <input class="input" id="login-mobile" placeholder="请输入手机号" />
        <input class="input" id="login-code" placeholder="请输入验证码，例如 123456" />
        <button class="primary-button" id="login-submit">立即登录</button>
        <button class="secondary-button" id="login-cancel">稍后再说</button>
      </div>
    </div>
  `;
}

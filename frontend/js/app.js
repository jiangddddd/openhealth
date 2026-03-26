import { hasToken, login, logout, setSelectedDreamId } from "./api.js";
import { bottomNav, loginModal, toast } from "./components.js";
import {
  bindHistoryPageEvents,
  bindHomePageEvents,
  bindInputPageEvents,
  bindMembershipPageEvents,
  bindResultPageEvents,
  renderHistoryPage,
  renderHomePage,
  renderInputPage,
  renderMembershipPage,
  renderResultPage,
} from "./pages.js";

const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");

const routes = {
  home: renderHomePage,
  input: renderInputPage,
  result: renderResultPage,
  history: renderHistoryPage,
  membership: renderMembershipPage,
};

function getCurrentRoute() {
  const route = location.hash.replace("#/", "") || "home";
  return routes[route] ? route : "home";
}

function navigate(route) {
  location.hash = `#/${route}`;
}

function openLoginModal() {
  modalRoot.innerHTML = loginModal();

  document.getElementById("login-cancel")?.addEventListener("click", closeLoginModal);
  document.getElementById("login-submit")?.addEventListener("click", async () => {
    const mobile = document.getElementById("login-mobile")?.value?.trim();
    const verifyCode = document.getElementById("login-code")?.value?.trim();
    if (!mobile || !verifyCode) {
      toast("请输入手机号和验证码。");
      return;
    }

    const submitNode = document.getElementById("login-submit");
    submitNode.disabled = true;
    submitNode.textContent = "登录中...";
    try {
      await login({
        loginType: "mobile",
        mobile,
        verifyCode,
      });
      toast("登录成功。");
      closeLoginModal();
      renderApp();
    } catch (error) {
      submitNode.disabled = false;
      submitNode.textContent = "立即登录";
      toast(error.message);
    }
  });
}

function closeLoginModal() {
  modalRoot.innerHTML = "";
}

async function ensureLoggedIn() {
  if (hasToken()) {
    return true;
  }
  openLoginModal();
  return false;
}

function bindCommonEvents(route) {
  document.querySelectorAll("[data-go]").forEach((node) => {
    node.addEventListener("click", async () => {
      if (node.dataset.requiresLogin === "true") {
        const canContinue = await ensureLoggedIn();
        if (!canContinue) {
          return;
        }
      }
      navigate(node.dataset.go);
    });
  });
  document.querySelectorAll("[data-open-login]").forEach((node) => {
    node.addEventListener("click", openLoginModal);
  });

  if (route === "home") {
    bindHomePageEvents({ navigate });
  }
  if (route === "input") {
    bindInputPageEvents({ navigate, ensureLoggedIn, toast });
  }
  if (route === "result") {
    bindResultPageEvents({ navigate, toast });
  }
  if (route === "history") {
    bindHistoryPageEvents({ navigate, setSelectedDreamId });
  }
  if (route === "membership") {
    bindMembershipPageEvents({ toast, refreshPage: renderApp, logout });
  }
}

async function renderApp() {
  const route = getCurrentRoute();
  const renderer = routes[route];

  app.innerHTML = `
    <div class="app-shell">
      <div class="card">
        <p class="muted">页面加载中...</p>
      </div>
      ${bottomNav(route)}
    </div>
  `;

  try {
    const pageHtml = await renderer();
    app.innerHTML = `
      <div class="app-shell">
        ${pageHtml}
        ${bottomNav(route)}
      </div>
    `;
    bindCommonEvents(route);
  } catch (error) {
    app.innerHTML = `
      <div class="app-shell">
        <div class="card empty-state">
          <h3>页面加载失败</h3>
          <p>${error.message}</p>
          <button class="primary-button" id="reload-page">重新加载</button>
        </div>
        ${bottomNav(route)}
      </div>
    `;
    document.getElementById("reload-page")?.addEventListener("click", renderApp);
  }
}

window.addEventListener("hashchange", renderApp);
window.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) {
    navigate("home");
  } else {
    renderApp();
  }
});

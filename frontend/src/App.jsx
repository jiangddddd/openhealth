import { useEffect, useState } from "react";

import BottomNav from "./components/BottomNav.jsx";
import LoginModal from "./components/LoginModal.jsx";
import MoodPage from "./pages/MoodPage.jsx";
import RecordPage from "./pages/RecordPage.jsx";
import SummaryPage from "./pages/SummaryPage.jsx";
import Toast from "./components/Toast.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import HomePage from "./pages/HomePage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import InputPage from "./pages/InputPage.jsx";
import MembershipPage from "./pages/MembershipPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import TrendPage from "./pages/TrendPage.jsx";
import WelcomePage from "./pages/WelcomePage.jsx";
import { login } from "./services/api.js";

const routes = ["welcome", "home", "record", "input", "mood", "summary", "result", "trend", "history", "membership"];

export default function App() {
  const { route, navigate } = useHashRoute(routes, "home");
  const [token, setToken] = useLocalStorage("dream_token", "");
  const [selectedDreamId, setSelectedDreamId] = useLocalStorage("selected_dream_id", "");
  const [selectedMoodData, setSelectedMoodData] = useLocalStorage("selected_mood_data", "");
  const [selectedSummaryData, setSelectedSummaryData] = useLocalStorage("selected_summary_data", "");
  const [historyFilter, setHistoryFilter] = useLocalStorage("history_filter", "all");
  const [loginVisible, setLoginVisible] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [previousRoute, setPreviousRoute] = useState("");

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToastMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    setPreviousRoute(route);
  }, [route]);

  const showToast = (message) => setToastMessage(message);

  const openLogin = () => setLoginVisible(true);
  const closeLogin = () => setLoginVisible(false);

  const handleLogin = async ({ mobile, verifyCode }) => {
    if (!mobile || !verifyCode) {
      showToast("先输入手机号和验证码，我们再帮你保存记录。");
      return;
    }

    setLoginLoading(true);
    try {
      const data = await login({
        loginType: "mobile",
        mobile,
        verifyCode,
      });
      setToken(data.token);
      navigate("welcome");
      showToast("已经登录，先看看这里，再开始记录今天的自己。");
      setLoginVisible(false);
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setSelectedDreamId("");
    setSelectedMoodData("");
    setSelectedSummaryData("");
    setHistoryFilter("all");
    showToast("已退出登录。");
    navigate("home");
  };

  const pageProps = {
    token,
    navigate,
    openLogin,
    showToast,
    selectedDreamId,
    setSelectedDreamId,
    selectedMoodData,
    setSelectedMoodData,
    selectedSummaryData,
    setSelectedSummaryData,
    historyFilter,
    setHistoryFilter,
    logout: handleLogout,
    currentRoute: route,
    previousRoute,
  };

  const shouldShowOnboarding = route === "welcome";
  const finishOnboarding = () => navigate("home");

  let pageNode = null;
  if (shouldShowOnboarding) {
    pageNode = <WelcomePage onFinish={finishOnboarding} />;
  } else if (route === "home") {
    pageNode = <HomePage {...pageProps} />;
  } else if (route === "record") {
    pageNode = <RecordPage {...pageProps} />;
  } else if (route === "input") {
    pageNode = <InputPage {...pageProps} />;
  } else if (route === "mood") {
    pageNode = <MoodPage {...pageProps} />;
  } else if (route === "summary") {
    pageNode = <SummaryPage {...pageProps} />;
  } else if (route === "result") {
    pageNode = <ResultPage {...pageProps} />;
  } else if (route === "trend") {
    pageNode = <TrendPage {...pageProps} />;
  } else if (route === "history") {
    pageNode = <HistoryPage {...pageProps} />;
  } else if (route === "membership") {
    pageNode = <MembershipPage {...pageProps} />;
  }

  const guardedNavigate = (nextRoute) => {
    const protectedRoutes = ["record", "input", "mood", "summary", "trend", "history", "membership"];
    if (!token && protectedRoutes.includes(nextRoute)) {
      openLogin();
      return;
    }
    if (nextRoute === "history" && route !== "summary") {
      setHistoryFilter("all");
    }
    navigate(nextRoute);
  };

  return (
    <>
      <div className="app-atmosphere" aria-hidden="true">
        <span className="app-orb app-orb-1" />
        <span className="app-orb app-orb-2" />
        <span className="app-orb app-orb-3" />
      </div>

      <div className="app-shell mobile-app-shell">
        <main className={`page-content ${!shouldShowOnboarding ? "page-content-mobile" : ""}`.trim()}>
          {pageNode}
        </main>
      </div>

      {!shouldShowOnboarding ? (
        <div className="mobile-tabbar-shell">
          <BottomNav current={route} onNavigate={guardedNavigate} className="mobile-tabbar" />
        </div>
      ) : null}

      {loginVisible ? (
        <LoginModal onSubmit={handleLogin} onClose={closeLogin} loading={loginLoading} />
      ) : null}
      <Toast message={toastMessage} />
    </>
  );
}

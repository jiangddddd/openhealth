import { useEffect, useState } from "react";

import BottomNav from "./components/BottomNav.jsx";
import LoginModal from "./components/LoginModal.jsx";
import Toast from "./components/Toast.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { loginWithMobile } from "./services/api.js";
import DashboardPage from "./pages/DashboardPage.jsx";
import DreamPage from "./pages/DreamPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import JournalPage from "./pages/JournalPage.jsx";
import MembershipPage from "./pages/MembershipPage.jsx";
import MoodPage from "./pages/MoodPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import SummaryPage from "./pages/SummaryPage.jsx";
import TrendPage from "./pages/TrendPage.jsx";
import WelcomePage from "./pages/WelcomePage.jsx";

const routes = [
  "welcome",
  "dashboard",
  "journal",
  "dream",
  "mood",
  "summary",
  "result",
  "trend",
  "history",
  "membership",
];

export default function App() {
  const { route, navigate } = useHashRoute(routes, "dashboard");
  const [token, setToken] = useLocalStorage("english_frontend_token", "");
  const [selectedDreamId, setSelectedDreamId] = useLocalStorage("english_frontend_selected_dream_id", "");
  const [selectedSummaryData, setSelectedSummaryData] = useLocalStorage("english_frontend_selected_summary", "");
  const [loginVisible, setLoginVisible] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [welcomeStep, setWelcomeStep] = useState(0);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToastMessage(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (message) => setToastMessage(message);
  const openLogin = () => setLoginVisible(true);
  const closeLogin = () => setLoginVisible(false);

  const handleLogin = async ({ mobile, verifyCode }) => {
    const m = (mobile || "").trim();
    const v = (verifyCode || "").trim();
    if (!m || !v) {
      showToast("Please enter a mobile number and a verification code.");
      return;
    }

    setLoginLoading(true);
    try {
      const data = await loginWithMobile({ mobile: m, verifyCode: v });
      setToken(data.token);
      navigate("welcome");
      setWelcomeStep(0);
      setLoginVisible(false);
      showToast("Signed in successfully.");
    } catch (error) {
      showToast(error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setSelectedDreamId("");
    setSelectedSummaryData("");
    navigate("dashboard");
    showToast("Signed out.");
  };

  const guardedNavigate = (nextRoute) => {
    const protectedRoutes = ["journal", "dream", "mood", "summary", "result", "trend", "history", "membership"];
    if (!token && protectedRoutes.includes(nextRoute)) {
      openLogin();
      return;
    }
    navigate(nextRoute);
  };

  const pageProps = {
    token,
    navigate: guardedNavigate,
    openLogin,
    showToast,
    selectedDreamId,
    setSelectedDreamId,
    selectedSummaryData,
    setSelectedSummaryData,
    logout: handleLogout,
  };

  let pageNode = null;
  if (route === "welcome") {
    pageNode = <WelcomePage step={welcomeStep} setStep={setWelcomeStep} onFinish={() => guardedNavigate("dashboard")} />;
  } else if (route === "dashboard") {
    pageNode = <DashboardPage {...pageProps} />;
  } else if (route === "journal") {
    pageNode = <JournalPage {...pageProps} />;
  } else if (route === "dream") {
    pageNode = <DreamPage {...pageProps} />;
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

  return (
    <>
      <div className="app-shell">
        <main className="page-shell">{pageNode}</main>
      </div>
      {route !== "welcome" ? <BottomNav current={route} onNavigate={guardedNavigate} /> : null}
      {loginVisible ? <LoginModal onSubmit={handleLogin} onClose={closeLogin} loading={loginLoading} /> : null}
      <Toast message={toastMessage} />
    </>
  );
}

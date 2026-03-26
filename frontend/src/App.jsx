import { useEffect, useState } from "react";

import BottomNav from "./components/BottomNav.jsx";
import LoginModal from "./components/LoginModal.jsx";
import Toast from "./components/Toast.jsx";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import HomePage from "./pages/HomePage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import InputPage from "./pages/InputPage.jsx";
import MembershipPage from "./pages/MembershipPage.jsx";
import ResultPage from "./pages/ResultPage.jsx";
import { login } from "./services/api.js";

const routes = ["home", "input", "result", "history", "membership"];

export default function App() {
  const { route, navigate } = useHashRoute(routes, "home");
  const [token, setToken] = useLocalStorage("dream_token", "");
  const [selectedDreamId, setSelectedDreamId] = useLocalStorage("selected_dream_id", "");
  const [loginVisible, setLoginVisible] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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
    if (!mobile || !verifyCode) {
      showToast("请输入手机号和验证码。");
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
      showToast("登录成功。");
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
    logout: handleLogout,
  };

  let pageNode = null;
  if (route === "home") {
    pageNode = <HomePage {...pageProps} />;
  } else if (route === "input") {
    pageNode = <InputPage {...pageProps} />;
  } else if (route === "result") {
    pageNode = <ResultPage {...pageProps} />;
  } else if (route === "history") {
    pageNode = <HistoryPage {...pageProps} />;
  } else if (route === "membership") {
    pageNode = <MembershipPage {...pageProps} />;
  }

  const guardedNavigate = (nextRoute) => {
    const protectedRoutes = ["input", "history", "membership"];
    if (!token && protectedRoutes.includes(nextRoute)) {
      openLogin();
      return;
    }
    navigate(nextRoute);
  };

  return (
    <>
      <div className="app-shell">
        {pageNode}
        <BottomNav current={route} onNavigate={guardedNavigate} />
      </div>
      {loginVisible ? (
        <LoginModal onSubmit={handleLogin} onClose={closeLogin} loading={loginLoading} />
      ) : null}
      <Toast message={toastMessage} />
    </>
  );
}

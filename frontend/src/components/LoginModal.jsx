import { useState } from "react";

import Button from "./Button.jsx";

export default function LoginModal({ onSubmit, onClose, loading }) {
  const [mobile, setMobile] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  return (
    <div className="modal-mask">
      <div className="modal-card stack">
        <div>
          <h3 className="card-title">手机号登录</h3>
          <p className="muted">MVP 版使用 mock 登录，验证码填任意 6 位即可。</p>
        </div>
        <input
          className="input"
          placeholder="请输入手机号"
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
        />
        <input
          className="input"
          placeholder="请输入验证码，例如 123456"
          value={verifyCode}
          onChange={(event) => setVerifyCode(event.target.value)}
        />
        <Button onClick={() => onSubmit({ mobile, verifyCode })} disabled={loading}>
          {loading ? "登录中..." : "立即登录"}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          稍后再说
        </Button>
      </div>
    </div>
  );
}

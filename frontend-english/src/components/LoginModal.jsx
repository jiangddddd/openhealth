import { useState } from "react";

import { Card, PrimaryButton, SecondaryButton } from "./ui.jsx";

export default function LoginModal({ onSubmit, onClose, loading }) {
  const [mobile, setMobile] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  return (
    <div className="modal-mask">
      <Card className="modal-card" title="Sign in">
        <p className="card-subtitle">
          Same mock login as the main app: use your mobile number and any non-empty verification code (the server does not
          validate the code yet). Leading or trailing spaces are trimmed.
        </p>
        <input
          className="input"
          placeholder="Mobile number"
          value={mobile}
          onChange={(event) => setMobile(event.target.value)}
        />
        <input
          className="input"
          placeholder="Verification code"
          value={verifyCode}
          onChange={(event) => setVerifyCode(event.target.value)}
        />
        <div className="button-stack">
          <PrimaryButton onClick={() => onSubmit({ mobile, verifyCode })} disabled={loading}>
            {loading ? "Signing in..." : "Continue"}
          </PrimaryButton>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>
      </Card>
    </div>
  );
}

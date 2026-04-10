import { useEffect, useState } from "react";

import { createOrder, fetchMembershipInfo, fetchProfile } from "../services/api.js";
import { Card, EmptyState, LoadingBlock, PageHeader, PrimaryButton } from "../components/ui.jsx";

export default function MembershipPage({ token, openLogin, showToast }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    profile: null,
    membership: null,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState({ loading: false, error: "NOT_LOGIN", profile: null, membership: null });
        }
        return;
      }

      try {
        const [profile, membership] = await Promise.all([
          fetchProfile(token),
          fetchMembershipInfo(token),
        ]);
        if (active) {
          setState({ loading: false, error: "", profile, membership });
        }
      } catch (error) {
        if (active) {
          setState({ loading: false, error: error.message, profile: null, membership: null });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  if (state.loading) {
    return <LoadingBlock title="Loading account" description="Fetching membership state and available plans." />;
  }

  if (state.error) {
    return (
      <EmptyState
        title={state.error === "NOT_LOGIN" ? "Sign in to view account details" : "Account page unavailable"}
        description={state.error === "NOT_LOGIN" ? "Membership details are tied to the current user." : state.error}
        actionText="Open login"
        onAction={openLogin}
      />
    );
  }

  const membership = state.membership || { plans: [], benefits: [] };
  const activePlan = membership.plans[0] || null;

  return (
    <>
      <PageHeader
        title="Membership"
        description="An English account page wired to the same membership and mock order APIs."
      />

      <div className="page-grid">
        <Card title="Current state">
          <p className="summary-highlight">{state.profile?.membershipStatus || "free"}</p>
          <p className="card-subtitle">Expire at: {state.profile?.membershipExpireAt || "Not active"}</p>
        </Card>

        <Card title="Benefits">
          <ul className="bullet-list">
            {membership.benefits.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Card>

        <Card title="Plans" className="wide-card">
          <div className="list-stack">
            {membership.plans.map((plan) => (
              <div key={plan.planType} className="list-row">
                <strong>{plan.planName}</strong>
                <p>
                  {plan.price} {plan.currency} / {plan.planType}
                </p>
              </div>
            ))}
          </div>
          {activePlan ? (
            <PrimaryButton
              onClick={async () => {
                try {
                  await createOrder(token, {
                    productType: "membership",
                    planType: activePlan.planType,
                    payChannel: "wechatpay",
                  });
                  showToast("Mock membership order created successfully.");
                } catch (error) {
                  showToast(error.message);
                }
              }}
            >
              Create mock order
            </PrimaryButton>
          ) : null}
        </Card>
      </div>
    </>
  );
}

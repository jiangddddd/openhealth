import { useEffect, useState } from "react";

import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { createOrder, fetchMembershipInfo, fetchOrder, fetchProfile } from "../services/api.js";

export default function MembershipPage({
  token,
  openLogin,
  showToast,
  logout,
}) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    profile: null,
    membership: null,
    selectedPlan: "monthly",
    orderResult: null,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) {
        if (active) {
          setState((prev) => ({ ...prev, loading: false, error: "NOT_LOGIN" }));
        }
        return;
      }

      try {
        const [profile, membership] = await Promise.all([
          fetchProfile(token),
          fetchMembershipInfo(token),
        ]);
        if (active) {
          setState({
            loading: false,
            error: "",
            profile,
            membership,
            selectedPlan: membership.plans?.[0]?.planType || "monthly",
            orderResult: null,
          });
        }
      } catch (error) {
        if (active) {
          setState((prev) => ({ ...prev, loading: false, error: error.message }));
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  if (state.loading) {
    return (
      <>
        <PageHeader title="我的 / 会员" description="把一次解梦，变成长期陪伴。" />
        <Card>
          <p className="muted">会员信息加载中...</p>
        </Card>
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <PageHeader title="我的 / 会员" description="把一次解梦，变成长期陪伴。" />
        <EmptyState
          title="登录后查看会员与档案"
          description="你可以先登录，再查看会员权益、购买方案和个人记录概览。"
          buttonText="现在去登录"
          onAction={openLogin}
        />
      </>
    );
  }

  const handleCreateOrder = async () => {
    try {
      const order = await createOrder(token, {
        productType: "membership",
        planType: state.selectedPlan,
        payChannel: "wechatpay",
      });
      const detail = await fetchOrder(token, order.orderId);
      setState((prev) => ({
        ...prev,
        orderResult: {
          orderNo: order.orderNo,
          payStatus: detail.payStatus,
        },
      }));
      showToast("MVP 版已创建 mock 订单。");
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <>
      <PageHeader title="我的 / 会员" description="把一次解梦，变成长期陪伴。" />

      <Card>
        <div className="stack">
          <div className="badge">
            {state.profile.membershipStatus === "pro" ? "当前 Pro 会员" : "当前免费用户"}
          </div>
          <div className="stats-grid">
            <div className="stat-box">
              <strong>{state.profile.totalDreamCount}</strong>
              <span className="small">累计梦境</span>
            </div>
            <div className="stat-box">
              <strong>{state.profile.consecutiveDays}</strong>
              <span className="small">连续记录</span>
            </div>
            <div className="stat-box">
              <strong>{state.profile.membershipExpireAt ? "已开通" : "未开通"}</strong>
              <span className="small">会员状态</span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Pro 可以为你解锁什么">
        <ul className="benefit-list">
          {state.membership.benefits.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <Card title="选择方案">
        <div className="stack">
          {state.membership.plans.map((plan, index) => (
            <article
              key={plan.planType}
              className={`price-card ${state.selectedPlan === plan.planType ? "active" : ""}`}
              onClick={() => setState((prev) => ({ ...prev, selectedPlan: plan.planType }))}
            >
              <div className="list-item-top">
                <strong>{plan.planName}</strong>
                <span className="badge">{index === 0 ? "推荐" : "长期更省"}</span>
              </div>
              <p className="muted">
                ￥{plan.price} / {plan.planType === "monthly" ? "月" : "年"}
              </p>
            </article>
          ))}
          <Button onClick={handleCreateOrder}>开通 Pro</Button>
          <Button variant="secondary" onClick={logout}>
            退出登录
          </Button>
        </div>
      </Card>

      {state.orderResult ? (
        <Card title="订单已创建">
          <div className="stack">
            <div className="result-item">
              <h4>订单号</h4>
              <p>{state.orderResult.orderNo}</p>
            </div>
            <div className="result-item">
              <h4>支付状态</h4>
              <p>{state.orderResult.payStatus}</p>
            </div>
          </div>
        </Card>
      ) : null}
    </>
  );
}

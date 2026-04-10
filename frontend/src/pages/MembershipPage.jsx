import { useEffect, useState } from "react";

import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import EmptyState from "../components/EmptyState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { createOrder, fetchMembershipInfo, fetchOrder, fetchProfile } from "../services/api.js";
import { trackMembershipView, trackPaymentClick, trackPaymentSuccess } from "../services/tracker.js";

export default function MembershipPage({
  token,
  openLogin,
  showToast,
  logout,
  previousRoute,
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
          trackMembershipView(token, { fromPage: previousRoute || "direct" });
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
  }, [previousRoute, token]);

  if (state.loading) {
    return (
      <>
        <PageHeader title="把一次记录，变成长期陪伴" description="连续记录、总结与趋势分析，会帮助你更清楚地看见自己的情绪模式与生活节奏。" />
        <Card>
          <p className="muted">会员信息加载中...</p>
        </Card>
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <PageHeader title="把一次记录，变成长期陪伴" description="连续记录、总结与趋势分析，会帮助你更清楚地看见自己的情绪模式与生活节奏。" />
        <EmptyState
          title="登录后查看完整陪伴"
          description="先登录，再看看更完整的总结、趋势和长期记录能力。"
          buttonText="先去登录"
          onAction={openLogin}
        />
      </>
    );
  }

  const handleCreateOrder = async () => {
    try {
      const selectedPlan = state.membership.plans.find((plan) => plan.planType === state.selectedPlan);
      trackPaymentClick(token, {
        productType: "membership",
        planType: state.selectedPlan,
        amount: selectedPlan?.price || null,
        fromPage: "membership",
      });
      const order = await createOrder(token, {
        productType: "membership",
        planType: state.selectedPlan,
        payChannel: "wechatpay",
      });
      const detail = await fetchOrder(token, order.orderId);
      if (detail.payStatus === "paid") {
        trackPaymentSuccess(token, {
          orderId: order.orderId,
          productType: "membership",
          planType: state.selectedPlan,
          amount: selectedPlan?.price || null,
        });
      }
      setState((prev) => ({
        ...prev,
        orderResult: {
          orderNo: order.orderNo,
          payStatus: detail.payStatus,
        },
      }));
      showToast("已创建订单。离更完整的陪伴又近了一点。");
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <>
      <PageHeader title="把一次记录，变成长期陪伴" description="连续记录、总结与趋势分析，会帮助你更清楚地看见自己的情绪模式与生活节奏。" />

      <Card className="membership-hero-card">
        <div className="stack">
          <div className="membership-hero-top">
            <div>
              <div className="section-eyebrow">长期陪伴</div>
              <h3 className="section-title">
                {state.profile.membershipStatus === "pro" ? "你已经开启更完整的陪伴" : "把一次记录，变成长期陪伴"}
              </h3>
              <p className="section-desc">当记录变多，你会更清楚地看见自己的情绪模式、生活节奏，以及那些反复出现的线索。</p>
            </div>
            <div className="badge">
              {state.profile.membershipStatus === "pro" ? "当前 Pro 会员" : "当前免费用户"}
            </div>
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
        <p className="section-desc">不只是多一点内容，而是更持续、更有层次的理解和反馈。</p>
        <ul className="benefit-list">
          {state.membership.benefits.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <Card title="选择方案" className="membership-plan-card">
        <p className="section-desc">先选择一个适合自己的节奏，再决定是否继续长期记录。</p>
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
          <Button onClick={handleCreateOrder}>开通会员</Button>
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

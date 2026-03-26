import { createEventLog } from "./api.js";

export const PAGE_NAMES = {
  home: "home",
  input: "input",
  result: "result",
  history: "history",
  membership: "membership",
};

function safeTrack(token, eventName, pageName, eventPayload) {
  return createEventLog(token || "", {
    eventName,
    pageName,
    eventPayload,
  }).catch((error) => {
    console.warn(`[track:${eventName}]`, error.message);
    return null;
  });
}

export function trackHomeView(token, { source, isLogin }) {
  return safeTrack(token, "home_view", PAGE_NAMES.home, {
    source: source || "direct",
    is_login: Boolean(isLogin),
  });
}

export function trackDreamEntryClick(token, { fromPage, pageName }) {
  return safeTrack(token, "dream_entry_click", pageName || PAGE_NAMES.home, {
    from_page: fromPage || "unknown",
  });
}

export function trackDreamSubmit(token, payload) {
  return safeTrack(token, "dream_submit", PAGE_NAMES.input, {
    dream_record_id: payload.dreamRecordId,
    dream_text_length: payload.dreamTextLength,
    has_emotion: payload.hasEmotion,
    has_people: payload.hasPeople,
    has_symbols: payload.hasSymbols,
  });
}

export function trackDreamResultView(token, { dreamRecordId }) {
  return safeTrack(token, "dream_result_view", PAGE_NAMES.result, {
    dream_record_id: dreamRecordId,
  });
}

export function trackFollowupSubmit(token, payload) {
  return safeTrack(token, "followup_submit", PAGE_NAMES.result, {
    dream_record_id: payload.dreamRecordId,
    followup_id: payload.followupId,
    answer_length: payload.answerLength,
  });
}

export function trackFollowupResultView(token, payload) {
  return safeTrack(token, "followup_result_view", PAGE_NAMES.result, {
    dream_record_id: payload.dreamRecordId,
    followup_id: payload.followupId,
  });
}

export function trackFortuneView(token, { fortuneDate }) {
  return safeTrack(token, "fortune_view", PAGE_NAMES.home, {
    fortune_date: fortuneDate,
  });
}

export function trackHistoryView(token) {
  return safeTrack(token, "history_view", PAGE_NAMES.history, {});
}

export function trackHistoryItemClick(token, { dreamRecordId }) {
  return safeTrack(token, "history_item_click", PAGE_NAMES.history, {
    dream_record_id: dreamRecordId,
  });
}

export function trackMembershipView(token, { fromPage }) {
  return safeTrack(token, "membership_view", PAGE_NAMES.membership, {
    from_page: fromPage || "direct",
  });
}

export function trackPaymentClick(token, payload) {
  return safeTrack(token, "payment_click", PAGE_NAMES.membership, {
    product_type: payload.productType,
    plan_type: payload.planType,
    amount: payload.amount,
    from_page: payload.fromPage || PAGE_NAMES.membership,
  });
}

export function trackPaymentSuccess(token, payload) {
  return safeTrack(token, "payment_success", PAGE_NAMES.membership, {
    order_id: payload.orderId,
    product_type: payload.productType,
    plan_type: payload.planType,
    amount: payload.amount,
  });
}

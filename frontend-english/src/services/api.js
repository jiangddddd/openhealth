const API_BASE = "";

function buildHeaders(token, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatFastApiDetail(detail) {
  if (detail == null) {
    return "";
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item.msg === "string") {
          return item.msg;
        }
        return String(item);
      })
      .filter(Boolean)
      .join("; ");
  }
  return String(detail);
}

function parseApiPayload(text, status) {
  if (!text || !text.trim()) {
    return {};
  }
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    throw new Error(
      `Server returned HTML instead of JSON (HTTP ${status}). Check that the request URL is correct (e.g. /api/... on the same host as the app).`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Could not read server response (HTTP ${status}).`);
  }
}

async function request(path, token = "", options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(token, options.headers),
  });

  const text = await response.text();
  const data = parseApiPayload(text, response.status);
  const code = data.code;
  const message =
    (typeof data.message === "string" && data.message) ||
    formatFastApiDetail(data.detail) ||
    "Request failed";
  const success = response.ok && (code === 0 || code === undefined);
  if (!success) {
    throw new Error(message);
  }
  return data.data;
}

export function loginWithMobile(payload) {
  return request("/api/auth/login", "", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginType: "mobile",
      mobile: payload.mobile || "",
      verifyCode: payload.verifyCode || "",
    }),
  });
}

export function fetchProfile(token) {
  return request("/api/user/profile", token);
}

export function fetchHomeOverview(token) {
  return request("/api/home/overview", token);
}

export function submitDream(token, payload) {
  return request("/api/dream/interpret", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchDreamDetail(token, dreamRecordId) {
  return request(`/api/dream/${dreamRecordId}`, token);
}

export function fetchDreamList(token, pageNo = 1, pageSize = 20) {
  return request(`/api/dream/list?pageNo=${pageNo}&pageSize=${pageSize}&filterType=all`, token);
}

export function submitFollowup(token, payload) {
  return request("/api/dream/followup", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createMoodRecord(token, payload) {
  return request("/api/mood/create", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchMoodList(token, pageNo = 1, pageSize = 20, moodType = "") {
  const filter = moodType ? `&moodType=${encodeURIComponent(moodType)}` : "";
  return request(`/api/mood/list?pageNo=${pageNo}&pageSize=${pageSize}${filter}`, token);
}

export function fetchSummaryToday(token) {
  return request("/api/summary/today", token);
}

export function generateSummary(token, payload = {}) {
  return request("/api/summary/generate", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchSummaryList(token, pageNo = 1, pageSize = 20) {
  return request(`/api/summary/list?pageNo=${pageNo}&pageSize=${pageSize}`, token);
}

export function fetchMembershipInfo(token) {
  return request("/api/membership/info", token);
}

export function createOrder(token, payload) {
  return request("/api/order/create", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createFeedback(token, payload) {
  return request("/api/feedback/create", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

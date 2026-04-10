const API_BASE = "";

function buildHeaders(token, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, token = "", options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(token, options.headers),
  });

  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(data.message || "请求失败");
  }
  return data.data;
}

export function login(payload) {
  return request("/api/auth/login", "", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchProfile(token) {
  return request("/api/user/profile", token);
}

export function submitDream(token, payload) {
  return request("/api/dream/interpret", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchDreamDetail(token, id) {
  return request(`/api/dream/${id}`, token);
}

export function fetchDreamList(token, pageNo = 1, pageSize = 10) {
  return request(`/api/dream/list?pageNo=${pageNo}&pageSize=${pageSize}&filterType=all`, token);
}

export function submitFollowup(token, payload) {
  return request("/api/dream/followup", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchFortune(token) {
  return request("/api/fortune/today", token);
}

export function createMoodRecord(token, payload) {
  return request("/api/mood/create", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchMoodToday(token) {
  return request("/api/mood/today", token);
}

export function fetchMoodList(token, pageNo = 1, pageSize = 10, moodType = "") {
  const filter = moodType ? `&moodType=${encodeURIComponent(moodType)}` : "";
  return request(`/api/mood/list?pageNo=${pageNo}&pageSize=${pageSize}${filter}`, token);
}

export function generateSummary(token, payload = {}) {
  return request("/api/summary/generate", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchSummaryToday(token) {
  return request("/api/summary/today", token);
}

export function fetchSummaryList(token, pageNo = 1, pageSize = 10) {
  return request(`/api/summary/list?pageNo=${pageNo}&pageSize=${pageSize}`, token);
}

export function fetchHomeOverview(token) {
  return request("/api/home/overview", token);
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

export function fetchOrder(token, orderId) {
  return request(`/api/order/${orderId}`, token);
}

export function createFeedback(token, payload) {
  return request("/api/feedback/create", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createEventLog(token = "", payload) {
  return request("/api/event/create", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

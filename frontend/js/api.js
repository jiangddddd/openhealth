const API_BASE = "";

function getToken() {
  return localStorage.getItem("dream_token") || "";
}

function setToken(token) {
  localStorage.setItem("dream_token", token);
}

function setUserId(userId) {
  localStorage.setItem("dream_user_id", String(userId));
}

function getSelectedDreamId() {
  return localStorage.getItem("selected_dream_id");
}

function setSelectedDreamId(id) {
  localStorage.setItem("selected_dream_id", String(id));
}

function buildHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(data.message || "请求失败");
  }
  return data.data;
}

export async function login(payload) {
  const data = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  setToken(data.token);
  setUserId(data.userId);
  return data;
}

export function logout() {
  localStorage.removeItem("dream_token");
  localStorage.removeItem("dream_user_id");
}

export function hasToken() {
  return Boolean(getToken());
}

export async function fetchProfile() {
  return request("/api/user/profile");
}

export async function submitDream(payload) {
  const data = await request("/api/dream/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  setSelectedDreamId(data.dreamRecordId);
  return data;
}

export async function fetchDreamDetail(id = getSelectedDreamId()) {
  if (!id) {
    return null;
  }
  return request(`/api/dream/${id}`);
}

export async function fetchDreamList(pageNo = 1, pageSize = 10) {
  return request(`/api/dream/list?pageNo=${pageNo}&pageSize=${pageSize}&filterType=all`);
}

export async function submitFollowup(payload) {
  return request("/api/dream/followup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchFortune() {
  return request("/api/fortune/today");
}

export async function fetchMembershipInfo() {
  return request("/api/membership/info");
}

export async function createOrder(payload) {
  return request("/api/order/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchOrder(orderId) {
  return request(`/api/order/${orderId}`);
}

export async function createFeedback(payload) {
  return request("/api/feedback/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export { getSelectedDreamId, setSelectedDreamId };

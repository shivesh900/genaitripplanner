// Trip storage.
// • Default (static hosting, e.g. GitHub Pages): trips live in this browser's localStorage.
// • With VITE_API_URL set at build time, trips go to the Express + MongoDB backend in /backend.

const API = (import.meta.env?.VITE_API_URL || "").replace(/\/$/, "");
const KEY = "trip-planner-trips";

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const write = (list) => localStorage.setItem(KEY, JSON.stringify(list));
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(`Server answered ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const storageMode = API ? "server" : "browser";

export async function listTrips() {
  if (API) return api("/api/trips");
  return read().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function getTrip(id) {
  if (API) return api(`/api/trips/${id}`);
  return read().find((t) => t._id === id) || null;
}

export async function createTrip(data) {
  if (API) return api("/api/trips", { method: "POST", body: JSON.stringify(data) });
  const trip = { ...data, _id: newId(), createdAt: new Date().toISOString() };
  write([...read(), trip]);
  return trip;
}

export async function updateTrip(id, patch) {
  if (API) return api(`/api/trips/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  const list = read();
  const i = list.findIndex((t) => t._id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  write(list);
  return list[i];
}

export async function deleteTrip(id) {
  if (API) return api(`/api/trips/${id}`, { method: "DELETE" });
  write(read().filter((t) => t._id !== id));
  return null;
}

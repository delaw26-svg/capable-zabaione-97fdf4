import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I to avoid misreading
const MAX_PER_BATCH = 500;
function response(status, body) { return new Response(JSON.stringify(body), { status, headers }); }
function validToken(req) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const [payload, signature] = token.split(".");
    const secret = "warieebi-portal-session-secret-change-this-9f4a7c2d8b1e6a5f";
    if (!payload || !signature) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() && data.sub === "admin";
  } catch { return false; }
}
function randomCode() {
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join("");
}
export default async (req) => {
  if (!validToken(req)) return response(401, { error: "Admin sign-in required to manage access codes." });
  const store = getStore("warieebi-school-portal");
  const state = await store.get("school-state", { type: "json" }) || { students: [], scores: [], codes: [], news: [], published: [] };
  const codes = state.codes || [];

  if (req.method === "POST") {
    const { count, reg } = await req.json().catch(() => ({}));
    const n = Math.floor(Number(count));
    if (!n || n < 1 || n > MAX_PER_BATCH) return response(400, { error: `Enter a number of codes between 1 and ${MAX_PER_BATCH}.` });
    const assignTo = String(reg || "").trim();
    if (assignTo && !(state.students || []).some(s => s.reg === assignTo)) return response(404, { error: "Selected student was not found." });
    const existing = new Set(codes.map(c => c.code));
    const batch = crypto.randomUUID();
    const added = [];
    while (added.length < n) {
      const code = randomCode();
      if (existing.has(code)) continue;
      existing.add(code);
      added.push({ id: crypto.randomUUID(), code, reg: assignTo, used: false, batch, createdAt: new Date().toISOString() });
    }
    const next = [...codes, ...added];
    await store.setJSON("school-state", { ...state, codes: next });
    return response(200, { added, codes: next });
  }

  if (req.method === "DELETE") {
    const { ids } = await req.json().catch(() => ({}));
    if (!Array.isArray(ids) || !ids.length) return response(400, { error: "No codes selected." });
    const remove = new Set(ids);
    // Used codes are kept as a record of which student used them.
    const next = codes.filter(c => !(remove.has(c.id) && !c.used));
    await store.setJSON("school-state", { ...state, codes: next });
    return response(200, { removed: codes.length - next.length, codes: next });
  }

  return response(405, { error: "Method not allowed." });
};

export const config = { path: "/api/codes" };

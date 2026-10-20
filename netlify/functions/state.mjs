import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const KEYS = ["students", "scores", "codes", "news", "published", "subjects"];
function response(status, body) { return new Response(JSON.stringify(body), { status, headers }); }
function validToken(req) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const [payload, signature] = token.split(".");
    const secret = "warieebi-portal-session-secret-change-this-9f4a7c2d8b1e6a5f";
    if (!payload || !signature || !secret) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() && data.sub === "admin";
  } catch { return false; }
}
const defaults = { students: [], scores: [], codes: [], news: [], published: [], subjects: null };
async function load(store) {
  return await store.get("school-state", { type: "json" }) || defaults;
}
export default async (req) => {
  const store = getStore("warieebi-school-portal");
  if (req.method === "GET") {
    const state = { ...defaults, ...(await load(store)) };
    if (validToken(req)) return response(200, state);
    // Public view: only minimal student identity and scores for results already published.
    const published = state.published || [];
    const visibleScores = (state.scores || []).filter(x => published.includes(`${x.reg}|${x.term}|${x.session || x.sess || ""}`));
    const visibleRegs = new Set(visibleScores.map(x => x.reg));
    const publicStudents = (state.students || []).filter(x => visibleRegs.has(x.reg)).map(x => ({
      reg: x.reg, name: x.name, category: x.category, className: x.className
    }));
    return response(200, {
      students: publicStudents,
      scores: visibleScores,
      codes: [],
      news: state.news || [],
      subjects: state.subjects || null,
      published
    });
  }
  if (req.method !== "POST") return response(405, { error: "Method not allowed." });
  if (!validToken(req)) return response(401, { error: "Admin sign-in required to change school records." });
  const { key, value } = await req.json().catch(() => ({}));
  // "subjects" is an object mapping each school section to its list of subject names.
  const validSubjects = key === "subjects" && value && typeof value === "object" && !Array.isArray(value)
    && Object.values(value).every(list => Array.isArray(list) && list.every(x => typeof x === "string"));
  if (!KEYS.includes(key) || (key === "subjects" ? !validSubjects : !Array.isArray(value))) return response(400, { error: "Invalid school record update." });
  const current = { ...defaults, ...(await load(store)) };
  let next = value;
  if (key === "codes") {
    // Never let a stale admin browser revive a code that has already been used.
    const usedById = new Map((current.codes || []).filter(c => c.used).map(c => [c.id, c]));
    next = value.map(c => usedById.get(c.id) || c);
    const kept = new Set(next.map(c => c.id));
    usedById.forEach((c, id) => { if (!kept.has(id)) next.push(c); });
  }
  const state = { ...current, [key]: next };
  await store.setJSON("school-state", state);
  return response(200, { ok: true });
};

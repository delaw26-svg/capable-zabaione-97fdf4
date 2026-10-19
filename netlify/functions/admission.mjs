import { getStore } from "@netlify/blobs";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
function response(status, body) { return new Response(JSON.stringify(body), { status, headers }); }
export default async (req) => {
  if (req.method !== "POST") return response(405, { error: "Method not allowed." });
  const s = await req.json().catch(() => null);
  if (!s || !String(s.name || "").trim() || !String(s.className || "").trim() || !String(s.category || "").trim()) {
    return response(400, { error: "Please provide the student's name, school section and class." });
  }
  const store = getStore("warieebi-school-portal");
  const state = await store.get("school-state", { type: "json" }) || { students: [], scores: [], codes: [], news: [], published: [] };
  const students = state.students || [];
  if (students.some(x => x.reg === s.reg)) return response(409, { error: "This registration number already exists. Please contact the school office." });
  students.push(s);
  await store.setJSON("school-state", { ...state, students });
  return response(200, { student: s });
};

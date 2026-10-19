import { getStore } from "@netlify/blobs";
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
function response(status, body) { return new Response(JSON.stringify(body), { status, headers }); }
export default async (req) => {
  if (req.method !== "POST") return response(405, { error: "Method not allowed." });
  const { reg, code } = await req.json().catch(() => ({}));
  if (!reg || !code) return response(400, { error: "Enter registration number and access code." });
  const store = getStore("warieebi-school-portal");
  const state = await store.get("school-state", { type: "json" }) || { students: [], scores: [], codes: [], published: [] };
  const student = (state.students || []).find(s => String(s.reg).toUpperCase() === String(reg).toUpperCase());
  if (!student) return response(404, { error: "Student registration number not found." });
  const entered = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const access = (state.codes || []).find(c => c.code === entered);
  if (!access) return response(401, { error: "Invalid access code. Please check the code and try again." });
  if (access.used) return response(401, { error: "This access code has already been used and cannot be used again." });
  // Unassigned codes can be used by any student; assigned codes only by that student.
  if (access.reg && access.reg !== student.reg) return response(401, { error: "This access code was issued to a different student." });
  const all = (state.scores || []).filter(s => s.reg === student.reg);
  const candidates = all.filter(s => (state.published || []).includes(`${s.reg}|${s.term}|${s.session || s.sess || ""}`));
  if (!candidates.length) return response(409, { error: "This result has not been published yet." });
  candidates.sort((a,b) => String(b.session).localeCompare(String(a.session)) || String(b.term).localeCompare(String(a.term)));
  const first = candidates[0];
  const chosen = candidates.filter(s => s.term === first.term && s.session === first.session);
  const total = chosen.reduce((sum,s) => sum + Number(s.total || 0), 0);
  const average = chosen.length ? Math.round(total / chosen.length) : 0;
  access.used = true; access.reg = student.reg; access.usedBy = student.reg; access.usedAt = new Date().toISOString();
  await store.setJSON("school-state", { ...state, codes: state.codes });
  return response(200, { student: { name: student.name, reg: student.reg, className: student.className }, term: first.term, session: first.session, scores: chosen, average, overallGrade: average>=80?"A":average>=70?"B":average>=60?"C":average>=50?"D":average>=40?"E":"F", principalRemark: average>=50?"Promoted / Satisfactory progress.":"Needs additional support and practice." });
};

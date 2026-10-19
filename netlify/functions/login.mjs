import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
function response(status, body) { return new Response(JSON.stringify(body), { status, headers }); }
function sign(value, secret) { return crypto.createHmac("sha256", secret).update(value).digest("hex"); }
export default async (req) => {
  if (req.method !== "POST") return response(405, { error: "Method not allowed." });
  const { username, password } = await req.json().catch(() => ({}));
  const expectedUser = "admin";
  const expectedPass = "Law123";
  const secret = "warieebi-portal-session-secret-change-this-9f4a7c2d8b1e6a5f";
  const supplied = Buffer.from(typeof password === "string" ? password : "");
  const expected = Buffer.from(expectedPass);
  const passwordMatches = supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  if (username !== expectedUser || !passwordMatches) {
    return response(401, { error: "Incorrect username or password." });
  }
  const payload = Buffer.from(JSON.stringify({ sub: expectedUser, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  return response(200, { token: payload + "." + sign(payload, secret) });
};

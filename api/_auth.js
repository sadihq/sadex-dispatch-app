// Shared auth helpers for SADEX Express Logistics API routes.
// Files starting with "_" inside /api are not exposed as endpoints on Vercel.
import crypto from "crypto";

const ROLE_RANK = { rider: 1, ceo: 2 };
const SESSION_HOURS = { rider: 14, ceo: 8 };
export const PIN_LENGTH = 6; // the keypad on both pages expects exactly 6 digits

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

function sign(data, secret) {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}

export function issueToken(role) {
  const secret = getSecret();
  if (!secret) throw new Error("SESSION_SECRET is not set (needs 32+ characters)");
  const payload = b64url(JSON.stringify({ role, exp: Date.now() + SESSION_HOURS[role] * 3600 * 1000 }));
  return { token: `${payload}.${sign(payload, secret)}`, expiresInHours: SESSION_HOURS[role] };
}

export function readToken(req) {
  const secret = getSecret();
  if (!secret) return null;
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (!ROLE_RANK[data.role] || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

// Returns the session, or sends 401/403 and returns null.
export function requireRole(req, res, minRole) {
  const session = readToken(req);
  if (!session) {
    res.status(401).json({ success: false, message: "Please log in again" });
    return null;
  }
  if (ROLE_RANK[session.role] < ROLE_RANK[minRole]) {
    res.status(403).json({ success: false, message: "Not allowed for this account" });
    return null;
  }
  return session;
}

export function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function clientIp(req) {
  const fwd = req.headers?.["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

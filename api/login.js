// PIN login for riders and the CEO console. Returns a signed session token.
import { issueToken, safeEqual, clientIp, parseBody, PIN_LENGTH } from "./_auth.js";

// Best-effort brute-force protection. Serverless instances do not share memory,
// so for stronger limits move this counter to a shared store (e.g. Upstash Redis).
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map(); // key -> { count, lockedUntil }

function isLocked(key) {
  const entry = failures.get(key);
  return entry && entry.lockedUntil > Date.now() ? entry : null;
}

function recordFailure(key) {
  const entry = failures.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILS) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.count = 0;
  }
  failures.set(key, entry);
}

export default async function loginHandler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Use POST" });
  }

  const { role, pin } = parseBody(req);
  if (role !== "rider" && role !== "ceo") {
    return res.status(400).json({ success: false, message: "Unknown account type" });
  }

  const expected = role === "ceo" ? process.env.CEO_PIN : process.env.RIDER_PIN;
  if (!expected || !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(String(expected).trim()) || !process.env.SESSION_SECRET) {
    return res.status(500).json({
      success: false,
      message: `Login is not set up. Add ${role === "ceo" ? "CEO_PIN" : "RIDER_PIN"} (exactly ${PIN_LENGTH} digits) and SESSION_SECRET in Vercel.`
    });
  }

  const key = `${role}:${clientIp(req)}`;
  const locked = isLocked(key);
  if (locked) {
    const minutes = Math.ceil((locked.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({ success: false, message: `Too many wrong tries. Try again in ${minutes} min.` });
  }

  if (!safeEqual(String(pin || "").trim(), String(expected).trim())) {
    recordFailure(key);
    await new Promise(r => setTimeout(r, 400));
    return res.status(401).json({ success: false, message: "Incorrect PIN" });
  }

  failures.delete(key);
  const { token, expiresInHours } = issueToken(role);
  return res.status(200).json({
    success: true,
    role,
    token,
    expiresInHours,
    riderPhone: (process.env.RIDER_PHONE || "").replace(/\D/g, "")
  });
}

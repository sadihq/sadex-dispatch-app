// SADEX Express Logistics: browser-side session handling.
// - Stores the signed session token from /api/login
// - Adds it to every /api/* request automatically
// - Shows the rider PIN screen when there is no session (or it expired)
(function () {
  const KEYS = { rider: "sadex_session_rider", ceo: "sadex_session_ceo" };
  const PIN_LENGTH = 6;
  const CACHE_KEYS = ["sadex_cached_manifest", "sadex_rider_manifest_cache"];
  const nativeFetch = window.fetch.bind(window);

  try { localStorage.removeItem("sadex_ceo_auth"); } catch (e) { /* old insecure flag */ }

  function loadRole(role) {
    try {
      const s = JSON.parse(localStorage.getItem(KEYS[role]) || "null");
      if (s && s.token && s.expiresAt > Date.now()) return s;
    } catch (e) { /* storage blocked */ }
    return null;
  }
  // The strongest valid session on this device: CEO first, then rider.
  function load() { return loadRole("ceo") || loadRole("rider"); }
  function save(s) { try { localStorage.setItem(KEYS[s.role], JSON.stringify(s)); } catch (e) { /* ignore */ } }
  function clear() {
    try {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      CACHE_KEYS.forEach(k => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  }

  async function login(role, pin) {
    try {
      const res = await nativeFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pin })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) return { ok: false, message: data.message || "Login failed" };
      const session = {
        role: data.role,
        token: data.token,
        riderPhone: data.riderPhone || "",
        expiresAt: Date.now() + (data.expiresInHours || 8) * 3600 * 1000
      };
      save(session);
      return { ok: true, session };
    } catch (e) {
      return { ok: false, message: "No connection. Check your data and try again." };
    }
  }

  // End the CEO session but keep the rider session on this device.
  function dropToRider() {
    try { localStorage.removeItem(KEYS.ceo); } catch (e) { /* ignore */ }
  }

  let handling401 = false;
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    const path = url.startsWith(location.origin) ? url.slice(location.origin.length) : url;
    if (!path.startsWith("/api/") || path.startsWith("/api/login")) return nativeFetch(input, init);

    const headers = new Headers((init && init.headers) || {});
    const s = load();
    if (s) headers.set("Authorization", "Bearer " + s.token);
    const res = await nativeFetch(input, Object.assign({}, init || {}, { headers }));
    // Only reset when a session we sent was refused (expired or PIN changed); avoids reload loops.
    if (res.status === 401 && s && !handling401) {
      handling401 = true;
      clear();
      setTimeout(() => location.reload(), 900);
    }
    return res;
  };

  // ---------- Rider PIN gate ----------
  function buildGate(onSuccess) {
    const wrap = document.createElement("div");
    wrap.id = "sadexLoginGate";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "SADEX rider login");
    wrap.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:#F4F7F5;font-family:inherit;";
    wrap.innerHTML = `
      <div style="width:100%;max-width:320px;background:#FFFFFF;border:1px solid #E2E9E5;border-radius:24px;padding:24px;text-align:center;color:#14201A;box-shadow:0 8px 30px rgba(20,32,26,.08)">
        <img src="/IMG_7852.jpeg" alt="SADEX" style="width:64px;height:64px;border-radius:20px;object-fit:cover;margin:0 auto 12px;border:1px solid #E2E9E5">
        <h2 style="font-size:19px;font-weight:700;margin:0">SADEX Express</h2>
        <p style="font-size:14px;color:#526158;margin:4px 0 18px">Enter your 6-digit rider PIN</p>
        <div id="sadexGateDots" style="display:flex;gap:12px;justify-content:center;margin-bottom:8px"></div>
        <div id="sadexGateError" style="min-height:18px;font-size:12px;font-weight:700;color:#9B2C2C;margin-bottom:8px"></div>
        <div id="sadexGatePad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"></div>
      </div>`;
    document.body.appendChild(wrap);

    let pin = "";
    let busy = false;
    const dots = wrap.querySelector("#sadexGateDots");
    const err = wrap.querySelector("#sadexGateError");
    const pad = wrap.querySelector("#sadexGatePad");

    function drawDots() {
      dots.innerHTML = "";
      for (let i = 0; i < PIN_LENGTH; i++) {
        const d = document.createElement("span");
        const on = i < pin.length;
        d.style.cssText = `width:13px;height:13px;border-radius:50%;border:2px solid ${on ? "#1E5631" : "#C7D1CB"};background:${on ? "#1E5631" : "transparent"}`;
        dots.appendChild(d);
      }
    }

    async function submit() {
      busy = true;
      err.style.color = "#526158";
      err.textContent = "Checking…";
      const result = await login("rider", pin);
      busy = false;
      if (result.ok) {
        wrap.remove();
        document.removeEventListener("keydown", onKey);
        onSuccess(result.session);
      } else {
        err.style.color = "#9B2C2C";
        err.textContent = result.message;
        pin = "";
        drawDots();
      }
    }

    function press(k) {
      if (busy) return;
      if (k === "del") pin = pin.slice(0, -1);
      else if (k === "clr") pin = "";
      else if (pin.length < PIN_LENGTH) pin += k;
      if (k !== "del" && k !== "clr") err.textContent = "";
      drawDots();
      if (pin.length === PIN_LENGTH) submit();
    }

    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clr", "0", "del"].forEach(k => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = k === "del" ? "⌫" : k === "clr" ? "CLEAR" : k;
      b.setAttribute("aria-label", k === "del" ? "Delete" : k === "clr" ? "Clear" : k);
      const isKey = k !== "del" && k !== "clr";
      b.style.cssText = `height:54px;border-radius:14px;font-size:${isKey ? "20px" : "13px"};font-weight:600;color:${isKey ? "#14201A" : "#526158"};background:${isKey ? "#F1F5F2" : "transparent"};border:none;cursor:pointer;font-family:inherit`;
      b.addEventListener("click", () => press(k));
      pad.appendChild(b);
    });

    function onKey(e) {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    }
    document.addEventListener("keydown", onKey);
    drawDots();
  }

  // Run onReady once the device has a rider or CEO session.
  function requireRider(onReady) {
    const start = () => (load() ? onReady(load()) : buildGate(onReady));
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  }

  window.SadexAuth = { load, loadRole, clear, login, dropToRider, requireRider, PIN_LENGTH };
})();

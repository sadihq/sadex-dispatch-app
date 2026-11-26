// SADEX Express Logistics: shared rider UI pieces (run summary + stop cards).
// Used by index.html (rider view) and rider.html so both look identical.
// All order text is escaped before it goes into the page.
(function () {
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  // For values placed inside a single-quoted JS string in an onclick attribute.
  function jsArg(value) {
    return esc(String(value == null ? "" : value).replace(/\\/g, "\\\\").replace(/'/g, "\\'"));
  }
  const naira = n => "₦" + Math.round(Number(n) || 0).toLocaleString("en-NG");
  function prettyPhone(digits) {
    const d = String(digits || "").replace(/\D/g, "");
    if (d.length === 13 && d.startsWith("234")) return `+234 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
    return d ? "+" + d : "";
  }
  function safeUrl(url) {
    return /^https:\/\//i.test(url || "") ? esc(url) : "#";
  }

  function runSummary({ delivered = 0, total = 0, cashToCollect = 0, stops = 0, routeAction = "launchMasterRoute()", routeBtnId = "masterRouteBtn" }) {
    const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;
    return `
      <div class="sx-summary">
        <div class="sx-summary-row">
          <div class="sx-stat">
            <div class="sx-stat-label">Delivered today</div>
            <div class="sx-stat-value">${delivered} of ${total}</div>
          </div>
          <div class="sx-stat">
            <div class="sx-stat-label">Cash to collect</div>
            <div class="sx-stat-value is-cash">${naira(cashToCollect)}</div>
          </div>
        </div>
        <div class="sx-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Deliveries completed"><span style="width:${pct}%"></span></div>
        ${stops > 0 ? `
          <button type="button" id="${routeBtnId}" class="sx-route-btn" onclick="${routeAction}">
            <i class="fa-solid fa-route" aria-hidden="true"></i> Start route · ${stops} stop${stops === 1 ? "" : "s"}
          </button>` : ""}
      </div>`;
  }

  function emptyState() {
    return `
      <div class="sx-list sx-empty">
        <div class="sx-empty-icon"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></div>
        <h3>All deliveries done</h3>
        <p>New orders show up here automatically. Tap Sync to check now.</p>
      </div>`;
  }

  // opts: { idx, expanded, updating, etaText, area, mapsLink, chatLink, onToggle, onDeliver, onCopyPhone, onCopyAddress }
  function stopCard(order, opts) {
    const isNext = opts.idx === 0;
    const isFragile = (order.category || "").toLowerCase().includes("fragile");
    const hasCash = Number(order.codAmount) > 0;
    const inTransit = order.status === "In-Transit";
    const name = order.merchant || "Delivery";
    const phone = prettyPhone(order.phone);

    const tags = [
      hasCash ? `<span class="sx-tag cash">${naira(order.codAmount)} cash</span>` : `<span class="sx-tag paid">Prepaid</span>`,
      isFragile ? `<span class="sx-tag fragile">Fragile</span>` : "",
      inTransit ? `<span class="sx-tag transit">In transit</span>` : ""
    ].join("");

    const detail = !opts.expanded ? "" : `
      <div class="sx-detail">
        <div class="sx-box">
          <div class="sx-box-label">Deliver to</div>
          <div class="sx-box-value">${esc(order.address)}</div>
          ${order.landmark ? `<div class="sx-box-sub"><i class="fa-solid fa-signs-post" aria-hidden="true"></i> Landmark: ${esc(order.landmark)}</div>` : ""}
          <div class="sx-box-row">
            ${phone ? `<span class="sx-phone">${esc(phone)}</span>` : `<span class="sx-box-label">No phone number</span>`}
            <span style="display:flex;gap:6px">
              ${phone ? `<button type="button" class="sx-mini" onclick="event.stopPropagation(); ${opts.onCopyPhone}">Copy number</button>` : ""}
              <button type="button" class="sx-mini" onclick="event.stopPropagation(); ${opts.onCopyAddress}">Copy address</button>
            </span>
          </div>
        </div>
        ${hasCash ? `
          <div class="sx-cash">
            <div><div class="sx-cash-label">Collect cash</div><div class="sx-cash-value">${naira(order.codAmount)}</div></div>
            <i class="fa-solid fa-money-bill-wave" style="font-size:22px;color:#7A5A0E" aria-hidden="true"></i>
          </div>` : ""}
        ${isFragile ? `<div class="sx-fragile-note"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Fragile: keep upright, don't stack</div>` : ""}
        <div class="sx-actions">
          <a class="sx-btn" href="${safeUrl(opts.mapsLink)}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> Navigate</a>
          ${phone ? `<a class="sx-btn" href="tel:+${esc(order.phone)}" onclick="event.stopPropagation()"><i class="fa-solid fa-phone" aria-hidden="true"></i> Call</a>` : `<span class="sx-btn" style="opacity:.5"><i class="fa-solid fa-phone" aria-hidden="true"></i> Call</span>`}
          <a class="sx-btn" href="${safeUrl(opts.chatLink)}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Chat</a>
        </div>
        <button type="button" class="sx-deliver" onclick="event.stopPropagation(); ${opts.onDeliver}" ${opts.updating ? "disabled" : ""}>
          ${opts.updating ? '<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Saving…' : `<i class="fa-solid fa-check" aria-hidden="true"></i> Mark delivered${hasCash ? " · cash collected" : ""}`}
        </button>
      </div>`;

    return `
      <div class="sx-stop ${isNext ? "is-next" : ""} ${opts.expanded ? "is-open" : ""}">
        <button type="button" class="sx-stop-head" onclick="${opts.onToggle}" aria-expanded="${opts.expanded ? "true" : "false"}">
          <span class="sx-num" aria-label="Stop ${opts.idx + 1}">${opts.idx + 1}</span>
          <span class="sx-body">
            <span class="sx-top"><span class="sx-name">${esc(name)}</span><span class="sx-eta">${esc(opts.etaText || "")}</span></span>
            <span class="sx-area" style="display:block">${esc(opts.area || order.address)}</span>
            <span class="sx-tags">${tags}</span>
          </span>
          <i class="fa-solid fa-chevron-down sx-chev" aria-hidden="true"></i>
        </button>
        ${detail}
      </div>`;
  }

  function stopList(cardsHtml) {
    return `<div class="sx-list">${cardsHtml}</div>`;
  }

  // Deliveries marked on this phone today (for the progress bar).
  const dayKey = () => "sadex_delivered_" + new Date().toISOString().slice(0, 10);
  function deliveredToday() {
    try { return Number(localStorage.getItem(dayKey())) || 0; } catch (e) { return 0; }
  }
  function countDelivered(n = 1) {
    try { localStorage.setItem(dayKey(), String(deliveredToday() + n)); } catch (e) { /* ignore */ }
  }

  window.SadexUI = { esc, jsArg, naira, runSummary, emptyState, stopCard, stopList, deliveredToday, countDelivered };
})();

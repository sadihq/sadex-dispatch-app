// Locked-down Notion gateway for SADEX Express Logistics.
// Only three operations are allowed, all on the orders database:
//   POST  ?path=v1/databases/<DB>/query  -> list orders (rider: active only)
//   PATCH ?path=v1/pages/<pageId>        -> change Status (rider) / Status + POD photo (CEO)
//   POST  ?path=v1/pages                 -> create an order (CEO only)
// Everything else is refused. The Notion key never leaves the server.
import { requireRole, parseBody } from "./_auth.js";
import { normalizeNigerianPhone, isAbujaAddress } from "./_validate.js";

const NOTION_VERSION = "2022-06-28";
const DEFAULT_DATABASE_ID = "3c1c21a6f4768049a840d9ed8972b630";
const MAX_PAGES = 10; // 10 x 100 = up to 1,000 orders per sync

export const ALLOWED_STATUSES = ["Pending", "In-Transit", "Delivered"];
const ORDER_PROPERTIES = [
  "Merchant Name", "Delivery Address", "Customer Phone", "Item Category",
  "COD Amount", "Delivery Fee", "Status", "Photo Proof of Delivery URL", "Condition at Pickup"
];
const ITEM_CATEGORIES = ["Standard", "Fragile"];

const normId = id => String(id || "").replace(/-/g, "").toLowerCase();
const databaseId = () => normId(process.env.NOTION_DATABASE_ID || DEFAULT_DATABASE_ID);

async function notion(path, method, body) {
  const key = process.env.NOTION_API_KEY;
  if (!key) throw Object.assign(new Error("NOTION_API_KEY is not set in Vercel"), { status: 500 });
  const res = await fetch(`https://api.notion.com/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || `Notion error ${res.status}`), { status: res.status });
  return data;
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

async function listOrders(session) {
  const results = [];
  let cursor;
  for (let i = 0; i < MAX_PAGES; i++) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    if (session.role === "rider") {
      body.filter = { property: "Status", status: { does_not_equal: "Delivered" } };
    }
    const data = await notion(`v1/databases/${databaseId()}/query`, "POST", body);
    results.push(...(data.results || []));
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return { object: "list", results, has_more: false };
}

async function updateOrder(session, pageId, payload) {
  const props = payload?.properties;
  if (!props || typeof props !== "object") throw Object.assign(new Error("No changes sent"), { status: 400 });

  const allowed = session.role === "ceo" ? ["Status", "Photo Proof of Delivery URL"] : ["Status"];
  for (const name of Object.keys(props)) {
    if (!allowed.includes(name)) throw Object.assign(new Error(`You can't change "${name}"`), { status: 403 });
  }
  if (props.Status) {
    const status = props.Status?.status?.name;
    if (!ALLOWED_STATUSES.includes(status)) throw Object.assign(new Error(`Unknown status "${status}"`), { status: 400 });
  }
  const pod = props["Photo Proof of Delivery URL"];
  if (pod && pod.url !== null && !/^https:\/\//i.test(pod.url || "")) {
    throw Object.assign(new Error("Proof of delivery must be an https link"), { status: 400 });
  }

  // Make sure the page really is an order in our database before touching it.
  const page = await notion(`v1/pages/${pageId}`, "GET");
  if (normId(page.parent?.database_id) !== databaseId()) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }

  const clean = {};
  for (const name of Object.keys(props)) clean[name] = props[name];
  return notion(`v1/pages/${pageId}`, "PATCH", { properties: clean });
}

async function createOrder(payload) {
  if (normId(payload?.parent?.database_id) !== databaseId()) {
    throw Object.assign(new Error("Orders can only be added to the SADEX orders database"), { status: 400 });
  }
  const props = payload.properties || {};
  for (const name of Object.keys(props)) {
    if (!ORDER_PROPERTIES.includes(name)) throw Object.assign(new Error(`Unknown field "${name}"`), { status: 400 });
  }

  const address = props["Delivery Address"]?.rich_text?.[0]?.text?.content || "";
  if (!isAbujaAddress(address)) {
    throw Object.assign(new Error("Delivery address must be in Abuja (FCT). Add the district, e.g. 'Wuse 2, Abuja'."), { status: 400 });
  }

  const rawPhone = props["Customer Phone"]?.phone_number || "";
  const phone = normalizeNigerianPhone(rawPhone);
  if (!phone) throw Object.assign(new Error("Enter a valid Nigerian phone number, e.g. 0803 123 4567"), { status: 400 });
  props["Customer Phone"] = { phone_number: phone };

  const category = props["Item Category"]?.select?.name;
  if (category && !ITEM_CATEGORIES.includes(category)) {
    throw Object.assign(new Error(`Unknown item category "${category}"`), { status: 400 });
  }
  for (const n of ["COD Amount", "Delivery Fee"]) {
    const v = props[n]?.number;
    if (v !== undefined && (typeof v !== "number" || v < 0 || v > 5000000)) {
      throw Object.assign(new Error(`${n} must be between ₦0 and ₦5,000,000`), { status: 400 });
    }
  }
  props.Status = { status: { name: "Pending" } };

  return notion("v1/pages", "POST", { parent: { database_id: databaseId() }, properties: props });
}

export default async function handler(req, res) {
  const path = String(req.query?.path || "").replace(/^\/+/, "");
  const method = req.method;

  try {
    const queryMatch = path.match(/^v1\/databases\/([0-9a-f-]{32,36})\/query$/i);
    const pageMatch = path.match(/^v1\/pages\/([0-9a-f-]{32,36})$/i);

    if (method === "POST" && queryMatch) {
      const session = requireRole(req, res, "rider");
      if (!session) return;
      if (normId(queryMatch[1]) !== databaseId()) return badRequest(res, "Unknown database");
      return res.status(200).json(await listOrders(session));
    }

    if (method === "PATCH" && pageMatch) {
      const session = requireRole(req, res, "rider");
      if (!session) return;
      return res.status(200).json(await updateOrder(session, pageMatch[1], parseBody(req)));
    }

    if (method === "POST" && path === "v1/pages") {
      const session = requireRole(req, res, "ceo");
      if (!session) return;
      return res.status(200).json(await createOrder(parseBody(req)));
    }

    return res.status(404).json({ success: false, message: "Not found" });
  } catch (error) {
    const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    return res.status(status).json({ success: false, message: error.message });
  }
}

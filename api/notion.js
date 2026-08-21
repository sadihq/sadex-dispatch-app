export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Notion-Version");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path } = req.query;
  const targetUrl = `https://api.notion.com/${path || ""}`;

  let requestBody = undefined;
  if (req.method !== "GET" && req.body) {
    requestBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  }

  try {
    const notionKey = process.env.NOTION_API_KEY || "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";
    const notionRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${notionKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: requestBody
    });

    const data = await notionRes.json();
    return res.status(notionRes.status).json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

import { task } from "@trigger.dev/sdk";

interface LeadPayload {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string | null;
  city: string;
}

export const processLead = task({
  id: "process-dental-lead",
  retry: { maxAttempts: 3 },
  run: async (payload: LeadPayload) => {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const clickupKey = process.env.CLICKUP_API_KEY;
    const hotListId = process.env.CLICKUP_HOT_LIST_ID;
    const leadsListId = process.env.CLICKUP_LEADS_LIST_ID;

    if (!redisUrl) throw new Error("UPSTASH_REDIS_REST_URL is not set");
    if (!redisToken) throw new Error("UPSTASH_REDIS_REST_TOKEN is not set");
    if (!clickupKey) throw new Error("CLICKUP_API_KEY is not set");
    if (!hotListId) throw new Error("CLICKUP_HOT_LIST_ID is not set");
    if (!leadsListId) throw new Error("CLICKUP_LEADS_LIST_ID is not set");

    // Cross-week dedup check
    const getRes = await fetch(`${redisUrl}/get/${payload.placeId}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    const getJson = await getRes.json();
    if (getJson.result !== null) return; // Already processed

    // Determine lead type
    const isHot = !payload.website;
    const listId = isHot ? hotListId : leadsListId;
    const today = new Date().toLocaleDateString("cs-CZ"); // DD.MM.YYYY

    const description = [
      `Address: ${payload.address}`,
      `Phone: ${payload.phone}`,
      `Website: ${payload.website ?? "NONE — no website found"}`,
      `Source: Google Maps via SerpAPI`,
      `Found: ${today}`,
      `Place ID: ${payload.placeId}`,
    ].join("\n");

    // Create ClickUp task
    await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: "POST",
      headers: {
        Authorization: clickupKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${payload.name} — ${payload.city}`,
        description,
      }),
    });

    // Mark as seen in Redis (180-day TTL)
    await fetch(`${redisUrl}/set/${payload.placeId}/seen/ex/15552000`, {
      method: "GET",
      headers: { Authorization: `Bearer ${redisToken}` },
    });
  },
});

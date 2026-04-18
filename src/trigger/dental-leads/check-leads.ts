import { schedules } from "@trigger.dev/sdk";
import { processLead } from "./process-lead.js";

const CITIES = [
  "Prague", "Brno", "Ostrava", "Plzeň", "Liberec",
  "Olomouc", "Hradec Králové", "Pardubice", "Zlín", "České Budějovice"
];

export const checkLeads = schedules.task({
  id: "check-dental-leads",
  cron: "0 8 * * 1", // Every Monday 8am UTC
  run: async () => {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) throw new Error("SERPAPI_KEY is not set");

    for (const city of CITIES) {
      const url = `https://serpapi.com/search.json?engine=google_maps&q=dentist+${encodeURIComponent(city)}+Czech+Republic&api_key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      const places = data.local_results ?? [];
      for (const place of places) {
        await processLead.trigger(
          {
            placeId: place.place_id,
            name: place.title,
            address: place.address ?? "not listed",
            phone: place.phone ?? "not listed",
            website: place.website ?? null,
            city,
          },
          { idempotencyKey: place.place_id }
        );
      }
    }
  },
});

import { task } from "@trigger.dev/sdk/v3";

interface Team {
  id: string;
  name: string;
}

interface Space {
  id: string;
  name: string;
}

export const setupClickupLists = task({
  id: "setup-clickup-lists",
  run: async () => {
    const apiKey = process.env.CLICKUP_API_KEY;
    if (!apiKey) throw new Error("CLICKUP_API_KEY is not set");

    const spaceId = process.env.CLICKUP_SPACE_ID;

    if (!spaceId) {
      console.log("=== DISCOVERY MODE ===");
      console.log(
        "CLICKUP_SPACE_ID not set. Fetching your ClickUp workspace structure...\n"
      );

      // Fetch all teams (workspaces)
      const teamsRes = await fetch("https://api.clickup.com/api/v2/team", {
        headers: { Authorization: apiKey },
      });
      if (!teamsRes.ok)
        throw new Error(`Failed to fetch teams: ${teamsRes.statusText}`);

      const teamsData = (await teamsRes.json()) as { teams: Team[] };
      const teams = teamsData.teams;

      console.log(`Found ${teams.length} workspace(s):\n`);

      for (const team of teams) {
        console.log(`📦 Workspace: ${team.name} (ID: ${team.id})`);

        // Fetch spaces in this team
        const spacesRes = await fetch(
          `https://api.clickup.com/api/v2/team/${team.id}/space`,
          { headers: { Authorization: apiKey } }
        );
        if (!spacesRes.ok)
          throw new Error(`Failed to fetch spaces: ${spacesRes.statusText}`);

        const spacesData = (await spacesRes.json()) as { spaces: Space[] };
        const spaces = spacesData.spaces;

        if (spaces.length === 0) {
          console.log("   (no spaces)\n");
        } else {
          for (const space of spaces) {
            console.log(`   📁 ${space.name} (ID: ${space.id})`);
          }
          console.log();
        }
      }

      throw new Error(
        "Pick a space ID from above, add CLICKUP_SPACE_ID=<id> to .env, then re-run this task."
      );
    }

    // Create mode: lists will be created in the specified space
    console.log("=== CREATE MODE ===");
    console.log(`Creating lists in space ${spaceId}...\n`);

    // Create HOT Leads list
    const hotRes = await fetch(
      `https://api.clickup.com/api/v2/space/${spaceId}/list`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "HOT Leads",
          content: "Dentists with no website (higher priority)",
        }),
      }
    );
    if (!hotRes.ok)
      throw new Error(`Failed to create HOT Leads list: ${hotRes.statusText}`);

    const hotData = (await hotRes.json()) as { id: string; name: string };
    console.log(`✅ Created: "${hotData.name}" (ID: ${hotData.id})`);

    // Create Leads list
    const leadsRes = await fetch(
      `https://api.clickup.com/api/v2/space/${spaceId}/list`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Leads",
          content: "Dentists with a website",
        }),
      }
    );
    if (!leadsRes.ok)
      throw new Error(`Failed to create Leads list: ${leadsRes.statusText}`);

    const leadsData = (await leadsRes.json()) as { id: string; name: string };
    console.log(`✅ Created: "${leadsData.name}" (ID: ${leadsData.id})\n`);

    console.log("=== NEXT STEPS ===");
    console.log("Add these to your .env file:\n");
    console.log(`CLICKUP_HOT_LIST_ID=${hotData.id}`);
    console.log(`CLICKUP_LEADS_LIST_ID=${leadsData.id}\n`);
    console.log(
      "Then commit & deploy. The dental leads automation is now ready to use."
    );

    return {
      hotListId: hotData.id,
      leadsListId: leadsData.id,
    };
  },
});

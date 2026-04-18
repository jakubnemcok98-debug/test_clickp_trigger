import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "dental-leads",
  logLevel: "log",
  dirs: ["./src/trigger"],
  maxDuration: 3600,
});

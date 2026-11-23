// Local acceptance timings only; does not benchmark production scale or external networks.
import { readFileSync, writeFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync("../backend-api/.runtime/service-browser-session.json", "utf8"),
);
const result = [];
const now = new Date(),
  to = now.toISOString().slice(0, 10),
  from = new Date(now.getTime() - 89 * 86400000).toISOString().slice(0, 10);
for (const path of [
  `/insights?from=${from}&to=${to}`,
  "/audit",
  "/conversations",
]) {
  const durations = [];
  let errors = 0,
    index = 0;
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (index++ < 100) {
        const start = performance.now();
        const response = await fetch(
          "http://localhost:3017/api/v1/service" + path,
          { headers: { Cookie: "dev_ceda_session=" + fixture.agent.raw } },
        );
        await response.arrayBuffer();
        durations.push(performance.now() - start);
        if (response.status !== 200) errors++;
      }
    }),
  );
  durations.sort((a, b) => a - b);
  result.push({
    endpoint: path.split("?")[0],
    requests: durations.length,
    concurrency: 5,
    medianMs: +durations[49].toFixed(1),
    p95Ms: +durations[94].toFixed(1),
    unexpectedErrors: errors,
  });
}
writeFileSync(
  ".qa/service/performance.json",
  JSON.stringify(
    {
      scope:
        "Local machine; synthetic account and small real PostgreSQL dataset; no production latency or load claim",
      results: result,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(result, null, 2));
if (result.some((r) => r.unexpectedErrors)) process.exitCode = 1;

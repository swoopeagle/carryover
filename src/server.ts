// Serves the one page and the report behind it. Localhost only; nothing leaves the machine.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Store } from "./store.ts";
import { buildReport } from "./report.ts";

const { values } = parseArgs({ options: { db: { type: "string" }, port: { type: "string" } } });
const store = new Store(values.db ?? "data/carryover.db");
const port = Number(values.port ?? 4747);
const page = new URL("../web/index.html", import.meta.url);

createServer((req, res) => {
  if (req.url === "/api/report") {
    // Re-read the page template too, so edits show without a restart.
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(buildReport(store)));
    return;
  }
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(page));
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(port, "127.0.0.1", () => console.log(`[carryover] http://127.0.0.1:${port}  (db: ${values.db ?? "data/carryover.db"})`));

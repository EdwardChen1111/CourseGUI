/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "../out");
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const relative = decodeURIComponent(url.pathname).replace(/^\/CourseGUI(?=\/|$)/, "");
    const file = path.resolve(root, "." + (relative === "/" || relative === "" ? "/index.html" : relative));
    if (!file.startsWith(root + path.sep)) throw new Error("Invalid path");
    const contents = await fs.readFile(file);
    response.setHeader("Content-Type", file.endsWith(".json") ? "application/json" : file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".png") ? "image/png" : file.endsWith(".ico") ? "image/x-icon" : "text/html");
    response.end(contents);
  } catch { response.writeHead(404).end(); }
}).listen(4173, "127.0.0.1", () => console.log("Preview ready on http://127.0.0.1:4173/CourseGUI/"));

// Phone access on the home network. `sf dev` only fully works when the browser
// talks to it as 127.0.0.1, so this forwards LAN requests (and websockets) to
// the dev server with Host and Origin rewritten. See DEV.md.
// It also signs every request in with the dev server's private key, so the
// phone needs no one-time link. Anyone on the home network or Tailscale can
// open it while it runs.
//   FORK_DEV_KEY=<key from the private URL> node tools/lan-proxy.mjs [listenPort=4193] [targetPort=4192]
// tools/phone.sh starts the dev server and this proxy together.
import http from "node:http";
import net from "node:net";

const LISTEN = Number(process.argv[2] || 4193);
const TARGET = Number(process.argv[3] || 4192);
const target = `127.0.0.1:${TARGET}`;
const KEY = process.env.FORK_DEV_KEY || "";
const rewrite = (h) => {
  const out = { ...h, host: target };
  if (KEY) {
    const others = (out.cookie || "").split(";").map((c) => c.trim()).filter((c) => c && !c.startsWith("spacefast_zero_dev_"));
    out.cookie = [...others, `spacefast_zero_dev_${TARGET}=${KEY}`].join("; ");
  }
  if (out.origin) out.origin = `http://${target}`;
  if (out.referer) out.referer = out.referer.replace(/^https?:\/\/[^/]+/, `http://${target}`);
  return out;
};

const server = http.createServer((req, res) => {
  const up = http.request({ host: "127.0.0.1", port: TARGET, method: req.method, path: req.url, headers: rewrite(req.headers) }, (r) => {
    // The runtime config names ws://127.0.0.1:<port> as the realtime URL, which a
    // phone can't reach: point it back at whatever host the phone used.
    if (!/json/.test(r.headers["content-type"] || "")) {
      res.writeHead(r.statusCode, r.headers);
      return r.pipe(res);
    }
    const chunks = [];
    r.on("data", (c) => chunks.push(c));
    r.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8").replaceAll(target, req.headers.host);
      const headers = { ...r.headers };
      delete headers["content-length"];
      delete headers["transfer-encoding"];
      res.writeHead(r.statusCode, headers);
      res.end(body);
    });
  });
  up.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
});

server.on("upgrade", (req, socket, head) => {
  const up = net.connect(TARGET, "127.0.0.1", () => {
    const h = rewrite(req.headers);
    up.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries(h).map(([k, v]) => `${k}: ${v}`).join("\r\n") + "\r\n\r\n");
    if (head?.length) up.write(head);
    up.pipe(socket); socket.pipe(up);
  });
  up.on("error", () => socket.destroy());
  socket.on("error", () => up.destroy());
});

server.listen(LISTEN, "0.0.0.0", () => console.log(`LAN proxy: http://<this-mac>.local:${LISTEN} -> http://${target}`));

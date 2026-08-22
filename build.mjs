// esbuild 빌드 스크립트. `node build.mjs` → dist/, `node build.mjs --serve` → 개발 서버.
import esbuild from "esbuild";
import fs from "node:fs";
import crypto from "node:crypto";

const serve = process.argv.includes("--serve");

fs.mkdirSync("dist", { recursive: true });
fs.cpSync("public", "dist", { recursive: true });
fs.copyFileSync("src/styles.css", "dist/styles.css");

const options = {
  entryPoints: ["src/index.jsx"],
  bundle: true,
  outfile: "dist/app.js",
  format: "iife",
  jsx: "automatic",
  minify: !serve,
  sourcemap: serve,
  define: { "process.env.NODE_ENV": serve ? '"development"' : '"production"' },
  logLevel: "info",
};

// 개발 모드에서는 캐시하는 service worker가 방금 고친 코드를 가려버린다.
// 그래서 스스로 등록을 해제하고 남은 캐시까지 지우는 SW를 내보낸다
// (앞서 설치돼 있던 배포판 SW도 개발 중에는 이 파일로 교체되며 정리된다).
const DEV_SW = `// 개발용 — 캐시하지 않고 스스로 등록을 해제한다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    self.registration
      .unregister()
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);
`;

function writeServiceWorker() {
  if (serve) {
    fs.writeFileSync("dist/sw.js", DEV_SW);
    return;
  }
  // 캐시 이름에 앱 해시를 넣어 배포마다 캐시가 갱신되게 한다
  const hash = crypto
    .createHash("md5")
    .update(fs.readFileSync("dist/app.js"))
    .update(fs.readFileSync("dist/styles.css"))
    .digest("hex")
    .slice(0, 10);
  const sw = fs.readFileSync("src/sw.js", "utf8").replaceAll("__VERSION__", hash);
  if (sw.includes("__VERSION__")) throw new Error("sw.js 캐시 버전 치환 실패");
  fs.writeFileSync("dist/sw.js", sw);
}

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  writeServiceWorker();
  // esbuild 0.24의 serve()는 { host, port }를 준다. 0.0.0.0은 브라우저 주소로 못 쓰므로 바꿔 준다.
  const { host, port } = await ctx.serve({ servedir: "dist", port: 8000 });
  const shown = !host || host === "0.0.0.0" || host === "::" ? "localhost" : host;
  console.log(`개발 서버: http://${shown}:${port}`);
} else {
  await esbuild.build(options);
  writeServiceWorker();
  console.log("빌드 완료 → dist/");
}

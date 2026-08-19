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

function writeServiceWorker() {
  // 캐시 이름에 앱 해시를 넣어 배포마다 캐시가 갱신되게 한다
  const hash = crypto
    .createHash("md5")
    .update(fs.readFileSync("dist/app.js"))
    .update(fs.readFileSync("dist/styles.css"))
    .digest("hex")
    .slice(0, 10);
  const sw = fs.readFileSync("src/sw.js", "utf8").replace("__VERSION__", hash);
  fs.writeFileSync("dist/sw.js", sw);
}

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  writeServiceWorker();
  const { hosts, port } = await ctx.serve({ servedir: "dist", port: 8000 });
  console.log(`개발 서버: http://${hosts[0] ?? "localhost"}:${port}`);
} else {
  await esbuild.build(options);
  writeServiceWorker();
  console.log("빌드 완료 → dist/");
}

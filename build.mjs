// esbuild 빌드 스크립트. `node build.mjs` → dist/, `node build.mjs --serve` → 개발 서버.
import esbuild from "esbuild";
import fs from "node:fs";

const serve = process.argv.includes("--serve");

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("public/index.html", "dist/index.html");
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

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { hosts, port } = await ctx.serve({ servedir: "dist", port: 8000 });
  console.log(`개발 서버: http://${hosts[0] ?? "localhost"}:${port}`);
} else {
  await esbuild.build(options);
  console.log("빌드 완료 → dist/");
}

/**
 * Static build for one environment: `node scripts/build.ts <test|prod>`
 * (`vp run build:test` / `vp run build:prod`). Output: dist/, ready to upload
 * as-is to the S3 bucket behind Netflix's CloudFront.
 *
 *   1. type-check (vue-tsc)
 *   2. client bundle      → dist/
 *   3. server renderer    → dist-ssr/ (build-time only, deleted at the end)
 *   4. prerender (scripts/prerender.ts): index.html + error.html with the real
 *      markup and <head>, robots.txt, sitemap.xml
 */
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { prerender } from "./prerender.ts";

const env = process.argv[2];
if (env !== "test" && env !== "prod") {
  console.error("Usage: node scripts/build.ts <test|prod>");
  process.exit(1);
}

function run(command: string, args: string[]): void {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

rmSync("dist", { recursive: true, force: true });
rmSync("dist-ssr", { recursive: true, force: true });

run("vue-tsc", ["--noEmit"]);
run("vp", ["build", "--mode", env]);
run("vp", ["build", "--mode", env, "--ssr", "src/entry-server.ts", "--outDir", "dist-ssr"]);

try {
  await prerender({ env, outDir: "dist", ssrEntry: "dist-ssr/entry-server.js" });
} catch (error) {
  console.error(`\nPrerender failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
} finally {
  rmSync("dist-ssr", { recursive: true, force: true });
}

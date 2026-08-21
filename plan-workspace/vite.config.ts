import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "child_process";

function buildStampISO(): string {
  // Priority: env override → latest git commit ISO → now.
  const envStamp =
    process.env.VITE_BUILD_TIME_ISO ??
    process.env.VERCEL_GIT_COMMIT_DATE ??
    "";
  if (envStamp) return envStamp;
  try {
    const iso = execSync("git log -1 --format=%cI", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (iso) return iso;
  } catch {
    /* git unavailable — fall through */
  }
  return new Date().toISOString();
}

function buildCommit(): string {
  const envSha =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "";
  if (envSha) return envSha.slice(0, 7);
  try {
    const sha = execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (sha) return sha;
  } catch {
    /* git unavailable */
  }
  return "";
}

const BUILD_TIME_ISO = buildStampISO();
const BUILD_COMMIT = buildCommit();

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  define: {
    __BUILD_TIME_ISO__: JSON.stringify(BUILD_TIME_ISO),
    __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
  },
});

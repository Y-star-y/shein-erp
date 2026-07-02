const { execSync } = require("node:child_process");
const path = require("node:path");

const webRoot = path.join(__dirname, "..");

function commandOutput(error) {
  return [error.message, error.stderr, error.stdout]
    .filter(Boolean)
    .map((part) => String(part))
    .join("\n");
}

try {
  execSync("pnpm exec prisma generate", {
    cwd: webRoot,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  });
} catch (error) {
  if (error.stdout) process.stdout.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);

  const output = commandOutput(error);
  const isLockError =
    output.includes("EPERM") || output.includes("operation not permitted");

  if (!isLockError) {
    process.exit(error.status ?? 1);
  }

  console.warn("");
  console.warn("[dev] prisma generate skipped: query engine file is locked.");
  console.warn("[dev] Another Node/pnpm dev process may still be running.");
  console.warn("[dev] Stop it (Ctrl+C or Task Manager), then restart if the app misbehaves.");
  console.warn("[dev] Continuing with the existing Prisma Client...");
  console.warn("");
}

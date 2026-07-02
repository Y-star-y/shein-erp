const { execSync } = require("node:child_process");
const path = require("node:path");

const webRoot = path.join(__dirname, "..");

console.log("Running prisma migrate deploy...");
execSync("pnpm exec prisma migrate deploy", {
  cwd: webRoot,
  stdio: "inherit",
  env: process.env,
});
console.log("Database migrations applied.");

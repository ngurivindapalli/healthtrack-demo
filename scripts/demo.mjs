import { spawn } from "node:child_process";

const command = process.argv[2] === "build" || process.argv[2] === "start" ? process.argv[2] : "dev";
const child = spawn("npx", ["next", command], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_DEMO_MODE: "true" },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

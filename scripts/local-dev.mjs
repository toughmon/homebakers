import { spawn } from "node:child_process";
const port = process.env.APP_PORT ?? "5175";
const env = {
  ...process.env,
  DATABASE_MODE: "embedded",
  ENABLE_GRAPH_API: "false",
  APP_PORT: port,
  APP_ORIGIN: process.env.APP_ORIGIN ?? `http://127.0.0.1:${port}`,
};
let child;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child?.kill(signal));
function run(args) {
  return new Promise((resolve, reject) => {
    child = spawn("corepack", ["pnpm", ...args], { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Command exited with ${code}`)),
    );
  });
}
await run(["db:migrate"]);
await run(["db:seed"]);
await run([
  "--parallel",
  "--filter",
  "@homebakers/app",
  "--filter",
  "@homebakers/api",
  "dev",
]);

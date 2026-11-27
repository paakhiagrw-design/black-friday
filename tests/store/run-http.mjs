import { mkdtemp, cp, mkdir, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import Database from "better-sqlite3";
const root = process.cwd();
const directory = await mkdtemp(path.join(tmpdir(), "reroute-http-"));
let server;
let logs = "";
try {
  for (const entry of [
    "app",
    "lib",
    "components",
    "public",
    "package.json",
    "tsconfig.json",
    "next.config.ts",
  ])
    await cp(path.join(root, entry), path.join(directory, entry), {
      recursive: true,
    });
  await mkdir(path.join(directory, "database"));
  await cp("database/schema.sql", path.join(directory, "database/schema.sql"));
  await symlink(
    path.join(root, "node_modules"),
    path.join(directory, "node_modules"),
  );
  const source = new Database("database/reroute.db", { readonly: true });
  try {
    await source.backup(path.join(directory, "database/reroute.db"));
  } finally {
    source.close();
  }
  const port = process.env.STORE_TEST_PORT || "3107";
  const url = `http://127.0.0.1:${port}`;
  const publicDomain = "rip-store.example.test";
  server = spawn(
    process.execPath,
    [
      path.join(root, "node_modules/next/dist/bin/next"),
      "dev",
      "--webpack",
      "--port",
      port,
    ],
    {
      cwd: directory,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, RAILWAY_PUBLIC_DOMAIN: publicDomain },
    },
  );
  server.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk;
  });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(url + "/api/products");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Isolated test server failed to start:\n" + logs);
  const test = spawn(
    process.execPath,
    ["--test", "tests/store/http.test.mjs"],
    {
      cwd: root,
      env: {
        ...process.env,
        STORE_TEST_URL: url,
        STORE_TEST_PUBLIC_ORIGIN: `https://${publicDomain}`,
      },
      stdio: "inherit",
    },
  );
  process.exitCode = await new Promise((resolve) =>
    test.on("exit", (code) => resolve(code ?? 1)),
  );
} finally {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.on("exit", resolve));
  }
  await rm(directory, { recursive: true, force: true });
}

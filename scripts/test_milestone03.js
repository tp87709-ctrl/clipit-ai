#!/usr/bin/env node
/**
 * Milestone 03 end-to-end verification.
 * Starts backend, tests project CRUD API, verifies DB file exists.
 */

const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const BACKEND_DIR = path.join(__dirname, "..", "backend");
const VENV_PYTHON = path.join(BACKEND_DIR, "venv", "Scripts", "python.exe");
const DB_PATH = path.join(BACKEND_DIR, "data", "clipit.db");
const PORT = 8000;

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

function httpReq(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "127.0.0.1",
      port: PORT,
      path: urlPath,
      method,
      headers: { "Content-Type": "application/json" },
    };
    const req = http.request(opts, (res) => {
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({ status: res.statusCode, json });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function waitForServer(maxMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > maxMs) reject(new Error("Server timeout"));
        else setTimeout(tryConnect, 200);
      });
      req.end();
    };
    tryConnect();
  });
}

async function main() {
  // Remove stale DB
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  console.log("\n=== Milestone 03 — Project System E2E ===\n");

  // Start backend
  const server = spawn(VENV_PYTHON, ["-m", "uvicorn", "app.main:app", "--port", String(PORT)], {
    cwd: BACKEND_DIR,
    stdio: "ignore",
  });

  try {
    await waitForServer();
    console.log("Backend started.\n");

    // 1. Health check
    console.log("Health:");
    const health = await httpReq("GET", "/api/health");
    assert(health.status === 200, "GET /api/health → 200");
    assert(health.json?.status === "healthy", "health status is 'healthy'");

    // 2. Create project
    console.log("\nCreate:");
    const created = await httpReq("POST", "/api/projects", {
      name: "E2E Test Project",
      description: "Testing the full CRUD cycle",
    });
    assert(created.status === 200, "POST /api/projects → 200");
    assert(created.json?.id, "response has id");
    assert(created.json?.name === "E2E Test Project", "name matches");
    assert(created.json?.status === "active", "status is 'active'");
    const pid = created.json.id;

    // 3. Get project
    console.log("\nGet:");
    const got = await httpReq("GET", `/api/projects/${pid}`);
    assert(got.status === 200, "GET /api/projects/:id → 200");
    assert(got.json?.id === pid, "id matches");

    // 4. List projects
    console.log("\nList:");
    const list = await httpReq("GET", "/api/projects");
    assert(list.status === 200, "GET /api/projects → 200");
    assert(list.json?.total >= 1, "total >= 1");
    assert(Array.isArray(list.json?.projects), "projects is array");
    assert(list.json.projects.length >= 1, "projects array has items");

    // 5. Update project
    console.log("\nUpdate:");
    const updated = await httpReq("PATCH", `/api/projects/${pid}`, {
      name: "Updated Project",
    });
    assert(updated.status === 200, "PATCH /api/projects/:id → 200");
    assert(updated.json?.name === "Updated Project", "name updated");

    // 6. 404 on missing
    console.log("\n404:");
    const missing = await httpReq("GET", "/api/projects/nonexistent");
    assert(missing.status === 404, "GET /api/projects/nonexistent → 404");

    // 7. Delete project
    console.log("\nDelete:");
    const deleted = await httpReq("DELETE", `/api/projects/${pid}`);
    assert(deleted.status === 200, "DELETE /api/projects/:id → 200");
    assert(deleted.json?.deleted === true, "deleted is true");

    const gone = await httpReq("GET", `/api/projects/${pid}`);
    assert(gone.status === 404, "GET deleted project → 404");

    // 8. DB file exists
    console.log("\nDatabase:");
    assert(fs.existsSync(DB_PATH), "SQLite DB file exists");
    const stat = fs.statSync(DB_PATH);
    assert(stat.size > 0, "DB file is non-empty");

    // Summary
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  } finally {
    server.kill();
    // Wait for process to exit
    await new Promise((r) => server.on("close", r));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Milestone 04 end-to-end verification.
 * Starts backend, tests video upload/list/get/delete, verifies files on disk.
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

function httpUpload(urlPath, filename, content) {
  return new Promise((resolve, reject) => {
    const boundary = "----TestBoundary" + Date.now();
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: video/mp4\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([
      Buffer.from(header),
      content,
      Buffer.from(footer),
    ]);

    const opts = {
      hostname: "127.0.0.1",
      port: PORT,
      path: urlPath,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
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
    req.write(body);
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
  // Clean up
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  console.log("\n=== Milestone 04 — Video Ingestion E2E ===\n");

  const server = spawn(VENV_PYTHON, ["-m", "uvicorn", "app.main:app", "--port", String(PORT)], {
    cwd: BACKEND_DIR,
    stdio: "ignore",
  });

  try {
    await waitForServer();
    console.log("Backend started.\n");

    // 1. Create a project
    console.log("Setup:");
    const proj = await httpReq("POST", "/api/projects", { name: "Video Test" });
    assert(proj.status === 200, "Create project → 200");
    const pid = proj.json.id;

    // 2. Upload a video
    console.log("\nUpload:");
    const fakeVideo = Buffer.alloc(20 * 1024, 0xAB); // 20KB fake video
    const uploaded = await httpUpload(`/api/projects/${pid}/videos`, "test-video.mp4", fakeVideo);
    assert(uploaded.status === 200, "Upload video → 200");
    assert(uploaded.json.original_filename === "test-video.mp4", "original_filename matches");
    assert(uploaded.json.status === "uploaded", "status is 'uploaded'");
    assert(uploaded.json.file_size === 20 * 1024, "file_size matches");
    assert(uploaded.json.project_id === pid, "project_id matches");
    const vid = uploaded.json;

    // 3. Verify file exists on disk
    console.log("\nFile storage:");
    assert(fs.existsSync(vid.file_path), "File exists on disk");
    const stat = fs.statSync(vid.file_path);
    assert(stat.size === 20 * 1024, "File size on disk matches");

    // 4. Get video
    console.log("\nGet:");
    const got = await httpReq("GET", `/api/videos/${vid.id}`);
    assert(got.status === 200, "GET /api/videos/:id → 200");
    assert(got.json.id === vid.id, "id matches");

    // 5. List project videos
    console.log("\nList:");
    const list = await httpReq("GET", `/api/projects/${pid}/videos`);
    assert(list.status === 200, "GET /api/projects/:id/videos → 200");
    assert(list.json.total === 1, "total is 1");
    assert(list.json.videos.length === 1, "videos array has 1 item");

    // 6. Upload another video
    const uploaded2 = await httpUpload(`/api/projects/${pid}/videos`, "second.mov", Buffer.alloc(5 * 1024, 0xCD));
    assert(uploaded2.status === 200, "Upload second video (.mov) → 200");
    const list2 = await httpReq("GET", `/api/projects/${pid}/videos`);
    assert(list2.json.total === 2, "total is 2 after second upload");

    // 7. Reject invalid extension
    console.log("\nValidation:");
    const bad = await httpUpload(`/api/projects/${pid}/videos`, "readme.txt", Buffer.from("hello"));
    assert(bad.status === 400, "Reject .txt → 400");

    // 8. 404 on missing video
    const missing = await httpReq("GET", "/api/videos/nonexistent");
    assert(missing.status === 404, "GET nonexistent video → 404");

    // 9. Delete video
    console.log("\nDelete:");
    const deleted = await httpReq("DELETE", `/api/videos/${vid.id}`);
    assert(deleted.status === 200, "DELETE video → 200");
    assert(deleted.json.deleted === true, "deleted is true");
    assert(!fs.existsSync(vid.file_path), "File removed from disk");
    const gone = await httpReq("GET", `/api/videos/${vid.id}`);
    assert(gone.status === 404, "GET deleted video → 404");

    // 10. DB exists
    console.log("\nDatabase:");
    assert(fs.existsSync(DB_PATH), "SQLite DB exists");

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  } finally {
    server.kill();
    await new Promise((r) => server.on("close", r));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});

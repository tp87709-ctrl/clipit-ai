const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3000;

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log("  \u2713 " + msg);
  } else {
    failed++;
    console.log("  \u2717 " + msg);
  }
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: "GET",
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on("error", reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const req = http.request({ hostname: "127.0.0.1", port, path: "/", method: "GET", timeout: 1000 }, () => {
        req.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeout) reject(new Error("port " + port + " not ready"));
        else setTimeout(check, 500);
      });
      req.on("timeout", () => { req.destroy(); setTimeout(check, 500); });
      req.end();
    }
    check();
  });
}

async function main() {
  console.log("=== Milestone 02 End-to-End Verification ===\n");

  // Start backend
  console.log("Starting backend on port " + BACKEND_PORT + "...");
  const backend = spawn(path.join(__dirname, "..", "backend", "venv", "Scripts", "python.exe"), ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(BACKEND_PORT)], {
    cwd: path.join(__dirname, "..", "backend"),
    stdio: "ignore",
    detached: true,
    shell: true,
  });
  backend.unref();

  try {
    await waitForPort(BACKEND_PORT);
  } catch (e) {
    console.log("FAIL: Backend did not start: " + e.message);
    process.exit(1);
  }
  console.log("Backend is up.\n");

  // --- Backend Tests ---
  console.log("Test 1: GET /api/health returns 200");
  try {
    const r = await httpGet("http://127.0.0.1:" + BACKEND_PORT + "/api/health");
    assert(r.status === 200, "Status code is 200 (got " + r.status + ")");
    const data = JSON.parse(r.body);
    assert(data.status === "healthy", "status field is 'healthy'");
    assert(data.service === "Clipit.ai", "service field is 'Clipit.ai'");
    assert(typeof data.timestamp === "string" && data.timestamp.includes("T"), "timestamp is ISO 8601 string");
    assert(Object.keys(data).length === 4, "exactly 4 fields in response");
  } catch (e) {
    assert(false, "health endpoint failed: " + e.message);
  }

  console.log("\nTest 2: CORS headers with Origin: http://localhost:3000");
  try {
    const r = await httpGet("http://127.0.0.1:" + BACKEND_PORT + "/api/health", { Origin: "http://localhost:3000" });
    assert(r.headers["access-control-allow-origin"] === "http://localhost:3000", "CORS allow-origin set correctly");
  } catch (e) {
    assert(false, "CORS check failed: " + e.message);
  }

  console.log("\nTest 3: Unknown route returns 404");
  try {
    const r = await httpGet("http://127.0.0.1:" + BACKEND_PORT + "/api/nonexistent");
    assert(r.status === 404, "Status code is 404 (got " + r.status + ")");
  } catch (e) {
    assert(false, "404 check failed: " + e.message);
  }

  // Start frontend
  console.log("\nStarting frontend on port " + FRONTEND_PORT + "...");
  const frontend = spawn("npx", ["next", "dev", "--port", String(FRONTEND_PORT)], {
    cwd: path.join(__dirname, "..", "frontend"),
    stdio: "ignore",
    detached: true,
    shell: true,
  });
  frontend.unref();

  try {
    await waitForPort(FRONTEND_PORT, 30000);
  } catch (e) {
    console.log("FAIL: Frontend did not start: " + e.message);
    backend.kill();
    process.exit(1);
  }
  console.log("Frontend is up.\n");

  console.log("Test 4: Frontend serves HTML with correct title");
  try {
    const r = await httpGet("http://localhost:" + FRONTEND_PORT + "/");
    assert(r.status === 200, "Status code is 200");
    assert(r.body.includes("<title>Clipit.ai</title>"), "Page title is 'Clipit.ai'");
    assert(r.body.includes("Clipit.ai"), "Page content includes 'Clipit.ai'");
  } catch (e) {
    assert(false, "Frontend page check failed: " + e.message);
  }

  console.log("\nTest 5: Frontend proxy forwards /api/health to backend");
  try {
    const r = await httpGet("http://localhost:" + FRONTEND_PORT + "/api/health");
    assert(r.status === 200, "Proxy returns 200 (got " + r.status + ")");
    const data = JSON.parse(r.body);
    assert(data.status === "healthy", "Proxied response has correct status");
    assert(data.service === "Clipit.ai", "Proxied response has correct service name");
  } catch (e) {
    assert(false, "Proxy test failed: " + e.message);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("  RESULT: " + passed + " passed, " + failed + " failed");
  console.log("=".repeat(50));

  // Cleanup
  backend.kill();
  frontend.kill();

  process.exit(failed > 0 ? 1 : 0);
}

main();

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

let totalPass = 0;
let totalFail = 0;

function assert(condition, message) {
  if (condition) {
    totalPass++;
    console.log("  \u2713 " + message);
  } else {
    totalFail++;
    console.log("  \u2717 " + message);
  }
}

function gitCheckIgnore(filePath) {
  try {
    execSync("git check-ignore " + filePath, { encoding: "utf8", cwd: "." });
    return true;
  } catch (e) {
    return false;
  }
}

// ============================================================
// Test 1: Directory Structure
// ============================================================
console.log("\nTest 1: Directory Structure");

const requiredDirs = [
  "docs", "docs/decisions",
  "media", "media/uploads", "media/audio", "media/clips", "media/captions", "media/exports",
  "scripts",
];

const requiredFiles = [
  "ARCHITECTURE.md", "DEVELOPMENT_PLAN.md", "README.md",
  ".gitignore", ".env.example",
];

requiredDirs.forEach((d) => {
  assert(fs.existsSync(d) && fs.statSync(d).isDirectory(), "Directory: " + d);
});

requiredFiles.forEach((f) => {
  assert(fs.existsSync(f) && fs.statSync(f).isFile(), "File: " + f);
});

["media/uploads", "media/audio", "media/clips", "media/captions", "media/exports"].forEach((d) => {
  assert(fs.existsSync(path.join(d, ".gitkeep")), ".gitkeep: " + d);
});

// ============================================================
// Test 2: .env.example Configuration
// ============================================================
console.log("\nTest 2: .env.example Config Completeness");

const envContent = fs.readFileSync(".env.example", "utf8");
const envVars = {};
envContent.split("\n").filter((l) => l && !l.startsWith("#") && l.includes("=")).forEach((l) => {
  const [key, ...valParts] = l.split("=");
  envVars[key.trim()] = valParts.join("=").trim();
});

console.log("  Parsed " + Object.keys(envVars).length + " variables");

const requiredVars = [
  "OLLAMA_BASE_URL", "OLLAMA_MODEL", "WHISPER_MODEL", "FFMPEG_PATH",
  "DATABASE_PATH", "MEDIA_ROOT", "UPLOAD_MAX_SIZE_MB",
  "HOST", "PORT", "FRONTEND_URL", "LOG_LEVEL",
];

requiredVars.forEach((v) => {
  assert(!!envVars[v], "Var: " + v + " = " + (envVars[v] || "MISSING"));
});

// ============================================================
// Test 3: .gitignore — Patterns that match at repo root
//   We create files directly at the repo root, test them,
//   then clean up. This is how gitignore actually operates.
// ============================================================
console.log("\nTest 3: .gitignore Pattern Correctness");

// Files that SHOULD be ignored
const shouldIgnore = [
  // Python
  { dir: "_gi/node_modules", file: "x.js" },
  { dir: "_gi/venv/lib", file: "p.py" },
  { dir: "_gi/__pycache__", file: "m.pyc" },
  // Env
  { dir: "_gi", file: ".env" },
  { dir: "_gi", file: ".env.local" },
  // Database
  { dir: "_gi/data", file: "t.db" },
  // Media (root-level paths)
  { dir: "media/uploads", file: "v.mp4" },
  { dir: "media/audio", file: "t.wav" },
  { dir: "media/clips", file: "c.mp4" },
  // Build
  { dir: "_gi/.next", file: "b.js" },
  { dir: "_gi/dist", file: "b.js" },
  { dir: "_gi/.pytest_cache", file: "c.json" },
  { dir: "_gi", file: "test.log" },
];

// Files that should NOT be ignored
const shouldNotIgnore = [
  { dir: "_gi/frontend/app", file: "page.tsx" },
  { dir: "_gi/backend/app", file: "main.py" },
  { dir: "_gi", file: "ARCHITECTURE.md" },
  { dir: "_gi", file: ".env.example" },
  { dir: "_gi/docs/decisions", file: "a.md" },
  { dir: "_gi/scripts", file: "setup.sh" },
];

// Create all test files
[...shouldIgnore, ...shouldNotIgnore].forEach(({ dir, file }) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), "x");
});

// Test ignored files
shouldIgnore.forEach(({ dir, file }) => {
  const fp = path.join(dir, file);
  assert(gitCheckIgnore(fp), "Ignored: " + fp);
});

// Test tracked files
shouldNotIgnore.forEach(({ dir, file }) => {
  const fp = path.join(dir, file);
  assert(!gitCheckIgnore(fp), "Tracked: " + fp);
});

// Cleanup
execSync("rm -rf _gi");

// ============================================================
// Test 3b: Media .gitkeep files must NOT be ignored
// ============================================================
console.log("\nTest 3b: Media .gitkeep files are tracked");

["media/uploads", "media/audio", "media/clips", "media/captions", "media/exports"].forEach((d) => {
  const gitkeep = path.join(d, ".gitkeep");
  assert(fs.existsSync(gitkeep) && !gitCheckIgnore(gitkeep), "Tracked: " + gitkeep);
});

// ============================================================
// Test 4: Markdown Syntactic Validity
// ============================================================
console.log("\nTest 4: Markdown Syntactic Validity");

["ARCHITECTURE.md", "DEVELOPMENT_PLAN.md", "README.md"].forEach((f) => {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");

  assert(content.trim().length > 0, f + " not empty");
  assert(lines.some((l) => /^# [^\n]+/.test(l)), f + " has H1");

  const fences = content.match(/```/g) || [];
  assert(fences.length % 2 === 0, f + " balanced fences (" + fences.length + ")");

  assert(!content.match(/\[[^\]]*\]\(\s*\)/g), f + " no broken links");

  // Per-table column consistency
  const tables = [];
  let currentTable = [];
  lines.forEach((line) => {
    if (line.trim().startsWith("|")) {
      currentTable.push(line.trim());
    } else {
      if (currentTable.length > 0) { tables.push(currentTable); currentTable = []; }
    }
  });
  if (currentTable.length > 0) tables.push(currentTable);

  tables.forEach((table, tIdx) => {
    const colCounts = table.map((r) => r.split("|").length - 2);
    const expected = colCounts[0];
    const bad = colCounts.filter((c) => c !== expected);
    assert(bad.length === 0, f + " table " + (tIdx + 1) + " (" + expected + " cols)");
  });
});

// ============================================================
// Test 5: ARCHITECTURE.md Content Coverage
// ============================================================
console.log("\nTest 5: ARCHITECTURE.md Content Coverage");

const arch = fs.readFileSync("ARCHITECTURE.md", "utf8");

[
  "Architectural Principles", "Directory Structure", "System Components",
  "Frontend", "API Layer", "Application Services", "Domain Models",
  "Repository Layer", "Database", "AI Integrations", "Whisper", "Ollama",
  "Media Engine", "FFmpeg", "Background Job", "Agent", "Data Flow",
  "Database Design", "Configuration Management", "Logging Strategy",
  "Testing Strategy", "Security Considerations", "Technical Risks", "API Design",
].forEach((s) => {
  assert(arch.includes(s), "Covers: " + s);
});

// ============================================================
// Test 6: DEVELOPMENT_PLAN.md Content Coverage
// ============================================================
console.log("\nTest 6: DEVELOPMENT_PLAN.md Content Coverage");

const plan = fs.readFileSync("DEVELOPMENT_PLAN.md", "utf8");

for (let i = 1; i <= 18; i++) {
  const num = String(i).padStart(2, "0");
  assert(plan.includes("Milestone " + num), "Milestone " + num);
}

assert(plan.includes("Quality Gates"), "Quality Gates section");
assert(plan.includes("Git Commit Convention"), "Git Commit Convention section");
assert(plan.includes("Risk Register"), "Risk Register section");

// ============================================================
// SUMMARY
// ============================================================
console.log("\n" + "=".repeat(50));
console.log("  FINAL RESULT: " + totalPass + " passed, " + totalFail + " failed");
console.log("=".repeat(50));

if (totalFail === 0) {
  console.log("\n  \u2713 ALL CHECKS PASSED - Milestone 01 is verified.\n");
} else {
  console.log("\n  \u2717 " + totalFail + " CHECK(S) FAILED\n");
  process.exit(1);
}

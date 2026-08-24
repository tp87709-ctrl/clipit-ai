# Clipit.ai — Architecture Document

## Overview

Clipit.ai is a local-first AI content factory. It transforms long-form video into short-form clips (Shorts, Reels, TikToks) using a pipeline of local AI and media-processing services. Every component runs on the user's Windows machine. No data leaves the PC without explicit user consent.

The application follows a layered architecture:

```
Frontend (Next.js + TypeScript + Tailwind + shadcn/ui)
        ↓
  API Layer (FastAPI)
        ↓
  Application Services
        ↓
  Domain Logic + Infrastructure
  (SQLite, filesystem, FFmpeg, Whisper, Ollama)
```

---

## Architectural Principles

1. **Build incrementally** — each milestone adds real, tested functionality.
2. **No premature infrastructure** — SQLite, local filesystem, and single-machine workers only. No Redis, Kubernetes, or cloud services during MVP.
3. **Separation of concerns** — Frontend, API, services, domain, and infrastructure are strictly separated. No one layer directly implements another layer's responsibility.
4. **Business logic stays out of UI components** — React components render data; services make decisions.
5. **Database access stays out of API routes where practical** — Repository/service layer mediates all DB access.
6. **AI handles interpretation, analysis, and generation** — not deterministic media operations.
7. **Deterministic systems handle deterministic operations** — FFmpeg performs video/audio tasks; Whisper performs transcription; Ollama performs content analysis.
8. **Future agent orchestrates existing services** — the agent calls controlled tools; it never bypasses validation or directly manipulates the filesystem or database.
9. **Every major subsystem is independently testable** — unit tests for domain logic, integration tests for services, API tests for endpoints, media tests for FFmpeg operations.
10. **Prefer local and simple** — local filesystem, local models, local database during MVP.
11. **Never expose credentials** — environment variables and `.env` only.
12. **Never allow arbitrary shell commands from user input** — all shell execution is parameterized and validated.
13. **Never overwrite original uploads** — original files are preserved permanently.
14. **Handle failures explicitly** — every operation has defined error handling and status reporting.
15. **Never fake progress** — all processing status reflects real system state.
16. **No placeholder functionality** — if it exists, it works.
17. **Maintain a human-readable codebase** — names, structure, and documentation should be clear.
18. **Document important decisions** — architectural decisions are recorded in this document or in `docs/`.
19. **Maintain backward compatibility** — existing working functionality is not broken to simplify something new.

---

## Directory Structure

```
clipit-ai/
├── frontend/                  # Next.js + TypeScript + Tailwind + shadcn/ui
│   ├── app/                   # Next.js App Router pages
│   ├── components/            # React components (UI and feature-specific)
│   ├── lib/                   # Utility functions and helpers
│   ├── hooks/                 # Custom React hooks
│   ├── styles/                # Global styles and Tailwind config
│   └── public/                # Static assets
│
├── backend/                   # Python FastAPI backend
│   ├── app/                   # Application package
│   │   ├── main.py            # FastAPI entry point
│   │   ├── api/               # API route handlers
│   │   ├── services/          # Application services (business logic)
│   │   ├── repositories/      # Data access layer (SQLite)
│   │   ├── models/            # Domain models and database models
│   │   ├── ai/                # AI integrations (Ollama, Whisper)
│   │   ├── media/             # FFmpeg wrapper utilities
│   │   ├── jobs/              # Background job processing
│   │   ├── config.py          # Configuration management
│   │   └── logging.py         # Logging configuration
│   ├── tests/                 # Backend tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── api/
│   ├── requirements.txt       # Python dependencies
│   ├── pytest.ini             # Pytest configuration
│   └── pyproject.toml         # Python project metadata
│
├── tests/                     # Top-level integration tests
│
├── media/                     # Runtime media storage
│   ├── uploads/               # Original uploaded videos (never modified)
│   ├── audio/                 # Extracted audio files
│   ├── clips/                 # Generated clip segments
│   ├── captions/              # Generated caption files (SRT, ASS)
│   └── exports/               # Final rendered exports
│
├── docs/                      # Design documents and ADRs
│   ├── decisions/             # Architecture Decision Records
│   └── guides/                # Developer guides
│
├── scripts/                   # Utility scripts (setup, maintenance)
├── .env.example               # Environment variable template
├── .gitignore                 # Git ignore rules
├── README.md                  # Project overview and quickstart
├── ARCHITECTURE.md            # This document
└── DEVELOPMENT_PLAN.md        # Milestone roadmap
```

**Why this structure:**
- `frontend/` and `backend/` are clearly separated, each with their own tooling and test setup.
- `backend/app/` uses a flat package structure (`api/`, `services/`, `repositories/`, etc.) rather than deep nesting. This keeps navigation simple without sacrificing separation of concerns.
- `media/` is outside both `frontend/` and `backend/` because both layers may eventually read/write to it, and it should be easy to exclude from version control while being accessible to all services.
- `docs/decisions/` follows the Architecture Decision Record (ADR) format for recording significant technical choices.
- `scripts/` holds setup and maintenance utilities that don't belong in application code.

---

## System Components

### 1. Frontend (Next.js + TypeScript + Tailwind + shadcn/ui)

**Responsibility:** User interface for managing projects, reviewing candidates, editing content, and monitoring processing status.

**Key behaviors:**
- Project creation and listing
- Video upload with progress indication
- Real-time processing status display
- Clip candidate review (approve / reject / edit)
- Content metadata editing (hooks, titles, descriptions)
- Export management

**Technology choices:**
- **Next.js (App Router):** Server-side rendering where beneficial, clean routing model.
- **TypeScript:** Type safety across the codebase.
- **Tailwind CSS:** Utility-first styling, fast iteration.
- **shadcn/ui:** Accessible, customizable component library built on Radix primitives.

**Convention:** React components receive data from the API and render it. Business logic, data fetching, and state management live in hooks, services, or the API layer — not inside components.

---

### 2. API Layer (FastAPI)

**Responsibility:** HTTP interface between the frontend and application services. Validates incoming requests, delegates to services, and returns structured responses.

**Key behaviors:**
- Route definition and request validation (Pydantic models)
- Delegates to application services for business logic
- Returns appropriate HTTP status codes and error responses
- CORS configuration for local frontend development

**Convention:** Route handlers are thin. They parse the request, call a service, and format the response. No business logic, no direct database access, no direct filesystem manipulation.

---

### 3. Application Services

**Responsibility:** Orchestrate domain logic and infrastructure to fulfill use cases. Each service owns a specific capability.

**Services (built incrementally):**

| Service | Milestone | Responsibility |
|---------|-----------|----------------|
| `ProjectService` | 03 | Create, list, retrieve, update projects |
| `VideoService` | 04 | Upload, validate, store, and retrieve video files |
| `MediaService` | 05 | FFmpeg operations: inspect, extract audio, cut segments, render clips |
| `TranscriptionService` | 06 | Audio → Whisper → timestamped transcript segments |
| `AnalysisService` | 07 | Transcript → Ollama → clip candidates with scores |
| `CandidateService` | 08 | Review, approve, reject, and edit clip candidates |
| `ClipGenerationService` | 09 | Approved candidate → FFmpeg → 9:16 MP4 |
| `CaptionService` | 10 | Timestamped segments → SRT/ASS → burned-in captions |
| `ContentMetadataService` | 11 | Generate and manage hooks, titles, descriptions |
| `JobService` | 13 | Background job creation, tracking, and lifecycle management |
| `AgentService` | 14 | Orchestrate existing services through controlled tool calls |

**Convention:** Services accept and return domain models. They never accept raw HTTP requests or return HTTP responses directly. This keeps them testable without a running web server.

---

### 4. Domain Models

**Responsibility:** Represent core business concepts and enforce domain rules.

**Models (built incrementally):**

| Model | Milestone | Key Fields |
|-------|-----------|------------|
| `Project` | 03 | id, name, status, created_at, updated_at |
| `Video` | 04 | id, project_id, filename, original_path, status, metadata |
| `Transcript` | 06 | id, video_id, status, raw_text, language |
| `TranscriptSegment` | 06 | id, transcript_id, start_time, end_time, text, speaker |
| `ClipCandidate` | 07 | id, video_id, start_time, end_time, hook, summary, score, reasoning, status |
| `GeneratedClip` | 09 | id, candidate_id, file_path, duration, format, resolution |
| `Caption` | 10 | id, clip_id, file_path, format, style |
| `ContentMetadata` | 11 | id, clip_id, title, description, hooks, hashtags, category |
| `Job` | 13 | id, type, status, progress, error, entity_id, created_at |

**Convention:** Models use Pydantic for validation on the backend. The frontend uses TypeScript interfaces that mirror the API response shapes (generated or hand-maintained as needed).

---

### 5. Repository Layer

**Responsibility:** Data access abstraction over SQLite. Translates domain models to/from database rows.

**Key behaviors:**
- CRUD operations for each domain entity
- Query construction using SQL (via Python's built-in `sqlite3` or `aiosqlite`)
- No business logic — pure data access
- Transaction management where needed

**Convention:** Each entity gets its own repository class (e.g., `ProjectRepository`, `VideoRepository`). Repositories accept and return domain models.

---

### 6. Database (SQLite)

**Responsibility:** Persistent storage for projects, videos, transcripts, candidates, clips, metadata, and job state.

**Key decisions:**
- Single SQLite file stored in `data/` directory (not committed to git)
- Schema managed through migration scripts or initialization code
- No ORM during MVP — direct SQL for transparency and performance
- Foreign key relationships enforced at the database level
- Timestamps stored as ISO 8601 strings or Unix timestamps

**Schema strategy:**
- Tables created on application startup if they don't exist
- Each table includes `id` (UUID or integer), `created_at`, `updated_at`
- Status fields use string enums (e.g., `"pending"`, `"processing"`, `"completed"`, `"failed"`)
- File paths stored as relative paths from the project root (never absolute paths)

---

### 7. AI Integrations

#### 7a. Whisper (Transcription)

**Responsibility:** Convert audio to timestamped text transcription.

**Key behaviors:**
- Accepts audio file path, returns timestamped segments
- Model is configurable (e.g., `base`, `small`, `medium`, `large`)
- Returns text, start times, end times, and optional speaker tags
- Configuration via environment variables or application config

**Technology:** OpenAI Whisper (local Python package).

#### 7b. Ollama (Content Analysis)

**Responsibility:** Analyze transcripts, identify clip candidates, generate content metadata.

**Key behaviors:**
- Accepts transcript or text input, returns structured JSON
- System prompts are stored in `ai/prompts/` and version-controlled
- All LLM output is validated against a Pydantic schema before use
- Retries on malformed output with clear error logging
- Configurable model and endpoint via environment variables

**Technology:** Ollama running locally, accessed via HTTP API.

**Validation principle:** The LLM is treated as an unreliable source. Every output is parsed through Pydantic validation. If validation fails, the system retries (with a limit) and logs the failure. No unvalidated LLM output enters the database.

---

### 8. Media Engine (FFmpeg)

**Responsibility:** All deterministic media operations.

**Key behaviors:**
- Inspect video metadata (duration, resolution, FPS, codecs)
- Extract audio from video
- Cut video segments with precise timestamps
- Scale and crop video to 9:16 format
- Burn captions into video
- Render final export

**Convention:**
- All FFmpeg calls go through a `MediaService` wrapper
- Shell commands are constructed with parameterized arguments (never interpolated from user input)
- Original uploaded files are never modified
- All output is written to designated directories (`audio/`, `clips/`, `exports/`)
- FFmpeg errors are captured, logged, and surfaced to the user with clear messages

---

### 9. Background Job System (MVP)

**Responsibility:** Track and execute long-running operations without blocking the API.

**Key behaviors:**
- Jobs created with type, entity reference, and initial status (`pending`)
- Worker loop polls for pending jobs and executes them sequentially
- Job status updated through lifecycle: `pending` → `processing` → `completed` / `failed`
- Failed jobs record the error message and stack trace
- API provides job status endpoints for frontend polling

**Technology:** Python `threading` or `asyncio` background task during MVP. No external queue or worker infrastructure.

**Job types (initial):**
- `audio_extraction`
- `transcription`
- `ai_analysis`
- `clip_generation`
- `caption_rendering`
- `metadata_generation`

---

### 10. Agent Orchestrator (Future)

**Responsibility:** Orchestrate existing services through controlled tool calls in response to natural-language commands.

**Key behaviors:**
- Accepts user command in natural language
- Selects appropriate tool calls based on command and current project state
- Executes tools sequentially, checking results between steps
- Stops for human approval at defined checkpoints
- Never directly accesses the filesystem, database, or shell outside of defined tools

**Tool inventory (final):**
`inspect_project`, `inspect_video`, `transcribe_video`, `analyze_transcript`, `find_candidates`, `score_candidates`, `render_clip`, `generate_captions`, `generate_metadata`, `get_processing_status`

**Constraint:** The agent is built only after the underlying services work reliably. It orchestrates — it does not implement.

---

## Data Flow — End-to-End Pipeline

```
User uploads video
    ↓
VideoService validates and stores file in media/uploads/
    ↓
Video record created in SQLite (status: uploaded)
    ↓
Job created: audio_extraction
    ↓
MediaService extracts audio → media/audio/
    ↓
Job created: transcription
    ↓
TranscriptionService runs Whisper → timestamped segments
    ↓
Transcript and segments stored in SQLite
    ↓
Job created: ai_analysis
    ↓
AnalysisService sends transcript to Ollama → clip candidates
    ↓
Candidates stored in SQLite with scores
    ↓
User reviews candidates → approves / rejects / edits
    ↓
Job created: clip_generation (per approved candidate)
    ↓
ClipGenerationService uses MediaService → 9:16 MP4 in media/clips/
    ↓
Job created: caption_rendering
    ↓
CaptionService generates SRT → burns into clip via FFmpeg
    ↓
Job created: metadata_generation
    ↓
ContentMetadataService generates hooks, titles, descriptions via Ollama
    ↓
User reviews and edits metadata
    ↓
Job created: export
    ↓
MediaService produces final export in media/exports/
    ↓
Done — user downloads or locates the file
```

---

## Database Design Strategy

**Engine:** SQLite (single file, zero configuration)

**Location:** `data/clipit.db` (not committed to version control)

**Initialization:**
- Tables created on application startup via SQL init script
- Each table includes standard columns:
  - `id` — primary key (UUID string or auto-increment integer)
  - `created_at` — ISO 8601 timestamp
  - `updated_at` — ISO 8601 timestamp

**Migration strategy (MVP):**
- Version number stored in a `schema_version` table
- On startup, compare current version to expected version
- Run forward migrations sequentially if needed
- No rollback automation during MVP — manual intervention if schema changes go wrong

**Relationships:**
```
Project 1──→ N Video
Video 1──→ 1 Transcript
Transcript 1──→ N TranscriptSegment
Video 1──→ N ClipCandidate
ClipCandidate 1──→ 1 GeneratedClip
GeneratedClip 1──→ 1 Caption (optional)
GeneratedClip 1──→ 1 ContentMetadata
Project/Video/ClipCandidate 1──→ N Job
```

---

## Configuration Management

**Approach:** Environment variables loaded from `.env` file, with sensible defaults for local development.

**Key configuration items:**

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3` | Default Ollama model for analysis |
| `WHISPER_MODEL` | `base` | Whisper model size |
| `FFMPEG_PATH` | `ffmpeg` (PATH) | Path to FFmpeg binary |
| `DATABASE_PATH` | `data/clipit.db` | SQLite database file location |
| `MEDIA_ROOT` | `media/` | Root directory for media storage |
| `UPLOAD_MAX_SIZE_MB` | `5000` | Maximum upload file size |
| `HOST` | `0.0.0.0` | Backend server host |
| `PORT` | `8000` | Backend server port |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL for CORS |
| `LOG_LEVEL` | `INFO` | Logging level |

**Convention:** No hardcoded credentials or API keys in source code. All configuration that varies between environments goes through `.env`.

---

## Logging Strategy

**Approach:** Structured logging throughout the backend.

**Levels:**
- `DEBUG` — detailed diagnostic information (development only)
- `INFO` — service lifecycle events, job progress
- `WARNING` — recoverable issues (LLM retry, FFmpeg fallback)
- `ERROR` — operation failures requiring attention
- `CRITICAL` — system-level failures (database unreachable, FFmpeg missing)

**Convention:**
- Each service logs with a component name prefix (e.g., `[MediaService]`, `[TranscriptionService]`)
- Job execution logs include job ID and entity reference
- Errors include enough context to diagnose without reading source code
- No sensitive file paths or content logged at INFO level or above

---

## Testing Strategy

**Levels:**

| Level | Scope | Tools | Runs |
|-------|-------|-------|------|
| Unit tests | Domain logic, validation, utilities | pytest | Every commit |
| Integration tests | Services + SQLite, services + FFmpeg | pytest + fixtures | Every commit |
| API tests | FastAPI endpoints with test client | pytest + httpx/TestClient | Every commit |
| Media tests | FFmpeg operations with sample files | pytest + sample media | CI / pre-merge |
| LLM tests | AI analysis with mocked Ollama | pytest + mock responses | Every commit |
| E2E tests | Full pipeline with real video (opt-in) | pytest + local AI | Pre-milestone verify |
| Frontend tests | Component rendering and interaction | Vitest + React Testing Library | Every commit |

**Conventions:**
- Test files live alongside source or in the corresponding `tests/` subdirectory
- Fixtures provide test databases, sample transcripts, and temporary media directories
- Media tests use small, short sample videos (a few seconds) to keep test time low
- LLM integration tests use mocked responses; select milestones use real local AI tests
- Test coverage is verified but not used as the sole quality metric

---

## Security Considerations

1. **No credentials in source code** — all secrets in `.env`, excluded from git.
2. **No arbitrary shell execution** — FFmpeg commands are constructed from validated parameters only.
3. **Upload validation** — file type, size, and content verified before storage.
4. **Path traversal prevention** — all file paths are resolved relative to `MEDIA_ROOT` and validated.
5. **Original file preservation** — uploaded files are never modified or deleted by the system.
6. **No untrusted LLM output** — all AI responses validated through Pydantic before storage.
7. **No automatic publishing** — human approval required for all outbound actions in MVP.

---

## Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Whisper transcription quality varies by model size | User dissatisfaction | Document model trade-offs; let user choose model size |
| Ollama response quality depends on model choice | Poor clip selection | Use structured prompts; validate output; allow manual override |
| FFmpeg availability on Windows | Media operations fail | Detect FFmpeg on startup; clear error if missing; document install |
| SQLite concurrent write conflicts | Data corruption | Use WAL mode; serialize writes through repository layer |
| Large video files consume disk space | Storage exhaustion | Report disk usage; warn before processing large files |
| Long-running jobs block if worker thread dies | Stale job state | Worker health checks; timeout handling; manual job reset |
| Windows path handling differences | File not found errors | Use `pathlib` consistently; test on Windows specifically |
| Ollama not running when analysis requested | API errors | Health check before analysis; clear user-facing error message |

---

## API Design Principles

- RESTful endpoints for resource management
- JSON request/response bodies validated via Pydantic
- Consistent error response format:
  ```json
  {
    "error": "human-readable message",
    "code": "MACHINE_READABLE_CODE",
    "details": {}
  }
  ```
- Job creation endpoints return immediately with job ID
- Status polling endpoints return current job state
- Pagination for list endpoints (offset + limit)
- No authentication during MVP (local-only application)

---

## Frontend Design Principles

- Pages represent user workflows, not data models
- Components are small and focused on a single rendering concern
- Data fetching uses custom hooks that call the API layer
- Loading states, error states, and empty states are always handled
- Forms use controlled components with client-side validation
- All user-facing text is in English (no i18n during MVP)
- Responsive layout using Tailwind breakpoints (mobile-friendly is nice-to-have, not required for MVP)

---

## Conventions Summary

**Python:**
- Type hints on all function signatures
- Docstrings on all public functions and classes
- `snake_case` for functions, variables, and module names
- `PascalCase` for class names
- Imports sorted: stdlib → third-party → local
- No wildcard imports

**TypeScript:**
- Strict TypeScript (`strict: true`)
- `camelCase` for functions, variables
- `PascalCase` for components, interfaces, types
- No `any` type unless absolutely necessary (with comment explaining why)
- Components use named exports

**General:**
- Commit messages are imperative: "Add project creation endpoint"
- Each commit represents a single coherent change
- No commented-out code in committed files
- `TODO` comments include owner name or ticket reference

---

## Architecture Decision Records

Significant technical decisions will be recorded in `docs/decisions/` using the ADR format:

```
# ADR-NNNN: Title

## Status
Accepted | Proposed | Superseded by ADR-XXXX

## Context
What is the issue?

## Decision
What was decided?

## Consequences
What are the trade-offs?
```

First ADRs to create:
- ADR-0001: SQLite as primary database
- ADR-0002: Whisper for local transcription
- ADR-0003: Ollama for local LLM inference
- ADR-0004: FFmpeg as sole media processing engine
- ADR-0005: FastAPI as backend framework
- ADR-0006: Next.js as frontend framework

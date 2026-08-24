# Clipit.ai — Development Plan

## Overview

This document defines the development milestones for Clipit.ai. Each milestone is a self-contained unit of work that adds real, tested functionality to the application. Milestones are ordered to deliver an end-to-end vertical slice as early as possible, then expand the product around it.

**Development strategy:** Vertical milestones. Each milestone produces working, demonstrable functionality — not isolated infrastructure that only becomes useful later.

**Quality mandate:** Every milestone follows the cycle: Plan → Implement → Test → Verify → Report. No milestone is complete without passing tests and a clean build.

---

## Milestone Map

| # | Milestone | Goal | Dependencies |
|---|-----------|------|--------------|
| 01 | Architecture | Define system design and development roadmap | None |
| 02 | Development Foundation | Set up frontend, backend, configuration, and health check | 01 |
| 03 | Project System | Create, list, and manage projects | 02 |
| 04 | Video Ingestion | Upload, validate, and store videos | 03 |
| 05 | Media Engine | Reusable FFmpeg service | 02 |
| 06 | Transcription | Video → Whisper → timestamped transcript | 04, 05 |
| 07 | First AI Vertical Slice | Transcript → Ollama → best clip → 9:16 MP4 | 06 |
| 08 | Candidate Review | UI for reviewing and editing clip candidates | 07 |
| 09 | Short Generation | Approved candidate → 9:16 MP4 via FFmpeg | 08 |
| 10 | Captions | Timestamped transcript → subtitle overlay on clips | 09 |
| 11 | Content Intelligence | Generate hooks, titles, descriptions via LLM | 10 |
| 12 | Product Dashboard | Full navigation and project status views | 11 |
| 13 | Local Job Processing | Background worker system for long-running tasks | 12 |
| 14 | ClipIt.ai Agent | Orchestration agent using existing services | 13 |
| 15 | Feedback System | Record user decisions to improve future scoring | 14 |
| 16 | Advanced Intelligence | Scene detection, face detection, dynamic reframing | 14 |
| 17 | Analytics | Track published clips and engagement | 14 |
| 18 | Publishing | Platform integrations (YouTube, TikTok, Instagram) | 14, 17 |

**Critical path (MVP):** 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12

**After the MVP, parallel tracks diverge:**
- Agent track: 13 → 14
- Intelligence track: 15, 16, 17 (can be built in parallel after 14)
- Publishing track: 18 (after 17)

---

## Milestone 01 — Architecture

**Status:** Complete
**Git commit:** `architecture-complete`

### Goal

Define the complete system architecture, development roadmap, and project conventions. No application code is written in this milestone.

### Deliverables

- [x] `ARCHITECTURE.md` — complete system architecture document
- [x] `DEVELOPMENT_PLAN.md` — this document
- [x] `README.md` — project overview, quickstart, and tech stack summary
- [x] `.gitignore` — comprehensive ignore rules for Python, Node.js, media files, IDE files
- [x] `.env.example` — environment variable template with all configuration items
- [x] `docs/decisions/` — initial ADR directory (can be empty, created with structure)

### Acceptance Criteria

- [x] ARCHITECTURE.md covers all system components
- [x] DEVELOPMENT_PLAN.md defines all milestones with clear goals
- [x] All configuration variables documented
- [x] Git repository has proper .gitignore
- [x] No application code or dependencies installed

### Notes

- This milestone is a planning and documentation exercise
- The architecture may evolve as milestones are implemented — that's expected
- Document decisions, not just conclusions

---

## Milestone 02 — Development Foundation

**Status:** Complete
**Git commit:** `foundation-complete`

### Goal

Establish the development environment so that both frontend and backend run, communicate, and can be verified with a health check.

### Deliverables

**Frontend (Next.js + TypeScript + Tailwind + shadcn/ui):**
- [x] Initialize Next.js project with TypeScript
- [x] Configure Tailwind CSS
- [x] Install and configure shadcn/ui
- [x] Create a minimal landing page that displays connection status
- [x] Configure API proxy or direct fetch to backend

**Backend (Python + FastAPI):**
- [x] Initialize Python project with `pyproject.toml`
- [x] Set up virtual environment and `requirements.txt`
- [x] Install FastAPI and uvicorn
- [x] Create `backend/app/main.py` entry point
- [x] Implement health check endpoint (`GET /api/health`)
- [x] Set up Pydantic settings for configuration management
- [x] Set up structured logging
- [x] Configure CORS for local development

**Configuration:**
- [x] `.env` file loading
- [x] `.env.example` with all variables
- [x] Configuration accessible via Pydantic Settings

**Testing:**
- [x] Backend: pytest configured with test for health endpoint
- [ ] Frontend: basic smoke test if time permits

**Infrastructure:**
- [x] Git repository properly initialized
- [x] `.gitignore` covers Python, Node.js, IDE files, media, database
- [x] `data/` directory created (for SQLite)
- [x] `media/` subdirectories created

### Acceptance Criteria

- [x] `npm run dev` starts frontend on `localhost:3000`
- [x] `uvicorn` starts backend on `localhost:8000`
- [x] `GET /api/health` returns `200 OK` with status payload
- [x] Frontend can successfully call backend health endpoint
- [x] All tests pass (`pytest` and frontend test command)
- [x] No hardcoded values — all configuration through environment variables

---

## Milestone 03 — Project System

**Status:** Complete
**Git commit:** `project-system-complete`

### Goal

Implement the Project domain: create, list, retrieve, and manage project records. Build the first real database table and API endpoints.

### Deliverables

**Database:**
- [x] SQLite initialization on application startup
- [x] `projects` table schema (id, name, description, status, created_at, updated_at)
- [x] `schema_version` table for migration tracking

**Domain:**
- [x] `Project` Pydantic model (request/response)
- [x] `ProjectRepository` class with CRUD operations
- [x] `ProjectService` class orchestrating business logic

**API:**
- [x] `POST /api/projects` — create project
- [x] `GET /api/projects` — list projects (with pagination)
- [x] `GET /api/projects/{id}` — get project details
- [x] `PATCH /api/projects/{id}` — update project
- [x] `DELETE /api/projects/{id}` — delete project

**Frontend:**
- [x] Project list page
- [x] Project creation form
- [x] Project detail page (basic)

**Testing:**
- [x] API tests for all project endpoints
- [ ] Unit tests for ProjectRepository
- [ ] Unit tests for ProjectService
- [ ] Frontend component tests for project views

### Acceptance Criteria

- [x] Projects can be created, listed, updated, and deleted via API
- [x] Frontend displays projects and allows creation
- [x] SQLite database file created and populated
- [x] All tests pass
- [x] No business logic in API route handlers

---

## Milestone 04 — Video Ingestion

**Status:** Complete
**Git commit:** `video-ingestion-complete`

### Goal

Upload a long-form video, validate it, store it safely on the filesystem, and create a database record linking it to a project.

### Deliverables

**Domain:**
- [x] `Video` database model (id, project_id, filename, original_path, status, metadata)
- [x] `videos` table schema
- [x] `VideoRepository` with CRUD operations
- [x] `VideoService` orchestrating upload and validation

**API:**
- [x] `POST /api/projects/{id}/videos` — upload video file
- [x] `GET /api/projects/{id}/videos` — list project videos
- [x] `GET /api/videos/{id}` — get video details
- [x] `DELETE /api/videos/{id}` — remove video record (not original file)

**Media handling:**
- [x] File type validation (mp4, mov, avi, mkv)
- [x] File size limits
- [x] Safe filename generation (UUID-based, no user-controlled filenames)
- [x] Storage in `media/uploads/` with date-partitioned subdirectories

**Frontend:**
- [x] Video upload component with progress indication
- [x] Video list within project view
- [x] Video detail/status view

**Testing:**
- [x] API tests for upload and retrieval
- [x] Integration test for file storage
- [ ] Unit tests for video validation logic
- [ ] Test that original filenames are not used

### Acceptance Criteria

- [x] Videos upload successfully and are stored on filesystem
- [x] Original files are never modified or deleted by the system
- [x] File paths in database are relative, not absolute
- [x] Invalid files are rejected with clear error messages
- [x] Uploaded files have safe, non-guessable filenames
- [x] All tests pass

---

## Milestone 05 — Media Engine

**Status:** Complete
**Git commit:** `media-engine-complete`

### Goal

Create a reusable FFmpeg service that wraps all media operations behind a clean interface. Test it with sample media files.

### Deliverables

**Service:**
- [x] `MediaService` class in `backend/app/media/ffmpeg_service.py`
- [x] `detect_ffmpeg()` — verify FFmpeg is available
- [x] `get_metadata(path)` — duration, resolution, FPS, codecs, file size
- [x] `extract_audio(video_path, output_path)` — extract audio track
- [x] `cut_segment(video_path, start, end, output_path)` — cut a time range
- [x] `convert_to_vertical(input_path, output_path, strategy)` — 9:16 format conversion
- [x] All methods use parameterized commands (no string interpolation of user input)

**Configuration:**
- [x] `FFMPEG_PATH` configurable via environment variable
- [ ] FFmpeg availability checked on application startup (done in service, not wired to lifespan yet)

**Testing:**
- [x] Unit tests for MediaService with mocked subprocess calls (13 tests)
- [x] Integration tests with small sample video files (12 tests)
- [x] Test error handling for missing FFmpeg, invalid files, corrupt media

### Acceptance Criteria

- [x] MediaService can detect FFmpeg availability
- [x] Metadata extraction returns accurate values
- [x] Audio extraction produces valid audio files
- [x] Segment cutting produces accurate time ranges
- [x] Vertical conversion produces valid 9:16 video
- [x] All FFmpeg commands are parameterized (no shell injection risk)
- [x] All tests pass (49/49 total, 25 new)

---

## Milestone 06 — Transcription

**Status:** Not Started
**Git commit:** `transcription-complete`

### Goal

Extract audio from a video, run Whisper transcription, and store timestamped transcript segments in the database.

### Deliverables

**Database:**
- [ ] `transcripts` table (id, video_id, status, raw_text, language, model_used)
- [ ] `transcript_segments` table (id, transcript_id, start_time, end_time, text, speaker)
- [ ] `TranscriptRepository` and `TranscriptSegmentRepository`

**Domain:**
- [ ] `Transcript` and `TranscriptSegment` Pydantic models
- [ ] `TranscriptionService` orchestrating the pipeline:
  1. Check if audio already extracted → extract if not
  2. Run Whisper on audio file
  3. Parse Whisper output into segments
  4. Store transcript and segments in database
  5. Update video and transcript status

**Configuration:**
- [ ] `WHISPER_MODEL` configurable (base / small / medium / large)
- [ ] `WHISPER_DEVICE` configurable (cpu / cuda)

**Frontend:**
- [ ] Transcription status indicator on video detail page
- [ ] Transcript view with timestamped segments

**Testing:**
- [ ] Unit tests for segment parsing logic
- [ ] Mocked Whisper tests for the transcription pipeline
- [ ] Integration test with a short sample audio file
- [ ] API tests for transcription trigger and status endpoints

### Acceptance Criteria

- [ ] Video → audio extraction → Whisper → timestamped segments works end-to-end
- [ ] Transcript segments stored with accurate timestamps
- [ ] Transcript status reflects real processing state
- [ ] Whisper model is configurable
- [ ] All tests pass

---

## Milestone 07 — First AI Vertical Slice ⭐

**Status:** Not Started
**Git commit:** `first-ai-vertical-slice`

### Goal

**This is the critical milestone.** Given a video with a transcript, use Ollama to identify the best clip candidate, then render it as a 9:16 MP4 using FFmpeg. This proves the entire vertical pipeline works.

### Deliverables

**AI Analysis:**
- [ ] `AnalysisService` that sends transcript to Ollama
- [ ] System prompt stored in `ai/prompts/clip_analysis.md`
- [ ] Structured output schema:
  ```json
  {
    "start_time": 102.4,
    "end_time": 118.7,
    "hook": "...",
    "summary": "...",
    "score": 89,
    "reasoning": "..."
  }
  ```
- [ ] Pydantic validation of all LLM output
- [ ] Retry logic for malformed responses (max 3 attempts)
- [ ] Fallback handling when Ollama is unavailable

**Clip Candidates:**
- [ ] `clip_candidates` table (id, video_id, start_time, end_time, hook, summary, score, reasoning, status)
- [ ] `ClipCandidateRepository`

**Pipeline:**
- [ ] End-to-end: transcript → Ollama → candidate → FFmpeg → 9:16 MP4
- [ ] Candidate saved to database
- [ ] Rendered clip saved to `media/clips/`

**Configuration:**
- [ ] `OLLAMA_BASE_URL` configurable
- [ ] `OLLAMA_MODEL` configurable
- [ ] Ollama health check before analysis

**Testing:**
- [ ] Unit tests for prompt construction and output parsing
- [ ] Mocked Ollama tests for the analysis pipeline
- [ ] Pydantic validation tests for malformed LLM output
- [ ] Integration test: real video → transcript → Ollama → candidate → FFmpeg → MP4
- [ ] Test retry logic for invalid responses

### Acceptance Criteria

- [ ] A real video with a transcript can produce an AI-selected clip candidate
- [ ] The candidate includes hook, summary, score, and reasoning
- [ ] The candidate is stored in SQLite
- [ ] FFmpeg renders the candidate as a valid 9:16 MP4
- [ ] All LLM output is validated before storage
- [ ] Retry logic handles malformed responses
- [ ] Clear error message when Ollama is not running
- [ ] All tests pass

### Validation Criteria

- [ ] Run with a real 10+ minute video
- [ ] Verify Whisper produces accurate transcript
- [ ] Verify Ollama returns a sensible clip candidate
- [ ] Verify the rendered MP4 plays correctly in VLC or similar player
- [ ] Verify the clip is actually 9:16 format

---

## Milestone 08 — Candidate Review

**Status:** Not Started
**Git commit:** `candidate-review-complete`

### Goal

Build a UI that shows all clip candidates for a video, allowing the user to approve, reject, or edit them before any clips are rendered.

### Deliverables

**Domain:**
- [ ] Candidate status workflow: `discovered` → `approved` / `rejected`
- [ ] `CandidateService` for status transitions and editing
- [ ] Update candidate fields (timestamps, hook, score)

**API:**
- [ ] `GET /api/videos/{id}/candidates` — list candidates for a video
- [ ] `GET /api/candidates/{id}` — get candidate details
- [ ] `PATCH /api/candidates/{id}` — edit candidate (timestamps, hook, summary)
- [ ] `POST /api/candidates/{id}/approve` — approve candidate
- [ ] `POST /api/candidates/{id}/reject` — reject candidate

**Frontend:**
- [ ] Candidate list view with scores, hooks, timestamps
- [ ] Candidate detail/edit view
- [ ] Approve/reject buttons
- [ ] Inline editing of timestamps, hook, summary
- [ ] Visual indication of candidate status

**Testing:**
- [ ] Unit tests for CandidateService state transitions
- [ ] API tests for all candidate endpoints
- [ ] Frontend component tests for review UI

### Acceptance Criteria

- [ ] All candidates for a video are displayed with scores and metadata
- [ ] Users can approve or reject candidates
- [ ] Users can edit timestamps, hook text, and summary
- [ ] Status transitions are enforced (no invalid states)
- [ ] No clips are rendered without explicit approval
- [ ] All tests pass

---

## Milestone 09 — Short Generation

**Status:** Not Started
**Git commit:** `short-generation-complete`

### Goal

Take an approved clip candidate and generate a final 9:16 MP4 video. This separates the approval decision from the rendering work.

### Deliverables

**Domain:**
- [ ] `ClipGenerationService` orchestrating the render pipeline
- [ ] `generated_clips` table (id, candidate_id, file_path, duration, format, resolution, status)
- [ ] `GeneratedClipRepository`

**Pipeline:**
- [ ] Approved candidate → cut segment → convert to 9:16 → save
- [ ] Simple center-crop/scaling strategy (no face tracking)
- [ ] Configurable output resolution (1080x1920 default)
- [ ] Configurable output codec and quality

**API:**
- [ ] `POST /api/candidates/{id}/generate` — trigger clip generation
- [ ] `GET /api/clips/{id}` — get clip details and download link
- [ ] `GET /api/clips/{id}/download` — stream the video file

**Frontend:**
- [ ] "Generate Clip" button on approved candidates
- [ ] Clip generation progress indication
- [ ] Clip preview/playback in the UI

**Testing:**
- [ ] Unit tests for ClipGenerationService
- [ ] Integration test with a sample approved candidate
- [ ] Verify output video format and dimensions
- [ ] API tests for generation and download endpoints

### Acceptance Criteria

- [ ] Approved candidates can be rendered to 9:16 MP4
- [ ] Output video plays correctly
- [ ] Original source video is never modified
- [ ] Generated clips stored in `media/clips/`
- [ ] Clip metadata (duration, resolution) is accurate
- [ ] All tests pass

---

## Milestone 10 — Captions

**Status:** Not Started
**Git commit:** `captions-complete`

### Goal

Generate caption files from the timestamped transcript and burn them into rendered clips.

### Deliverables

**Domain:**
- [ ] `CaptionService` for subtitle generation and rendering
- [ ] `captions` table (id, clip_id, file_path, format, style, status)
- [ ] `CaptionRepository`

**Pipeline:**
- [ ] Map transcript segments to clip-relative timestamps
- [ ] Generate SRT file from segments
- [ ] Burn captions into clip video using FFmpeg
- [ ] Clean, readable default caption style (font, size, position, color)

**API:**
- [ ] `POST /api/clips/{id}/captions` — generate captions for a clip
- [ ] `GET /api/clips/{id}/captions` — get caption details
- [ ] `GET /api/clips/{id}/captions/download` — download SRT file

**Frontend:**
- [ ] Caption generation trigger
- [ ] Caption preview (text content)
- [ ] Caption style options (basic: font size, position)

**Testing:**
- [ ] Unit tests for timestamp remapping (global → clip-relative)
- [ ] Unit tests for SRT generation
- [ ] Integration test for caption burning via FFmpeg
- [ ] Verify burned-in captions are readable and correctly positioned

### Acceptance Criteria

- [ ] Captions generated from transcript segments
- [ ] Clip-relative timestamps are accurate
- [ ] SRT file is valid and downloadable
- [ ] Burned-in captions appear on the rendered video
- [ ] Default style is clean and readable
- [ ] All tests pass

---

## Milestone 11 — Content Intelligence

**Status:** Not Started
**Git commit:** `content-intelligence-complete`

### Goal

Generate complete content metadata (hooks, titles, descriptions, hashtags) for approved clips using Ollama. Allow manual editing of all generated content.

### Deliverables

**Domain:**
- [ ] `ContentMetadata` model with all fields:
  - primary_hook, alternative_hooks (list)
  - title, alternative_titles (list)
  - description
  - social_caption
  - cta (call to action)
  - hashtags (list)
  - thumbnail_text
  - content_category
- [ ] `content_metadata` table
- [ ] `ContentMetadataService` using Ollama
- [ ] System prompt stored in `ai/prompts/content_generation.md`

**API:**
- [ ] `POST /api/clips/{id}/metadata` — generate metadata
- [ ] `GET /api/clips/{id}/metadata` — get metadata
- [ ] `PATCH /api/clips/{id}/metadata` — edit metadata fields

**Frontend:**
- [ ] Metadata generation trigger
- [ ] Metadata editing form for all fields
- [ ] Hook alternatives display
- [ ] Title alternatives display
- [ ] Hashtag editor

**Testing:**
- [ ] Unit tests for metadata schema validation
- [ ] Mocked Ollama tests for metadata generation
- [ ] API tests for generation and editing
- [ ] Test that all fields are editable

### Acceptance Criteria

- [ ] Metadata generated for approved clips via Ollama
- [ ] All metadata fields populated with relevant content
- [ ] User can edit every field manually
- [ ] Generated metadata stored separately from video files
- [ ] Multiple alternatives provided for hooks and titles
- [ ] All tests pass

---

## Milestone 12 — Product Dashboard

**Status:** Not Started
**Git commit:** `dashboard-complete`

### Goal

Build the complete Clipit.ai user experience with navigation, project status views, and the full processing pipeline visible in the UI.

### Deliverables

**Navigation:**
- [ ] Dashboard (home)
- [ ] Projects list
- [ ] Project detail with processing pipeline view
- [ ] Clip Candidates view
- [ ] Generated Clips view
- [ ] Settings

**Project Page:**
- [ ] Visual pipeline status:
  ```
  Source → Uploaded → Transcribed → Analyzed → Candidates → Approved → Rendered → Ready
  ```
- [ ] Each step shows real status (not fake progress)
- [ ] Clickable steps that navigate to relevant detail views

**Dashboard:**
- [ ] Recent projects
- [ ] Active processing jobs
- [ ] Quick stats (projects, videos, clips generated)

**Frontend:**
- [ ] Responsive layout with sidebar navigation
- [ ] Consistent page structure across views
- [ ] Loading states, error states, empty states on all pages

**Testing:**
- [ ] Frontend navigation tests
- [ ] Dashboard data display tests
- [ ] Pipeline status accuracy tests

### Acceptance Criteria

- [ ] All navigation routes work correctly
- [ ] Project page shows accurate processing pipeline status
- [ ] No fake progress — all status reflects real system state
- [ ] All pages handle loading, error, and empty states
- [ ] Consistent UI across the application
- [ ] All tests pass

---

## Milestone 13 — Local Job Processing

**Status:** Not Started
**Git commit:** `job-system-complete`

### Goal

Introduce a background job system for long-running operations. Jobs have explicit states, error handling, and status reporting.

### Deliverables

**Domain:**
- [ ] `Job` model (id, type, status, progress, error, entity_id, entity_type, created_at, updated_at, completed_at)
- [ ] `jobs` table
- [ ] `JobRepository`
- [ ] `JobService` for lifecycle management

**Worker:**
- [ ] Background worker thread that polls for pending jobs
- [ ] Job types: `audio_extraction`, `transcription`, `ai_analysis`, `clip_generation`, `caption_rendering`, `metadata_generation`
- [ ] Job execution maps to existing services
- [ ] Worker health check and restart capability
- [ ] Job timeout handling
- [ ] Failed job error recording

**API:**
- [ ] `GET /api/jobs` — list jobs (with filters)
- [ ] `GET /api/jobs/{id}` — get job details
- [ ] `GET /api/jobs/active` — get currently running jobs

**Frontend:**
- [ ] Job status display on relevant pages
- [ ] Active jobs indicator
- [ ] Job error display

**Integration:**
- [ ] All existing processing steps now run as jobs
- [ ] Job status updates reflected in real-time (polling)

**Testing:**
- [ ] Unit tests for job state machine
- [ ] Integration tests for worker execution
- [ ] API tests for job endpoints
- [ ] Test job failure handling and error recording
- [ ] Test job timeout behavior

### Acceptance Criteria

- [ ] Long-running operations execute as background jobs
- [ ] Job states are accurate: pending → processing → completed / failed
- [ ] Failed jobs record error messages
- [ ] Jobs have timeout handling
- [ ] Frontend shows accurate job status
- [ ] Worker handles job failures without crashing
- [ ] All tests pass

---

## Milestone 14 — ClipIt.ai Agent

**Status:** Not Started
**Git commit:** `agent-complete`

### Goal

Build an orchestration agent that controls existing services through defined tool calls. The agent accepts natural-language commands and executes multi-step workflows.

### Deliverables

**Agent Core:**
- [ ] `AgentService` accepting natural-language commands
- [ ] Tool registry with controlled tool definitions
- [ ] Tool execution layer (never bypasses validation)
- [ ] Conversation/context management

**Tools:**
- [ ] `inspect_project` — get project status and contents
- [ ] `inspect_video` — get video details and metadata
- [ ] `transcribe_video` — trigger transcription if not done
- [ ] `analyze_transcript` — trigger AI analysis
- [ ] `find_candidates` — discover clip candidates
- [ ] `score_candidates` — score existing candidates
- [ ] `render_clip` — render an approved candidate
- [ ] `generate_captions` — add captions to a clip
- [ ] `generate_metadata` — generate content metadata
- [ ] `get_processing_status` — check current state

**Workflows:**
- [ ] "Process this video and find my five strongest Shorts"
- [ ] "Generate the three clips I approved"
- [ ] "Show me the status of all my projects"

**API:**
- [ ] `POST /api/agent/chat` — send command to agent
- [ ] `GET /api/agent/history` — get conversation history
- [ ] `GET /api/agent/status` — agent state

**Frontend:**
- [ ] Chat interface for agent interaction
- [ ] Agent action log (what tools were called, results)
- [ ] Stop/pause capability

**Constraints:**
- Agent cannot access arbitrary filesystem locations
- Agent cannot manipulate SQLite directly
- Agent cannot construct unrestricted shell commands
- Agent cannot bypass validation
- Agent stops for human approval at defined checkpoints

**Testing:**
- [ ] Unit tests for tool definitions and execution
- [ ] Integration tests for agent workflows (mocked services)
- [ ] Test agent stops for approval at checkpoints
- [ ] Test agent cannot bypass validation

### Acceptance Criteria

- [ ] Agent accepts natural-language commands
- [ ] Agent executes multi-step workflows using defined tools
- [ ] Agent stops for human approval when required
- [ ] Agent cannot bypass validation or access unauthorized resources
- [ ] Agent action log is visible in the UI
- [ ] All tests pass

---

## Milestone 15 — Feedback System

**Status:** Not Started
**Git commit:** `feedback-system-complete`

### Goal

Record user decisions (approvals, rejections, edits) to build a dataset for improving clip scoring over time. This is data collection, not machine learning (yet).

### Deliverables

**Domain:**
- [ ] `feedback_events` table (event_type, entity_id, entity_type, details, timestamp)
- [ ] `FeedbackService` recording events
- [ ] Event types: `candidate_approved`, `candidate_rejected`, `timestamp_edited`, `hook_edited`, `metadata_edited`, `clip_exported`

**API:**
- [ ] Automatic feedback recording on candidate actions
- [ ] `GET /api/feedback` — query feedback events

**Frontend:**
- [ ] Implicit — feedback recorded on existing interactions
- [ ] Optional: feedback summary view for power users

**Testing:**
- [ ] Unit tests for feedback recording
- [ ] Integration tests for event capture on candidate actions

### Acceptance Criteria

- [ ] All user decisions are recorded with timestamps
- [ ] Feedback events are queryable via API
- [ ] No performance impact on existing operations
- [ ] Data structure supports future ML analysis
- [ ] All tests pass

---

## Milestone 16 — Advanced Intelligence

**Status:** Not Started
**Git commit:** `advanced-intelligence-complete`

### Goal

Add modular intelligence capabilities beyond basic transcription and analysis. These enhance clip discovery and scoring.

### Deliverables

**Capabilities (each is a module):**
- [ ] Scene detection (shot boundaries)
- [ ] Face detection (prominent speakers)
- [ ] Speaker detection (diarization)
- [ ] Silence detection (gaps and pacing)
- [ ] Speech-rate analysis
- [ ] Audio intensity analysis
- [ ] Visual activity scoring

**Integration:**
- [ ] Each module adds metadata to `ClipCandidate`
- [ ] Enhanced scoring combines all signals
- [ ] Modules are independently enabled/disabled
- [ ] Modules run as separate jobs

**Testing:**
- [ ] Unit tests for each detection module
- [ ] Integration tests with sample media
- [ ] Test that enhanced scoring improves over baseline

### Acceptance Criteria

- [ ] Each module works independently
- [ ] Enhanced scoring uses all available signals
- [ ] Modules are configurable and optional
- [ ] No regression in existing clip discovery
- [ ] All tests pass

---

## Milestone 17 — Analytics

**Status:** Not Started
**Git commit:** `analytics-complete`

### Goal

Track generated clips and their performance when published. This only becomes meaningful after publishing integrations exist.

### Deliverables

**Domain:**
- [ ] `clip_analytics` table (clip_id, platform, views, retention, engagement, recorded_at)
- [ ] `AnalyticsService` for data collection and aggregation

**Frontend:**
- [ ] Analytics dashboard showing clip performance
- [ ] Time-series charts where applicable

**Note:** Without publishing integrations, analytics will be manually entered or imported from CSV files.

### Acceptance Criteria

- [ ] Analytics data can be recorded and queried
- [ ] Dashboard displays meaningful visualizations
- [ ] Data structure supports future automated collection
- [ ] All tests pass

---

## Milestone 18 — Publishing

**Status:** Not Started
**Git commit:** `publishing-complete`

### Goal

Integrate with social media platforms for publishing generated clips. Requires explicit user authorization.

### Deliverables

**Integrations:**
- [ ] YouTube Shorts API integration
- [ ] Instagram Reels API integration
- [ ] TikTok API integration

**Features:**
- [ ] OAuth authorization flow for each platform
- [ ] Clip upload with metadata
- [ ] Publishing status tracking
- [ ] Scheduling (optional, future)

**Constraints:**
- No autonomous publishing — every publish requires explicit user confirmation
- User can revoke authorization at any time
- Platform rate limits respected

**Testing:**
- [ ] Unit tests for upload logic (mocked API)
- [ ] Integration tests with sandbox/test environments where available
- [ ] Test authorization flow

### Acceptance Criteria

- [ ] User can authorize each platform
- [ ] Clips can be published with metadata
- [ ] Publishing requires explicit confirmation
- [ ] Status tracked per platform
- [ ] User can revoke authorization
- [ ] All tests pass

---

## Quality Gates

Every milestone must pass these gates before being considered complete:

1. **All tests pass** — no skipped tests, no known failures
2. **Build succeeds** — no TypeScript or Python compilation errors
3. **Type checking passes** — `tsc --noEmit` for frontend, `mypy` or equivalent for backend
4. **Linting passes** — no new warnings or errors
5. **Manual verification** — core functionality works as demonstrated
6. **No regressions** — existing functionality not broken
7. **Clean git state** — single commit per milestone with descriptive message

---

## Git Commit Convention

Each milestone produces a single commit (or a small series) with a descriptive message following this pattern:

```
[milestone-name]-complete

Brief description of what was implemented.

Key changes:
- List of significant additions or changes

🤖 Generated with Codebuff
Co-Authored-By: Codebuff <noreply@codebuff.com>
```

---

## Risk Register

| Risk | Milestone | Likelihood | Impact | Mitigation |
|------|-----------|------------|--------|------------|
| FFmpeg not installed on Windows | 05 | Medium | High | Detect on startup; document install steps clearly |
| Ollama model quality insufficient | 07 | Medium | Medium | Test with multiple models; document trade-offs |
| Whisper model download fails | 06 | Low | Medium | Manual download instructions; retry logic |
| SQLite performance limits | 12+ | Low | Low | Monitor; migrate to PostgreSQL only if proven necessary |
| Windows path issues | 05+ | Medium | Medium | Use pathlib consistently; test on Windows |
| Large video files exhaust disk | 04+ | Medium | Medium | Report disk usage; configurable size limits |
| Agent complexity exceeds MVP needs | 14 | Medium | Medium | Build only after all services proven stable |
| Frontend/backend version drift | 02+ | Low | Medium | Type-safe API contracts; integration tests |

---

## Next Steps

After completing Milestone 01 (this document), proceed to Milestone 02: Development Foundation.

Milestone 02 will:
1. Initialize the Next.js frontend project
2. Initialize the FastAPI backend project
3. Set up configuration management
4. Implement a health check endpoint
5. Verify frontend can communicate with backend
6. Set up testing infrastructure

This foundation enables all subsequent milestones.

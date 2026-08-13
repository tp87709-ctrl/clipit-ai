# Clipit.ai Architecture Document

## Overview

Clipit.ai is a local-first AI content factory that turns long-form video into short-form content. The application runs entirely on the user's Windows PC without requiring cloud infrastructure, Redis, Kubernetes, or PostgreSQL.

## Core Architectural Principles

1. **Separation of concerns**: Frontend, backend, AI services, media processing, and database layers are strictly separated.
2. **No monolithic application**: Each component is independently deployable and testable.
3. **Local-first**: All processing happens locally on the user's machine. No data leaves the PC without explicit user consent.
4. **Minimal infrastructure**: No Redis, Kubernetes, cloud storage, or PostgreSQL during MVP. SQLite is the database.
5. **AI handles analysis and decisions**: LLMs process content, transcribe video, and generate insights.
6. **Deterministic tools for media**: FFmpeg performs video/audio operations reliably and predictably.
7. **Agent orchestrates tools**: A future AI agent coordinates subprocesses rather than containing all business logic.
8. **Human approval before final content**: Every piece of generated content requires human review before becoming final.
9. **Independently testable subsystems**: Each major component can be tested in isolation.
10. **Incremental build**: MVP implements a subset of features that can be expanded over time.

## Project Name

- **Application name**: Clipit.ai
- **Internal project name**: clipit-ai

## Directory Structure

```
clipit-ai/
├── architecture/          # Architecture documents and design decisions
├── backend/               # Python FastAPI backend
│   ├── api/               # API route handlers
│   ├── services/          # Business logic services
│   ├── ai/                # AI service integrations (Ollama, Whisper)
│   ├── media/             # FFmpeg wrapper utilities
│   ├── db/                # SQLite database operations
│   └── main.py            # Application entry point
├── frontend/              # Next.js TypeScript frontend
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components (shadcn/ui)
│   ├── lib/               # Utility functions and helpers
│   ├── hooks/             # Custom React hooks
│   └── styles/            # Tailwind CSS configuration
├── ai/                    # Local AI models and prompts
│   ├── models/            # Ollama model configurations
│   ├── prompts/           # System prompts for LLMs
│   └── transcriptions/    # Whisper model files
├── media/                 # Media processing files
│   ├── ffmpeg/            # FFmpeg binaries and presets
│   └── cache/             # Temporary media files
├── data/                  # SQLite database and data files
│   ├── clips.db           # Main database
│   └── exports/           # Exported short-form videos
├── tests/                 # Test suite
│   ├── backend/           # Backend unit and integration tests
│   ├── frontend/          # Frontend component tests
│   ├── ai/                # AI service tests
│   └── media/             # FFmpeg operation tests
├── scripts/               # Helper scripts for setup, build, deploy
├── .env.example           # Example environment variables
├── .gitignore             # Git ignore rules
├── pyproject.toml         # Python project configuration
├── package.json           # Node.js project configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project overview
```

## Component Responsibilities

### Frontend (Next.js + TypeScript + Tailwind CSS + shadcn/ui)

- **User interface**: Clean, creator-focused interface avoiding generic corporate dashboard styling
- **User interactions**: Video upload, project management, content review
- **State management**: Local state for uploads and projects; sync with backend API
- **Communication**: REST API calls to backend; WebSocket for real-time updates if needed
- **Responsiveness**: Fully responsive design for creator workflows

### Backend (Python FastAPI)

- **API layer**: REST endpoints for frontend communication
- **Orchestration**: Coordinates between AI services, media processing, and database
- **Authentication**: Simple local auth (MVP) or token-based system
- **File management**: Handles uploaded files, temporary storage, export paths
- **Database operations**: SQLite CRUD operations via SQLAlchemy or raw SQL

### AI Services (Ollama + Whisper)

- **Transcription**: Whisper models convert long-form video audio to text
- **Content analysis**: Ollama LLMs analyze transcripts for key moments, hooks, and scoring
- **Content generation**: LLMs generate captions, titles, descriptions, and clip summaries
- **Configurable**: Users can select different LLMs supported by Ollama
- **Local-only**: All AI processing happens on user's hardware; no cloud API calls

### Media Processing (FFmpeg)

- **Video trimming**: Extract clip segments based on timestamps
- **Format conversion**: Convert between video/audio formats
- **Resolution scaling**: Downscale for short-form platforms (TikTok, Reels, Shorts)
- **Audio extraction**: Extract audio for Whisper transcription
- **Thumbnail generation**: Create video thumbnails
- **CLI-only**: FFmpeg commands executed as subprocesses; no Python video libraries

### Database (SQLite)

- **Metadata storage**: Video files, transcriptions, clips, scores, user preferences
- **Simple schema**: Optimized for read/write performance on single-user local machine
- **Persistence**: File-based database that travels with the application
- **Backup**: Entire database file can be copied for backup purposes

## Communication Flow

### Video Processing Pipeline

1. **Upload**: User selects long-form video via frontend → POST `/api/videos/upload` → Backend saves file to `media/` directory
2. **Transcription**: Backend triggers Whisper via AI service → Transcription stored in SQLite
3. **Analysis**: Backend triggers Ollama LLM analysis → Key moments, hooks, scores stored in SQLite
4. **Clip discovery**: Backend determines clip timestamps → FFmpeg trims clips → Clips saved
5. **Scoring**: Backend calculates clip scores based on analysis → Prioritized list in UI
6. **Generation**: Backend triggers LLM for captions/titles/descriptions → Stored in SQLite
7. **Human review**: Frontend displays clips with AI-generated metadata → User approves/rejects
8. **Export**: User selects approved clips → FFmpeg generates final short-form videos → Exported

### API Communication

- **REST endpoints**: All frontend-backend communication via HTTP JSON API
- **Error handling**: Standardized error responses with meaningful messages
- **Validation**: Input validation on both frontend and backend
- **Status tracking**: Progress endpoints for long-running operations (transcription, generation)

### AI Agent System (Future)

- **Location**: `backend/ai/agent/` or separate `agent/` module
- **Responsibility**: Orchestrates the pipeline by deciding which tools to call next based on state
- **Pattern**: ReAct (Reasoning + Acting) or similar agent framework
- **Tools available**: Transcribe, analyze, clip, score, generate, export
- **Human-in-the-loop**: Agent never makes final decisions without human approval
- **State management**: Maintains pipeline state in SQLite; agent reads/writes state
- **Implementation**: Could use LangChain, AutoGen, or custom orchestrator (MVP: custom simple orchestrator)

## MVP Boundaries

### Included in MVP

1. **Video upload**: User can upload MP4/MKV long-form videos
2. **Local transcription**: Whisper model transcribes audio to text (English language focus)
3. **Key moment detection**: LLM identifies potential clip moments from transcript
4. **Clip generation**: FFmpeg trims clips based on detected timestamps
5. **Basic scoring**: Simple AI scoring of clip potential
6. **Caption generation**: LLM generates captions for approved clips
7. **Title/description generation**: LLM creates titles and descriptions
8. **Human review interface**: UI for approving/rejecting AI-generated content
9. **Export**: Export approved clips as separate video files
10. **SQLite database**: Store all metadata, transcriptions, and user decisions

### Excluded from MVP

1. **Multiple LLM support**: Single configurable Ollama model
2. **Multi-language transcription**: English only
3. **Advanced editing**: No timeline editing within clips
4. **Publishing**: No social media platform integration
5. **Analytics**: No usage analytics or tracking
6. **User accounts**: Single-user local installation only
7. **Cloud sync**: No synchronization across devices
8. **Batch processing**: One video at a time
9. **Custom prompts**: Fixed prompt templates only
10. **Web interface polish**: Functional but minimal UI

## Testing Strategy

### Test Types

1. **Unit tests**: Individual functions and methods (backend services, FFmpeg wrappers)
2. **Integration tests**: End-to-end pipeline testing (upload → transcription → clip generation)
3. **API tests**: REST endpoint functionality and error handling
4. **FFmpeg tests**: Video processing operations produce expected output
5. **AI output tests**: LLM output format and structure validation

### Test Organization

```
tests/
├── unit/                  # Unit tests for individual functions
├── integration/           # Integration tests for pipelines
├── fixtures/              # Test data (sample videos, transcripts, prompts)
└── e2e/                   # End-to-end tests (if applicable)
```

### Testing Approach

- **Backend**: pytest with unittest.mock for AI service dependencies
- **FFmpeg**: Test with sample videos; verify output format and duration
- **AI**: Use recorded LLM responses for format validation (avoid expensive API calls in tests)
- **Frontend**: React Testing Library for component tests
- **Continuous**: Pre-commit hooks run linting and unit tests

### Quality Gates

- All PRs must pass unit and integration tests
- FFmpeg operations verified with sample media
- No breaking changes to API contracts
- TypeScript types compile without errors
- SQLite schema migrations tested for upgrade paths

## Environment & Dependencies

### Frontend Dependencies

- next@latest
- react@latest, react-dom@latest
- typescript
- tailwindcss
- @shadcn/ui
- date-fns, class-variance-authority (utility libraries)

### Backend Dependencies

- fastapi
- uvicorn
- sqlalchemy (for SQLite)
- whisper (faster-whisper for local processing)
- ollama-python (or subprocess to ollama CLI)
- ffmpeg-python (wrapper for FFmpeg)
- pydantic (data validation)
- pytest (testing)

### AI Models

- Whisper model (base or small for speed)
- Ollama LLM (user-configurable, recommended: llama3.2 or phi3)

### Media

- FFmpeg binary (user-installed or bundled)
- Supported input: MP4, MKV, MOV
- Output: MP4 for short-form clips

## Future Extensions

1. **Multi-user**: Add authentication and user profiles
2. **Cloud backup**: Optional encrypted cloud backup of database and exports
3. **Plugin system**: Extensible prompt and workflow plugins
4. **Batch processing**: Process multiple videos simultaneously
5. **Platform optimization**: Automatic aspect ratio adjustment for TikTok, Reels, Shorts
6. **Collaboration**: Shared projects with role-based access
7. **Advanced AI**: Swap between different LLMs for different tasks
8. **Audio enhancement**: Noise reduction, voice isolation
9. **Subtitle styling**: Advanced caption positioning and styling
10. **Analytics dashboard**: View performance of published shorts
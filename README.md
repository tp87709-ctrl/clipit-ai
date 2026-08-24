# Clipit.ai

**Local-first AI content factory.**

Turn long-form video into short-form clips using local AI and media processing. No cloud infrastructure required. Everything runs on your machine.

## What It Does

```
Long-Form Video → Transcription → AI Analysis → Clip Discovery → Clip Scoring
    → Human Review → Short-Form Video → Captions → Hooks/Titles/Descriptions → Export
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI |
| Database | SQLite |
| AI | Ollama (local LLM), Whisper (transcription) |
| Media | FFmpeg |
| Storage | Local filesystem |

## Project Structure

```
clipit-ai/
├── frontend/              # Next.js frontend
├── backend/               # FastAPI backend
├── media/                 # Runtime media storage
│   ├── uploads/           # Original videos (never modified)
│   ├── audio/             # Extracted audio
│   ├── clips/             # Generated clip segments
│   ├── captions/          # Caption files
│   └── exports/           # Final rendered exports
├── docs/                  # Design documents
├── scripts/               # Utility scripts
├── ARCHITECTURE.md        # System architecture
├── DEVELOPMENT_PLAN.md    # Milestone roadmap
└── .env.example           # Configuration template
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- FFmpeg (on PATH or configured via `FFMPEG_PATH`)
- Ollama (running locally with at least one model pulled)
- Whisper Python package (installed via pip)

## Quickstart

```bash
# 1. Clone the repository
git clone <repo-url>
cd clipit-ai

# 2. Set up environment configuration
cp .env.example .env
# Edit .env with your settings

# 3. Set up the backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# 4. Set up the frontend (in a new terminal)
cd frontend
npm install
npm run dev

# 5. Open http://localhost:3000
```

## Configuration

All configuration is managed through environment variables. Copy `.env.example` to `.env` and adjust as needed.

See `.env.example` for all available configuration options.

## Development

```bash
# Run backend tests
cd backend
pytest

# Run frontend tests
cd frontend
npm test

# Type check frontend
cd frontend
npx tsc --noEmit
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and design decisions
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) — Milestone roadmap and development plan
- [docs/](./docs/) — Additional documentation and ADRs

## License

Private — All rights reserved.

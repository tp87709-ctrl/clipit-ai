"""Reusable FFmpeg service — all media operations behind a clean interface."""

import json
import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


@dataclass
class MediaMetadata:
    """Structured metadata from a media file."""

    duration: float  # seconds
    width: int
    height: int
    fps: float
    video_codec: str
    audio_codec: str
    file_size: int  # bytes


class MediaService:
    """Wraps FFmpeg operations behind a parameterized interface.

    Every method builds an argument list (never a shell string) so there is
    no injection risk from file paths or metadata values.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._ffmpeg = self.settings.ffmpeg_path
        self._ffprobe = self._derive_ffprobe(self._ffmpeg)

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    def detect_ffmpeg(self) -> dict[str, str | bool]:
        """Return FFmpeg version info, or raise if not found."""
        try:
            result = subprocess.run(
                [self._ffmpeg, "-version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg returned exit code {result.returncode}")

            version_line = result.stdout.split("\n", 1)[0]
            return {"available": True, "path": self._ffmpeg, "version": version_line}
        except FileNotFoundError:
            raise RuntimeError(
                f"FFmpeg not found at '{self._ffmpeg}'. "
                "Install FFmpeg and set FFMPEG_PATH in .env"
            )

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------

    def get_metadata(self, file_path: str | Path) -> MediaMetadata:
        """Extract duration, resolution, FPS, codecs, and file size."""
        file_path = self._resolve_path(file_path)
        self._assert_file(file_path)

        file_size = file_path.stat().st_size

        # Use ffprobe JSON output — no string parsing, structured data
        probe_args = [
            self._ffprobe,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(file_path),
        ]

        result = subprocess.run(
            probe_args,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(f"ffprobe failed: {result.stderr[:500]}")

        probe = json.loads(result.stdout)
        video_stream = self._find_stream(probe["streams"], "video")
        audio_stream = self._find_stream(probe["streams"], "audio")

        duration = float(probe["format"].get("duration", 0))
        width = int(video_stream.get("width", 0)) if video_stream else 0
        height = int(video_stream.get("height", 0)) if video_stream else 0
        fps = self._parse_fps(video_stream.get("r_frame_rate", "0/1")) if video_stream else 0.0
        video_codec = video_stream.get("codec_name", "") if video_stream else ""
        audio_codec = audio_stream.get("codec_name", "") if audio_stream else ""

        return MediaMetadata(
            duration=duration,
            width=width,
            height=height,
            fps=fps,
            video_codec=video_codec,
            audio_codec=audio_codec,
            file_size=file_size,
        )

    # ------------------------------------------------------------------
    # Audio extraction
    # ------------------------------------------------------------------

    def extract_audio(
        self,
        video_path: str | Path,
        output_path: str | Path,
    ) -> Path:
        """Extract audio track from a video file.

        Returns the resolved output path. Uses AAC encoding for broad compatibility.
        """
        video_path = self._resolve_path(video_path)
        output_path = self._resolve_path(output_path)
        self._assert_file(video_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            self._ffmpeg,
            "-y",  # overwrite output
            "-i", str(video_path),
            "-vn",  # no video
            "-acodec", "aac",
            "-b:a", "128k",
            str(output_path),
        ]
        self._run_ffmpeg(cmd, "audio extraction")

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("Audio extraction produced empty output")

        return output_path

    # ------------------------------------------------------------------
    # Segment cutting
    # ------------------------------------------------------------------

    def cut_segment(
        self,
        video_path: str | Path,
        start: float,
        end: float,
        output_path: str | Path,
    ) -> Path:
        """Cut a time range [start, end] from a video.

        Start/end are in seconds (float). Re-encodes for frame-accurate cuts.
        Stream copy is avoided because -ss before -i seeks to the nearest
        keyframe, not the requested timestamp.
        """
        video_path = self._resolve_path(video_path)
        output_path = self._resolve_path(output_path)
        self._assert_file(video_path)

        if end <= start:
            raise ValueError(f"end ({end}) must be after start ({start})")

        duration = end - start
        output_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            self._ffmpeg,
            "-y",
            "-i", str(video_path),
            "-ss", str(start),
            "-t", str(duration),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-c:a", "aac",
            "-b:a", "128k",
            str(output_path),
        ]
        self._run_ffmpeg(cmd, "segment cutting")

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("Segment cutting produced empty output")

        return output_path

    # ------------------------------------------------------------------
    # Vertical conversion (9:16)
    # ------------------------------------------------------------------

    def convert_to_vertical(
        self,
        input_path: str | Path,
        output_path: str | Path,
        width: int = 1080,
        height: int = 1920,
    ) -> Path:
        """Convert video to vertical 9:16 format.

        Strategy: scale to fill height, crop to width from center.
        Falls back to padding with black bars if the source is narrower
        than the target aspect.
        """
        input_path = self._resolve_path(input_path)
        output_path = self._resolve_path(output_path)
        self._assert_file(input_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Get source dimensions to decide strategy
        meta = self.get_metadata(input_path)
        if meta.width == 0 or meta.height == 0:
            raise RuntimeError("Cannot read source dimensions")

        source_aspect = meta.width / meta.height
        target_aspect = width / height

        if source_aspect > target_aspect:
            # Source is wider than target — crop from center
            # Scale to fill height, then crop to target width
            scale_filter = (
                f"scale={width}:{height}:force_original_aspect_ratio=increase,"
                f"crop={width}:{height}"
            )
        else:
            # Source is taller or same — pad with black bars
            scale_filter = (
                f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black"
            )

        cmd = [
            self._ffmpeg,
            "-y",
            "-i", str(input_path),
            "-vf", scale_filter,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            str(output_path),
        ]
        self._run_ffmpeg(cmd, "vertical conversion")

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise RuntimeError("Vertical conversion produced empty output")

        return output_path

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _derive_ffprobe(ffmpeg_path: str) -> str:
        """Derive ffprobe path from ffmpeg path.

        Replaces only the final filename component, not directory names.
        E.g. 'E:/ffmpeg/bin/ffmpeg.exe' → 'E:/ffmpeg/bin/ffprobe.exe'
        'ffmpeg' → 'ffprobe'
        """
        p = Path(ffmpeg_path)
        if p.stem == "ffmpeg":
            return str(p.parent / ("ffprobe" + p.suffix))
        # Fallback: same directory, try 'ffprobe'
        if str(p.parent) != ".":
            return str(p.parent / "ffprobe")
        return "ffprobe"

    def _resolve_path(self, path: str | Path) -> Path:
        """Resolve a path — project-relative paths start from PROJECT_ROOT."""
        p = Path(path)
        if p.is_absolute():
            return p
        return (PROJECT_ROOT / p).resolve()

    @staticmethod
    def _assert_file(path: Path) -> None:
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        if not path.is_file():
            raise ValueError(f"Not a file: {path}")

    @staticmethod
    def _find_stream(streams: list[dict], codec_type: str) -> dict | None:
        """Find the first stream of a given codec_type."""
        for s in streams:
            if s.get("codec_type") == codec_type:
                return s
        return None

    @staticmethod
    def _parse_fps(fps_str: str) -> float:
        """Parse a fractional FPS string like '30000/1001'."""
        try:
            if "/" in fps_str:
                num, den = fps_str.split("/", 1)
                return float(num) / float(den) if float(den) != 0 else 0.0
            return float(fps_str)
        except (ValueError, ZeroDivisionError):
            return 0.0

    @staticmethod
    def _run_ffmpeg(cmd: list[str], operation: str) -> None:
        """Execute an FFmpeg command and raise on failure."""
        logger.info(f"Running {operation}: {' '.join(cmd[:4])}...")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            stderr_tail = result.stderr[-1000:] if result.stderr else "(no output)"
            raise RuntimeError(f"FFmpeg {operation} failed (exit {result.returncode}): {stderr_tail}")
        logger.info(f"{operation} completed successfully")

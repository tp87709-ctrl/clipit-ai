"""Integration tests for MediaService — uses real FFmpeg with generated sample media."""

import subprocess
from pathlib import Path

import pytest

from app.media.ffmpeg_service import MediaService, PROJECT_ROOT


def _ffmpeg_available() -> bool:
    """Check if FFmpeg is available."""
    try:
        r = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        return r.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


pytestmark = pytest.mark.skipif(
    not _ffmpeg_available(),
    reason="FFmpeg not installed",
)


@pytest.fixture(scope="module")
def sample_video(tmp_path_factory) -> Path:
    """Generate a small 5-second 640x480 test video with audio."""
    tmp_dir = tmp_path_factory.mktemp("media")
    video_path = tmp_dir / "sample.mp4"

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "color=c=blue:s=640x480:d=5:r=30",
        "-f", "lavfi",
        "-i", "sine=frequency=440:duration=5",
        "-c:v", "libx264", "-preset", "ultrafast",
        "-c:a", "aac",
        "-shortest",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f"Failed to generate sample video: {result.stderr[:500]}"
    return video_path


@pytest.fixture(scope="module")
def wide_video(tmp_path_factory) -> Path:
    """Generate a 5-second 1920x1080 (16:9) video."""
    tmp_dir = tmp_path_factory.mktemp("wide")
    video_path = tmp_dir / "wide.mp4"

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "color=c=green:s=1920x1080:d=5:r=30",
        "-f", "lavfi",
        "-i", "sine=frequency=880:duration=5",
        "-c:v", "libx264", "-preset", "ultrafast",
        "-c:a", "aac",
        "-shortest",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f"Failed to generate wide video: {result.stderr[:500]}"
    return video_path


@pytest.fixture(scope="module")
def tall_video(tmp_path_factory) -> Path:
    """Generate a 5-second 480x640 (3:4) video."""
    tmp_dir = tmp_path_factory.mktemp("tall")
    video_path = tmp_dir / "tall.mp4"

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", "color=c=red:s=480x640:d=5:r=30",
        "-f", "lavfi",
        "-i", "sine=frequency=220:duration=5",
        "-c:v", "libx264", "-preset", "ultrafast",
        "-c:a", "aac",
        "-shortest",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f"Failed to generate tall video: {result.stderr[:500]}"
    return video_path


class TestDetectFfmpegIntegration:
    def test_detect(self):
        svc = MediaService()
        info = svc.detect_ffmpeg()
        assert info["available"] is True
        assert "ffmpeg" in info["version"].lower()


class TestMetadataIntegration:
    def test_metadata_sample_video(self, sample_video):
        svc = MediaService()
        meta = svc.get_metadata(sample_video)

        assert meta.duration == pytest.approx(5.0, abs=0.5)
        assert meta.width == 640
        assert meta.height == 480
        assert meta.fps == pytest.approx(30.0, abs=1.0)
        assert meta.video_codec == "h264"
        assert meta.audio_codec == "aac"
        assert meta.file_size > 0

    def test_metadata_wide_video(self, wide_video):
        svc = MediaService()
        meta = svc.get_metadata(wide_video)
        assert meta.width == 1920
        assert meta.height == 1080

    def test_metadata_nonexistent_file(self):
        svc = MediaService()
        with pytest.raises(FileNotFoundError):
            svc.get_metadata("/nonexistent/video.mp4")


class TestExtractAudioIntegration:
    def test_extract_audio(self, sample_video, tmp_path):
        svc = MediaService()
        output = tmp_path / "extracted.m4a"

        result = svc.extract_audio(sample_video, output)

        assert result.exists()
        assert result.stat().st_size > 0

        # Verify it's a valid audio file
        meta = svc.get_metadata(result)
        assert meta.audio_codec != ""
        assert meta.width == 0  # no video stream
        assert meta.height == 0


class TestCutSegmentIntegration:
    def test_cut_middle(self, sample_video, tmp_path):
        """Cut seconds 1-3 from a 5-second video."""
        svc = MediaService()
        output = tmp_path / "cut.mp4"

        result = svc.cut_segment(sample_video, start=1.0, end=3.0, output_path=output)

        assert result.exists()
        assert result.stat().st_size > 0

        meta = svc.get_metadata(result)
        assert meta.duration == pytest.approx(2.0, abs=0.5)

    def test_cut_from_start(self, sample_video, tmp_path):
        """Cut first 2 seconds."""
        svc = MediaService()
        output = tmp_path / "cut_start.mp4"

        result = svc.cut_segment(sample_video, start=0.0, end=2.0, output_path=output)
        meta = svc.get_metadata(result)
        assert meta.duration == pytest.approx(2.0, abs=0.5)

    def test_cut_to_end(self, sample_video, tmp_path):
        """Cut last 2 seconds."""
        svc = MediaService()
        output = tmp_path / "cut_end.mp4"

        result = svc.cut_segment(sample_video, start=3.0, end=5.0, output_path=output)
        meta = svc.get_metadata(result)
        assert meta.duration == pytest.approx(2.0, abs=1.0)


class TestConvertToVerticalIntegration:
    def test_wide_to_vertical(self, wide_video, tmp_path):
        """Convert 1920x1080 (16:9) to 1080x1920 (9:16) via crop."""
        svc = MediaService()
        output = tmp_path / "vertical.mp4"

        result = svc.convert_to_vertical(wide_video, output)

        assert result.exists()
        assert result.stat().st_size > 0

        meta = svc.get_metadata(result)
        assert meta.width == 1080
        assert meta.height == 1920
        assert meta.duration == pytest.approx(5.0, abs=1.0)

    def test_tall_to_vertical(self, tall_video, tmp_path):
        """Convert 480x640 (3:4) to 1080x1920 (9:16) via pad."""
        svc = MediaService()
        output = tmp_path / "vertical_padded.mp4"

        result = svc.convert_to_vertical(tall_video, output)

        assert result.exists()
        assert result.stat().st_size > 0

        meta = svc.get_metadata(result)
        assert meta.width == 1080
        assert meta.height == 1920

    def test_already_vertical(self, tmp_path_factory):
        """A 9:16 source should pass through without issues."""
        src = tmp_path_factory.mktemp("vert") / "vert.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", "color=c=purple:s=1080x1920:d=2:r=30",
            "-f", "lavfi",
            "-i", "sine=frequency=600:duration=2",
            "-c:v", "libx264", "-preset", "ultrafast",
            "-c:a", "aac", "-shortest",
            str(src),
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        assert src.exists()

        svc = MediaService()
        output = tmp_path_factory.mktemp("out") / "out.mp4"
        result = svc.convert_to_vertical(src, output)

        meta = svc.get_metadata(result)
        assert meta.width == 1080
        assert meta.height == 1920

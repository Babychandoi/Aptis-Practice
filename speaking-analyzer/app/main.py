from __future__ import annotations

import math
import os
import re
import subprocess
import tempfile
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import librosa
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel


MODEL_NAME = os.getenv("WHISPER_MODEL", "small.en")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(10 * 1024 * 1024)))
ANALYSIS_VERSION = "local-speaking-v1"

app = FastAPI(title="Aptis local speaking analyzer", version="1.0.0")

_model: WhisperModel | None = None
_model_lock = threading.Lock()


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = WhisperModel(
                    MODEL_NAME,
                    device=DEVICE,
                    compute_type=COMPUTE_TYPE,
                    cpu_threads=max(1, int(os.getenv("WHISPER_CPU_THREADS", "4"))),
                    num_workers=1,
                )
    return _model


@dataclass(frozen=True)
class SpeechSegment:
    start: float
    end: float
    text: str
    avg_logprob: float


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def rounded(value: float | int | None, digits: int = 3) -> float | None:
    if value is None or not math.isfinite(float(value)):
        return None
    return round(float(value), digits)


def interval_metrics(segments: list[SpeechSegment], duration: float) -> dict[str, Any]:
    if not segments or duration <= 0:
        return {
            "speechSeconds": 0.0,
            "speechRatio": 0.0,
            "pauseCount": 0,
            "longPauseCount": 0,
            "averagePauseSeconds": 0.0,
        }

    ordered = sorted(segments, key=lambda item: item.start)
    merged: list[list[float]] = []
    for segment in ordered:
        start = clamp(segment.start, 0.0, duration)
        end = clamp(segment.end, start, duration)
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)

    speech_seconds = sum(end - start for start, end in merged)
    pauses = [
        merged[index][0] - merged[index - 1][1]
        for index in range(1, len(merged))
        if merged[index][0] - merged[index - 1][1] >= 0.25
    ]
    return {
        "speechSeconds": rounded(speech_seconds),
        "speechRatio": rounded(speech_seconds / duration),
        "pauseCount": len(pauses),
        "longPauseCount": sum(1 for pause in pauses if pause >= 1.5),
        "averagePauseSeconds": rounded(float(np.mean(pauses)) if pauses else 0.0),
    }


def acoustic_metrics(waveform: np.ndarray, sample_rate: int) -> dict[str, Any]:
    if waveform.size == 0:
        return {
            "pitchMeanHz": None,
            "pitchStdHz": None,
            "pitchRangeHz": None,
            "pitchVariation": None,
            "energyVariation": None,
        }

    frame_length = 2048
    hop_length = 320
    rms = librosa.feature.rms(
        y=waveform, frame_length=frame_length, hop_length=hop_length
    )[0]
    if rms.size == 0 or float(np.max(rms)) <= 0:
        voiced = np.array([], dtype=float)
    else:
        pitch = librosa.yin(
            waveform,
            fmin=65,
            fmax=400,
            sr=sample_rate,
            frame_length=frame_length,
            hop_length=hop_length,
        )
        usable = min(pitch.size, rms.size)
        threshold = max(float(np.percentile(rms, 35)), float(np.max(rms)) * 0.08)
        mask = (rms[:usable] >= threshold) & np.isfinite(pitch[:usable])
        voiced = pitch[:usable][mask]

    if voiced.size >= 5:
        low, high = np.percentile(voiced, [5, 95])
        mean_pitch = float(np.mean(voiced))
        pitch_std = float(np.std(voiced))
        pitch_range = float(high - low)
        pitch_variation = pitch_std / mean_pitch if mean_pitch > 0 else 0.0
    else:
        mean_pitch = pitch_std = pitch_range = pitch_variation = math.nan

    positive_rms = rms[rms > 1e-6]
    energy_variation = (
        float(np.std(positive_rms) / np.mean(positive_rms))
        if positive_rms.size
        else math.nan
    )
    return {
        "pitchMeanHz": rounded(mean_pitch, 1),
        "pitchStdHz": rounded(pitch_std, 1),
        "pitchRangeHz": rounded(pitch_range, 1),
        "pitchVariation": rounded(pitch_variation),
        "energyVariation": rounded(energy_variation),
    }


def text_metrics(text: str) -> dict[str, int]:
    words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", text)
    lowered = [word.lower() for word in words]
    fillers = {"um", "uh", "erm", "hmm"}
    repetitions = sum(
        1 for index in range(1, len(lowered)) if lowered[index] == lowered[index - 1]
    )
    return {
        "wordCount": len(words),
        "fillerCount": sum(1 for word in lowered if word in fillers),
        "repetitionCount": repetitions,
    }


def fluency_estimate(metrics: dict[str, Any]) -> float:
    wpm = float(metrics.get("wordsPerMinute") or 0)
    speech_ratio = float(metrics.get("speechRatio") or 0)
    long_pauses = int(metrics.get("longPauseCount") or 0)
    fillers = int(metrics.get("fillerCount") or 0)
    words = max(1, int(metrics.get("wordCount") or 0))

    if 100 <= wpm <= 170:
        rate_score = 1.0
    elif wpm < 100:
        rate_score = clamp((wpm - 45) / 55)
    else:
        rate_score = clamp((230 - wpm) / 60)

    ratio_score = clamp((speech_ratio - 0.5) / 0.4)
    disruption_penalty = min(0.45, long_pauses * 0.08 + fillers / words * 2.5)
    return rounded(clamp(0.55 * rate_score + 0.45 * ratio_score - disruption_penalty)) or 0.0


def convert_to_wav(source: Path, target: Path) -> None:
    result = subprocess.run(
        [
            "ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-y",
            "-i",
            str(source),
            "-ac",
            "1",
            "-ar",
            "16000",
            str(target),
        ],
        capture_output=True,
        text=True,
        timeout=45,
        check=False,
    )
    if result.returncode != 0:
        raise ValueError(f"Audio cannot be decoded: {result.stderr[-300:]}")


def analyze_file(wav_path: Path) -> dict[str, Any]:
    model = get_model()
    raw_segments, info = model.transcribe(
        str(wav_path),
        language="en",
        beam_size=5,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
        word_timestamps=True,
        condition_on_previous_text=False,
    )
    segments = [
        SpeechSegment(item.start, item.end, item.text.strip(), item.avg_logprob)
        for item in raw_segments
        if item.text and item.text.strip()
    ]
    transcript = " ".join(item.text for item in segments).strip()

    waveform, sample_rate = librosa.load(str(wav_path), sr=16000, mono=True)
    duration = float(librosa.get_duration(y=waveform, sr=sample_rate))

    metrics: dict[str, Any] = {
        "analysisVersion": ANALYSIS_VERSION,
        "sttModel": MODEL_NAME,
        "language": info.language,
        "languageProbability": rounded(info.language_probability),
        "durationSeconds": rounded(duration),
    }
    metrics.update(text_metrics(transcript))
    metrics.update(interval_metrics(segments, duration))
    metrics.update(acoustic_metrics(waveform, sample_rate))

    speech_seconds = float(metrics.get("speechSeconds") or 0)
    metrics["wordsPerMinute"] = rounded(
        metrics["wordCount"] / speech_seconds * 60 if speech_seconds > 0 else 0.0,
        1,
    )
    confidence = (
        math.exp(float(np.mean([segment.avg_logprob for segment in segments])))
        if segments
        else 0.0
    )
    metrics["asrConfidence"] = rounded(clamp(confidence))
    # This is an intelligibility proxy, not a phoneme-level pronunciation grade.
    metrics["pronunciationClarityEstimate"] = rounded(
        clamp((confidence - 0.35) / 0.55)
    )
    metrics["fluencyEstimate"] = fluency_estimate(metrics)
    return {"transcript": transcript, "metrics": metrics}


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "UP",
        "model": MODEL_NAME,
        "device": DEVICE,
        "modelLoaded": _model is not None,
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict[str, Any]:
    data = await file.read(MAX_AUDIO_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Audio file is empty")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds 10 MB")

    suffix = Path(file.filename or "recording.webm").suffix or ".webm"
    try:
        with tempfile.TemporaryDirectory(prefix="aptis-speaking-") as directory:
            source = Path(directory) / f"source{suffix}"
            wav = Path(directory) / "audio.wav"
            source.write_bytes(data)
            convert_to_wav(source, wav)
            result = analyze_file(wav)
            result["mimeType"] = file.content_type
            return result
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except subprocess.TimeoutExpired as error:
        raise HTTPException(status_code=422, detail="Audio decoding timed out") from error


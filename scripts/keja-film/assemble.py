#!/usr/bin/env python3
"""
assemble.py — final conform of the Keja AI product film (memory-safe 3-pass).

Pass 1 (per shot): overlay each shot's kinetic chip onto its own clip
        (local timeline; 1 video + 1 RGBA still per run — tiny footprint).
Pass 2: crossfade-chain the 13 laid clips into the master video.
Pass 3: grade (contrast/sat + vignette + grain) + fades + audio
        (VO at cues + ducked score -> loudnorm -14 LUFS) -> final MP4.
Output: download/Keja_AI_Product_Film_1080p.mp4 (H.264 CRF18, AAC 192k).
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import production as P
from production import (BUILD, FPS, OVERLAYS, SHOTS, shot_starts,
                        total as film_total, vo_cues)

SH = f"{BUILD}/shots"
LAID = f"{BUILD}/laid"
OV = f"{BUILD}/overlays"
VO_DIR = f"{BUILD}/vo"
MU = f"{BUILD}/music"
OUT = "/home/z/my-project/download/Keja_AI_Product_Film_1080p.mp4"
os.makedirs(LAID, exist_ok=True)

T_END = film_total()
starts = shot_starts()
start_by_id = {s["id"]: t for s, t in zip(SHOTS, starts)}
cues = vo_cues()
durs = json.load(open(f"{VO_DIR}/durations.json"))
ov_by_shot = {ov["shot"]: ov for ov in OVERLAYS}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("CMD FAILED:", " ".join(cmd[:6]), "...")
        print(r.stderr[-1500:])
        sys.exit(1)


# ── Pass 1: per-shot overlays (local timeline) ─────────────────────────────
print("pass 1: per-shot overlays", flush=True)
for shot in SHOTS:
    out = f"{LAID}/{shot['id']}.mp4"
    ov = ov_by_shot.get(shot["id"])
    if not ov:
        # no overlay on this shot — reuse the clip as-is
        if not os.path.exists(out):
            os.symlink(f"{SH}/{shot['id']}.mp4", out)
        continue
    win = ov["out"] - ov["in_"]
    fc = (
        f"[1:v]format=rgba,"
        f"fade=t=in:st=0:d=0.45:alpha=1,"
        f"fade=t=out:st={win + 0.3:.2f}:d=0.45:alpha=1[ov];"
        f"[0:v][ov]overlay=0:0:eof_action=pass,format=yuv420p[v]"
    )
    run(["ffmpeg", "-y", "-i", f"{SH}/{shot['id']}.mp4",
         "-loop", "1", "-framerate", str(FPS), "-t", f"{shot['dur']:.2f}",
         "-i", f"{OV}/{ov['id']}.png",
         "-filter_complex", fc, "-map", "[v]",
         "-t", f"{shot['dur']:.2f}",
         "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "16",
         "-pix_fmt", "yuv420p", "-an", out])
    print(f"  {shot['id']:12s} + {ov['id']}", flush=True)

# ── Pass 2: xfade chain ─────────────────────────────────────────────────────
print("pass 2: crossfade chain", flush=True)
MASTER = f"{BUILD}/master.mp4"
cmd = ["ffmpeg", "-y"]
for s in SHOTS:
    cmd += ["-i", f"{LAID}/{s['id']}.mp4"]
fg = []
prev = "[0:v]"
for i in range(1, len(SHOTS)):
    out = f"[x{i}]" if i < len(SHOTS) - 1 else "[xf]"
    fg.append(f"{prev}[{i}:v]xfade=transition=fade:duration={P.XFADE}:"
              f"offset={starts[i]:.3f}{out}")
    prev = out
fg.append(f"[xf]format=yuv420p[v]")
cmd += ["-filter_complex", ";".join(fg), "-map", "[v]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "16",
        "-r", str(FPS), "-pix_fmt", "yuv420p", "-an", MASTER]
run(cmd)
print(f"  master: {T_END:.1f}s", flush=True)

# ── Pass 3: grade + audio ────────────────────────────────────────────────────
print("pass 3: grade + audio mix", flush=True)
cmd = ["ffmpeg", "-y", "-i", MASTER]
for ln in P.VO:
    cmd += ["-i", f"{VO_DIR}/{ln['id']}.wav"]      # inputs 1..10
cmd += ["-i", f"{MU}/score.wav"]                    # input 11

n_vo = len(P.VO)
SCORE_IDX = 1 + n_vo
fg = [
    f"[0:v]eq=contrast=1.035:saturation=1.06:brightness=0.008,"
    f"vignette=angle=PI/4.6,"
    f"noise=alls=4:allf=t+u,"
    f"fade=t=in:st=0:d={P.FADE_IN},"
    f"fade=t=out:st={T_END - P.FADE_OUT:.2f}:d={P.FADE_OUT},"
    f"format=yuv420p[vout]",
]
amix_in = []
for k, ln in enumerate(P.VO):
    ms = int(round(cues[ln["id"]] * 1000))
    fg.append(
        f"[{k + 1}:a]aresample=48000,"
        f"aformat=sample_fmts=fltp:channel_layouts=stereo,"
        f"adelay={ms}|{ms},volume=1.35[va{k}]"
    )
    amix_in.append(f"[va{k}]")
fg.append(
    f"[{SCORE_IDX}:a]aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.95[sc]"
)
fg.append(
    "".join(amix_in) + "[sc]amix=inputs=" + str(len(amix_in) + 1) +
    ":duration=longest:normalize=0,"
    f"afade=t=out:st={T_END - 1.9:.2f}:d=1.8,"
    "loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
)
cmd += ["-filter_complex", ";".join(fg),
        "-map", "[vout]", "-map", "[aout]",
        "-t", f"{T_END:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-r", str(FPS), "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        "-metadata", "title=See the Evidence — the Keja AI product film",
        "-metadata", "artist=Keja AI by Chacadom",
        OUT]
run(cmd)
print("OK — final film:", OUT)

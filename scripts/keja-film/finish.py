#!/usr/bin/env python3
"""finish.py — pass 3 only: grade + fades + audio mix on the existing master."""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import production as P
from production import BUILD, FPS, total as film_total, vo_cues

VO_DIR = f"{BUILD}/vo"
MU = f"{BUILD}/music"
MASTER = f"{BUILD}/master.mp4"
OUT = "/home/z/my-project/download/Keja_AI_Product_Film_1080p.mp4"

T_END = film_total()
cues = vo_cues()
durs = json.load(open(f"{VO_DIR}/durations.json"))

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
print(f"finishing {T_END:.1f}s film -> {OUT}", flush=True)
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    print(r.stderr[-1500:])
    sys.exit(1)
print("OK — final film:", OUT)

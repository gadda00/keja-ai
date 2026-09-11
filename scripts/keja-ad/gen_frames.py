#!/usr/bin/env python3
"""gen_frames.py — generate all AI cinematography stills (1344x768 -> 1080p)."""
import os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import SHOTS

FRAMES = "/home/z/my-project/ad_build/frames"
os.makedirs(FRAMES, exist_ok=True)

def ok(path):
    return os.path.exists(path) and os.path.getsize(path) > 50_000

for shot in SHOTS:
    if shot["type"] != "still":
        continue
    out = f"{FRAMES}/{shot['id']}.png"
    if ok(out):
        print(f"[skip] {shot['id']} (exists)", flush=True)
        continue
    done = False
    for attempt in range(1, 4):
        try:
            subprocess.run(
                ["z-ai", "image", "-p", shot["prompt"], "-o", out, "-s", "1344x768"],
                capture_output=True, text=True, timeout=300)
        except subprocess.TimeoutExpired:
            pass
        if ok(out):
            print(f"[ok]   {shot['id']} attempt {attempt} "
                  f"({os.path.getsize(out)//1024} KB)", flush=True)
            done = True
            break
        time.sleep(3)
    if not done:
        print(f"[FAIL] {shot['id']}", flush=True)
        sys.exit(1)

print("ALL STILLS DONE", flush=True)

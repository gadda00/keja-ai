#!/usr/bin/env python3
"""gen_videos.py — generate AI motion clips for hero shots, download MP4s."""
import json, os, subprocess, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import SHOTS

CLIPS = "/home/z/my-project/ad_build/clips"
LOGS  = "/home/z/my-project/ad_build/logs"
os.makedirs(CLIPS, exist_ok=True)
os.makedirs(LOGS, exist_ok=True)

def find_url(obj):
    """Recursively hunt for an http(s) video URL in the CLI's JSON result."""
    if isinstance(obj, str):
        return obj if (obj.startswith("http") and any(
            e in obj.lower() for e in (".mp4", "video", "output", "result"))) else None
    if isinstance(obj, dict):
        for v in obj.values():
            u = find_url(v)
            if u:
                return u
    if isinstance(obj, list):
        for v in obj:
            u = find_url(v)
            if u:
                return u
    return None

for shot in SHOTS:
    if shot["type"] != "video":
        continue
    out = f"{CLIPS}/{shot['id']}.mp4"
    if os.path.exists(out) and os.path.getsize(out) > 200_000:
        print(f"[skip] {shot['id']} (exists)", flush=True)
        continue
    result_json = f"{LOGS}/{shot['id']}_video.json"
    try:
        subprocess.run(
            ["z-ai", "video", "-p", shot["vprompt"],
             "--size", "1920x1080", "--fps", "30", "--duration", "10",
             "--poll", "--max-polls", "100", "--poll-interval", "5",
             "-o", result_json],
            capture_output=True, text=True, timeout=900)
    except subprocess.TimeoutExpired:
        pass
    url = None
    for candidate in (result_json,):
        if os.path.exists(candidate):
            try:
                url = find_url(json.load(open(candidate)))
            except Exception:
                pass
    if not url:
        print(f"[FAIL] {shot['id']} — no URL in result JSON", flush=True)
        continue
    try:
        urllib.request.urlretrieve(url, out)
        print(f"[ok]   {shot['id']} -> {os.path.getsize(out)//1024} KB", flush=True)
    except Exception as e:
        print(f"[FAIL] {shot['id']} download: {e}", flush=True)

print("VIDEO PASS DONE", flush=True)

#!/usr/bin/env python3
"""poll_videos.py — poll skyline task, resubmit sunset, download both MP4s."""
import json, os, subprocess, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import SHOTS

CLIPS = "/home/z/my-project/ad_build/clips"
LOGS  = "/home/z/my-project/ad_build/logs"
os.makedirs(CLIPS, exist_ok=True)

def find_url(obj):
    if isinstance(obj, str):
        low = obj.lower()
        return obj if obj.startswith("http") and any(
            e in low for e in (".mp4", "video", "output", "result", "oss")) else None
    if isinstance(obj, dict):
        for v in obj.values():
            u = find_url(v)
            if u: return u
    if isinstance(obj, list):
        for v in obj:
            u = find_url(v)
            if u: return u
    return None

def submit(shot):
    rj = f"{LOGS}/{shot['id']}_video.json"
    r = subprocess.run(["z-ai", "video", "-p", shot["vprompt"], "--size", "1920x1080",
                         "--fps", "30", "--duration", "10", "-o", rj],
                        capture_output=True, text=True, timeout=300)
    if os.path.exists(rj):
        try:
            d = json.load(open(rj))
            if d.get("id"):
                print(f"[submit] {shot['id']} -> {d['id']} ({d.get('task_status')})",
                      flush=True)
                return d["id"]
        except Exception as e:
            print(f"[submit] {shot['id']} JSON parse fail: {e}", flush=True)
    print(f"[submit] {shot['id']} FAILED stdout={r.stdout[-200:]} stderr={r.stderr[-200:]}",
          flush=True)
    return None

def poll(shot, tid):
    rj = f"{LOGS}/{shot['id']}_video.json"
    for attempt in range(3):
        subprocess.run(["z-ai", "async-result", "-i", tid, "--poll",
                        "--poll-interval", "6", "--max-polls", "80", "-o", rj],
                       capture_output=True, text=True, timeout=600)
        if os.path.exists(rj):
            try:
                d = json.load(open(rj))
            except Exception:
                d = {}
            status = d.get("task_status", d.get("status", "?"))
            print(f"[poll] {shot['id']}: {status} keys={list(d.keys())}", flush=True)
            url = find_url(d)
            if url:
                return url
        time.sleep(5)
    return None

def download(shot, url):
    out = f"{CLIPS}/{shot['id']}.mp4"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=300) as resp, open(out, "wb") as f:
        f.write(resp.read())
    print(f"[done] {shot['id']} -> {os.path.getsize(out)//1024} KB", flush=True)

for shot in SHOTS:
    if shot["type"] != "video":
        continue
    out = f"{CLIPS}/{shot['id']}.mp4"
    if os.path.exists(out) and os.path.getsize(out) > 200_000:
        print(f"[skip] {shot['id']}", flush=True)
        continue
    tid = None
    rj = f"{LOGS}/{shot['id']}_video.json"
    if os.path.exists(rj):
        try:
            tid = json.load(open(rj)).get("id")
        except Exception:
            pass
    if not tid:
        tid = submit(shot)
        time.sleep(4)
    url = poll(shot, tid) if tid else None
    if url:
        try:
            download(shot, url)
        except Exception as e:
            print(f"[FAIL] {shot['id']} download: {e}", flush=True)
    else:
        print(f"[FAIL] {shot['id']} — no URL after polling", flush=True)

print("POLL PASS DONE", flush=True)

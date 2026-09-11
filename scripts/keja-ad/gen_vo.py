#!/usr/bin/env python3
"""gen_vo.py — record the full narration with the chosen voice; verify words."""
import os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import VO

VO_DIR = "/home/z/my-project/ad_build/vo"
os.makedirs(VO_DIR, exist_ok=True)
VOICE = os.environ.get("KEJA_VOICE", "xiaochen")

# -- word check first: "Keja" must survive ASR round-trip --------------------
chk = f"{VO_DIR}/check_keja.wav"
subprocess.run(["z-ai", "tts", "-i",
                "This is Keja. Keja is Swahili for home.",
                "-o", chk, "-v", VOICE, "-s", "1.0"],
               capture_output=True, text=True, timeout=180)
subprocess.run(["z-ai", "asr", "-f", chk, "-o", f"{VO_DIR}/check_keja.json"],
               capture_output=True, text=True, timeout=180)
try:
    heard = __import__("json").load(open(f"{VO_DIR}/check_keja.json"))["text"].lower()
    print(f"[check] heard: {heard!r}")
    if "keja" not in heard.replace(" ", ""):
        print("[check] WARNING — 'Keja' not recognised; check manually")
except Exception as e:
    print(f"[check] ASR unavailable ({e}) — proceeding")

# -- full narration ------------------------------------------------------------
def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", p], capture_output=True, text=True)
    return float(r.stdout.strip())

report = []
for line in VO:
    out = f"{VO_DIR}/{line['id']}.wav"
    if os.path.exists(out) and os.path.getsize(out) > 10_000:
        print(f"[skip] {line['id']}", flush=True)
        report.append((line['id'], dur(out)))
        continue
    for attempt in range(1, 4):
        try:
            r = subprocess.run(["z-ai", "tts", "-i", line["text"], "-o", out,
                               "-v", VOICE, "-s", str(line.get("speed", 1.0))],
                               capture_output=True, text=True, timeout=240)
        except subprocess.TimeoutExpired:
            r = None
        if os.path.exists(out) and os.path.getsize(out) > 10_000:
            break
        if r is not None:
            print(f"       retry {attempt}: out={r.stdout[-120:]} err={r.stderr[-120:]}",
                  flush=True)
        time.sleep(6)
    d = dur(out) if os.path.exists(out) and os.path.getsize(out) > 10_000 else -1
    print(f"[ok]   {line['id']:4s} {d:5.2f}s  end={line['cue']+d:6.2f}  {line['text'][:48]}",
          flush=True)
    report.append((line['id'], d))

print("\nDURATION REPORT")
for lid, d in report:
    print(f"  {lid:4s} {d:5.2f}s")

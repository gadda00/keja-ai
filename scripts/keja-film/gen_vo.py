#!/usr/bin/env python3
"""gen_vo.py — record the product-film narration; verify key words via ASR."""
import json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import VO

PAUSE_BETWEEN_LINES = 8   # be kind to the API between lines
BACKOFF_ON_429 = [20, 45, 90]  # seconds

VO_DIR = "/home/z/my-project/ad_build/film/vo"
os.makedirs(VO_DIR, exist_ok=True)
VOICE = os.environ.get("KEJA_VOICE", "xiaochen")   # British-English gentleman

def run(cmd, timeout=240):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return None

# -- word check: "Keja" must survive the ASR round-trip -----------------------
chk = f"{VO_DIR}/check_keja.wav"
run(["z-ai", "tts", "-i", "This is Keja. Keja is Swahili for home.",
     "-o", chk, "-v", VOICE, "-s", "1.0"])
run(["z-ai", "asr", "-f", chk, "-o", f"{VO_DIR}/check_keja.json"], 120)
try:
    heard = json.load(open(f"{VO_DIR}/check_keja.json"))["text"].lower()
    print(f"[check] voice={VOICE} heard: {heard!r}")
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
        report.append((line["id"], dur(out)))
        continue
    for attempt in range(1, 5):
        r = run(["z-ai", "tts", "-i", line["text"], "-o", out,
                 "-v", VOICE, "-s", str(line.get("speed", 1.0))])
        if os.path.exists(out) and os.path.getsize(out) > 10_000:
            break
        if r is not None and "429" in (r.stderr or ""):
            wait = BACKOFF_ON_429[min(attempt - 1, len(BACKOFF_ON_429) - 1)]
            print(f"[429] {line['id']} — backing off {wait}s", flush=True)
            time.sleep(wait)
        elif r is not None:
            print(f"[retry {attempt}] {line['id']}: {r.stderr[-200:]}", flush=True)
            time.sleep(5)
    ok = os.path.exists(out) and os.path.getsize(out) > 10_000
    report.append((line["id"], dur(out) if ok else -1))
    print(f"[{'ok ' if ok else 'FAIL'}] {line['id']}  {report[-1][1]:.2f}s", flush=True)
    time.sleep(PAUSE_BETWEEN_LINES)

json.dump({lid: d for lid, d in report}, open(f"{VO_DIR}/durations.json", "w"), indent=1)
print("\nDurations:", {k: round(v, 2) for k, v in report})

#!/usr/bin/env bash
# audition.sh — voice audition: generate L4 with 3 candidate voices, ASR back.
set -u
VO_DIR=/home/z/my-project/ad_build/vo
mkdir -p "$VO_DIR"
LINE="What if you could see the truth, before you visit?"

for v in jam xiaochen luodo; do
  z-ai tts -i "$LINE" -o "$VO_DIR/test_$v.wav" -v "$v" -s 1.0 || echo "TTS FAIL $v"
done

for v in jam xiaochen luodo; do
  f="$VO_DIR/test_$v.wav"
  if [ -s "$f" ]; then
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
    z-ai asr -f "$f" -o "$VO_DIR/test_${v}_asr.json" >/dev/null 2>&1
    echo "== $v  duration=${d}s"
    python3 -c "import json;d=json.load(open('$VO_DIR/test_${v}_asr.json'));print('   ASR:', json.dumps(d)[:300])" 2>/dev/null || echo "   ASR: (unavailable)"
  fi
done

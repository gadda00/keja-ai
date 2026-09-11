#!/usr/bin/env python3
"""
assemble.py — final conform of the Keja AI launch film.

Video: 13 shots -> per-shot prep (AI motion clips / Ken Burns stills / designed
       end card) -> 0.7 s crossfade chain -> 9 animated overlays -> unified
       grade (contrast/saturation + vignette + fine film grain) -> fades.
Audio: 12 VO lines (head-silence compensated, delayed to cues) + original
       score (ducking pre-baked) -> amix -> loudnorm -14 LUFS -> trim.
Output: download/Keja_AI_Launch_Film_1080p.mp4 (H.264 CRF18, AAC 192k).
"""
import json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import SHOTS, OVERLAYS, XFADE, FPS, total as film_total

ROOT     = "/home/z/my-project"
FRAMES   = f"{ROOT}/ad_build/frames"
CLIPS    = f"{ROOT}/ad_build/clips"
OVS      = f"{ROOT}/ad_build/overlays"
VO_DIR   = f"{ROOT}/ad_build/vo"
MUSIC    = f"{ROOT}/ad_build/music"
OUT      = f"{ROOT}/download/Keja_AI_Launch_Film_1080p.mp4"
T_END    = film_total()

starts = [0.0]
for s in SHOTS[:-1]:
    starts.append(starts[-1] + s["dur"] - XFADE)

SCHEDULE = {v["id"]: v for v in json.load(open(f"{MUSIC}/vo_schedule.json"))}


def head_silence(path):
    r = subprocess.run(["ffmpeg", "-i", path, "-af",
                        "silencedetect=noise=-45dB:d=0.12", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"silence_end: ([0-9.]+)", r.stderr)
    return min(float(m.group(1)) - 0.05, 0.4) if m else 0.0


inputs, fg = [], []
idx = 0
shot_out = {}

for n, s in enumerate(SHOTS):
    label = f"v{n}"
    if s["type"] == "video":
        inputs += ["-i", f"{CLIPS}/{s['id']}.mp4"]
        fg.append(f"[{idx}:v]fps={FPS},scale=1920:1080:flags=lanczos,"
                  f"trim=duration={s['dur']},setpts=PTS-STARTPTS,fps={FPS},"
                  f"format=yuv420p,setsar=1[{label}]")
    elif s["type"] == "still":
        inputs += ["-i", f"{FRAMES}/{s['id']}.png"]
        d = int(round(s["dur"] * FPS))
        z = {"in":    f"z='1+0.10*on/{d}'",
             "out":   f"z='1.10-0.10*on/{d}'",
             "left":  f"z=1.10:x='(iw-iw/zoom)*(1-on/{d})'",
             "right": f"z=1.10:x='(iw-iw/zoom)*on/{d}'"}[s["motion"]]
        xy = ("x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
              if s["motion"] in ("in", "out") else "y='ih/2-(ih/zoom/2)'")
        fg.append(f"[{idx}:v]scale=2112:1207:flags=lanczos,crop=2112:1188,"
                  f"zoompan={z}:{xy}:d={d}:s=1920x1080:fps={FPS},"
                  f"format=yuv420p,setsar=1[{label}]")
    else:  # designed end card
        inputs += ["-i", f"{OVS}/endcard.png"]
        d = int(round(s["dur"] * FPS))
        fg.append(f"[{idx}:v]scale=2112:1188:flags=lanczos,"
                  f"zoompan=z='1+0.03*on/{d}':x='iw/2-(iw/zoom/2)':"
                  f"y='ih/2-(ih/zoom/2)':d={d}:s=1920x1080:fps={FPS},"
                  f"format=yuv420p,setsar=1[{label}]")
    shot_out[s["id"]] = label
    idx += 1

# crossfade chain
cur = shot_out[SHOTS[0]["id"]]
for n in range(1, len(SHOTS)):
    nxt = shot_out[SHOTS[n]["id"]]
    off = f"{starts[n]:.3f}"
    lab = f"x{n}"
    fg.append(f"[{cur}][{nxt}]xfade=transition=fade:duration={XFADE}:"
              f"offset={off}[{lab}]")
    cur = lab

# overlays
for o in OVERLAYS:
    shot = next(s for s in SHOTS if s["id"] == o["shot"])
    st = starts[SHOTS.index(shot)]
    a_in = round(st + o["in_"], 3)
    win = round(o["out"] - o["in_"], 3)
    a_out = round(a_in + win, 3)
    inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{win:.3f}",
               "-i", f"{OVS}/{o['id']}.png"]
    ease = (f"24*(1-(1-cos(PI*min(1\\,(t-{a_in})/0.6)))/2)")
    fg.append(f"[{idx}:v]format=rgba,"
              f"fade=t=in:st=0:d=0.6:alpha=1,"
              f"fade=t=out:st={win - 0.5:.3f}:d=0.5:alpha=1,"
              f"setpts=PTS+{a_in}/TB[ov{idx}]")
    fg.append(f"[{cur}][ov{idx}]overlay=x=0:y='{ease}':"
              f"enable='between(t\\,{a_in}\\,{a_out})':repeatlast=0[oc{idx}]")
    cur = f"oc{idx}"
    idx += 1

# grade + cinematic finish
fg.append(f"[{cur}]eq=contrast=1.05:saturation=1.08:brightness=0.004,"
          f"vignette=angle=PI/7,noise=alls=3:allf=t+u,"
          f"fade=t=in:st=0:d=1.0,fade=t=out:st={T_END - 1.6:.3f}:d=1.6,"
          f"format=yuv420p[vout]")

# ── audio ───────────────────────────────────────────────────────────────────
inputs += ["-i", f"{MUSIC}/score.wav"]
score_idx = idx
idx += 1
audio_out = []
for lid in ["L1", "L2", "L3", "L4", "L5", "L6a", "L6b", "L7", "L8", "L9",
            "L10", "L11"]:
    sc = SCHEDULE[lid]
    inputs += ["-i", sc["file"]]
    hs = head_silence(sc["file"])
    delay = max(0.0, (sc["cue"] - hs)) * 1000
    fg.append(f"[{idx}:a]aresample=48000,highpass=f=70,"
              f"aformat=sample_fmts=fltp:channel_layouts=stereo,"
              f"adelay={delay:.0f}|{delay:.0f}[ao{idx}]")
    audio_out.append(f"[ao{idx}]")
    idx += 1

fg.append(f"[{score_idx}:a]aformat=sample_fmts=fltp:channel_layouts=stereo[sc]")
mix_in = "[sc]" + "".join(audio_out)
fg.append(f"{mix_in}amix=inputs=13:duration=longest:normalize=0[mix]")
fg.append("[mix]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,"
          f"atrim=0:{T_END:.3f},asetpts=PTS-STARTPTS[aout]")

graph = ";\n".join(fg)
os.makedirs(f"{ROOT}/ad_build/logs", exist_ok=True)
with open(f"{ROOT}/ad_build/logs/filtergraph.txt", "w") as f:
    f.write(graph)

cmd = (["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-stats"]
       + inputs
       + ["-filter_complex_script", f"{ROOT}/ad_build/logs/filtergraph.txt",
          "-map", "[vout]", "-map", "[aout]",
          "-c:v", "libx264", "-crf", "18", "-preset", "fast",
          "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS),
          "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
          "-movflags", "+faststart",
          "-metadata", "title=Keja AI — See the Truth (Launch Film)",
          "-metadata", "artist=Keja AI by Chacadom",
          OUT])
print("running ffmpeg with", idx, "inputs...")
r = subprocess.run(cmd)
if r.returncode != 0:
    sys.exit(f"FFMPEG FAILED rc={r.returncode}")
print("OK ->", OUT, os.path.getsize(OUT) // (1024 * 1024), "MB")

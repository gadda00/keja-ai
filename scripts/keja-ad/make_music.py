#!/usr/bin/env python3
"""
make_music.py — "Savanna Dawn": original score for the Keja AI launch film.

96 BPM · A minor · marimba (Kenyan texture) + warm cinematic pads + sub bass
+ soft shaker/kick. Arrangement follows the film's five acts; voiceover
ducking is baked into the render using the final narration schedule.
Output: ad_build/music/score.wav (48 kHz stereo) + vo_schedule.json
"""
import json, os, subprocess, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import VO, total as film_total

SR      = 48000
OUT     = "/home/z/my-project/ad_build/music"
VO_DIR  = "/home/z/my-project/ad_build/vo"
T_END   = film_total() + 0.5
N       = int(T_END * SR)
t_axis  = np.arange(N) / SR
rng     = np.random.default_rng(7)

# ── helpers ─────────────────────────────────────────────────────────────────
def midi_f(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def env_ar(n, a, r, hold=1.0):
    """attack/release envelope over n samples."""
    e = np.ones(n) * hold
    na, nr = max(int(a * SR), 1), max(int(r * SR), 1)
    na, nr = min(na, n), min(nr, n)
    e[:na] = np.linspace(0, hold, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e

def place(buf, sig, at):
    i = int(at * SR)
    j = min(i + len(sig), len(buf))
    if i < len(buf):
        buf[i:j] += sig[: j - i]

def onepole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(0, len(x), 4096):
        chunk = x[i:i + 4096]
        out = np.empty_like(chunk)
        for k, v in enumerate(chunk):
            acc += (1 - a) * (v - acc)
            out[k] = acc
        y[i:i + 4096] = out
    return y

def fft_lp(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[f > cutoff] *= 0.15
    return np.fft.irfft(X, len(x))

# ── voices ──────────────────────────────────────────────────────────────────
def pad(freqs, dur, amp=0.16, cutoff=1800):
    n = int(dur * SR)
    out = np.zeros(n)
    for f in freqs:
        for det, wt in ((0.9975, 0.5), (1.0, 0.6), (1.0025, 0.5)):
            ph = rng.uniform(0, 2 * np.pi)
            x = (np.sin(2 * np.pi * f * det * t_axis[:n] + ph)
                 + 0.38 * np.sin(2 * np.pi * 2 * f * det * t_axis[:n] + ph * 1.3)
                 + 0.10 * np.sin(2 * np.pi * 3 * f * det * t_axis[:n] + ph * 0.7))
            out += wt * x
    out /= max(1e-9, np.max(np.abs(out)))
    return amp * out * env_ar(n, 1.4, 1.8)

def marimba(midi, dur=None, amp=0.34, decay=None):
    f = midi_f(midi)
    d = decay if decay else max(0.45, 1.5 - (midi - 48) * 0.04)
    n = int((d + 0.15) * SR)
    tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * tt)
         + 0.24 * np.sin(2 * np.pi * f * 3.93 * tt) * np.exp(-tt * 9)
         + 0.06 * np.sin(2 * np.pi * f * 9.2 * tt) * np.exp(-tt * 18))
    x *= np.exp(-tt / d)
    click = rng.normal(0, 1, int(0.004 * SR)) * 0.4
    place(x, click, 0.0)
    return amp * x / 1.35

def sub(freq, dur, amp=0.22):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * tt)
    return amp * x * env_ar(n, 0.25, 0.5)

def shaker(amp=0.05):
    n = int(0.07 * SR)
    x = rng.normal(0, 1, n) * np.exp(-np.linspace(0, 7, n))
    return amp * fft_lp(x, 6500) / 2.5

def kick(amp=0.5):
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    fr = 105 * np.exp(-tt * 16) + 42
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR)
    return amp * x * np.exp(-tt * 11)

def riser(dur=2.6, amp=0.20):
    n = int(dur * SR)
    x = rng.normal(0, 1, n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X[f < 300] = 0
    x = np.fft.irfft(X, n)
    x *= np.linspace(0.02, 1.0, n) ** 2
    return amp * x / np.max(np.abs(x))

def impact():
    n = int(2.2 * SR)
    tt = np.arange(n) / SR
    thud = np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 3.2)
    nz = rng.normal(0, 1, n) * np.exp(-tt * 7) * fft_lp(np.ones(n), 0)  # placeholder
    shine = rng.normal(0, 1, n) * np.exp(-tt * 5)
    S = np.fft.rfft(shine)
    f = np.fft.rfftfreq(n, 1 / SR)
    S[f < 2500] = 0
    shine = np.fft.irfft(S, n) * 0.4
    return 0.34 * thud + 0.05 * shine

# ── harmony map: (t0, t1, chord midi tones, bass root) ──────────────────────
Am, C, Dm, F, G, E = [57, 60, 64], [60, 64, 67], [57, 62, 65], [53, 57, 60], [55, 59, 62], [52, 56, 59]
CH = [
    (0.0,  5.0,  Am, 33), (5.0,  10.0, F,  29),
    (10.0, 15.0, Dm, 26), (15.0, 20.0, Am, 33),
    (20.0, 25.0, Dm, 26), (25.0, 27.5, Am, 33),
    (27.5, 32.5, C,  24), (32.5, 37.5, G,  19),
    (37.5, 42.5, Am, 33), (42.5, 47.5, F,  29),
    (47.5, 52.5, C,  24), (52.5, 57.5, G,  19),
    (57.5, 62.5, F,  29), (62.5, 67.5, C,  24),
    (67.5, 72.5, Am, 33), (72.5, 77.5, F,  29),
    (77.5, 82.5, C,  24), (82.5, 87.5, F,  29),
    (87.5, 92.6, C,  24),
]

BEAT = 60 / 96          # 0.625 s

# ── arrangement ─────────────────────────────────────────────────────────────
L = np.zeros(N)
R = np.zeros(N)

def put(sig, at, panL=0.5, panR=0.5):
    place(L, sig * panL, at)
    place(R, sig * panR, at)

# pads (all sections, gain varies by act)
PAD_GAIN = lambda tt: np.interp(tt, [0, 7.3, 13.6, 20.4, 26.2, 33.5, 46.1,
                                     67.0, 74.3, 82.1, 92.6],
                               [1.0, 1.0, 0.9, 0.85, 1.15, 1.0, 1.05,
                                0.75, 0.95, 0.8, 0.7])
for t0, t1, tones, _root in CH:
    p = pad([midi_f(m) for m in tones], t1 - t0 + 1.6,
            amp=0.16 * float(np.mean(PAD_GAIN(np.array([t0, t1])))))
    put(p, t0, 0.52, 0.52)

# sub bass (root of each chord, whole-bar notes)
for t0, t1, _tones, root in CH:
    put(sub(midi_f(root), t1 - t0, amp=0.20), t0, 0.5, 0.5)

# marimba — motifs per act ----------------------------------------------------
MAR = {  # midi pool (A minor pentatonic-ish)
    57: 57, 60: 60, 62: 62, 64: 64, 67: 67, 69: 69, 72: 72, 76: 76, 79: 79}

def motif(times_notes, amp=0.30, pan_swap=True):
    for k, (at, m) in enumerate(times_notes):
        if at >= T_END - 1:
            continue
        pl, pr = (0.62, 0.38) if (k % 2 == 0) == pan_swap else (0.38, 0.62)
        put(marimba(m, amp=amp), at, pl, pr)

# Act I (0-13.6): sparse call — the "dawn" motif
motif([(1.25, 69), (2.5, 64), (3.75, 67), (5.0, 69), (7.5, 72), (8.125, 69),
       (10.0, 67), (11.25, 64), (12.5, 62)])
# Act II (13.6-26.2): questioning pattern, lower + sparser
motif([(15.0, 62), (16.25, 64), (18.75, 62), (21.25, 57), (23.75, 62)], amp=0.24)
# Riser into the reveal
put(riser(), 23.6, 0.5, 0.5)
# The reveal impact at 26.2 (reveals land with C major light)
put(impact(), 26.2, 0.5, 0.5)
# Act II-b (26.2-33.5): first major theme statement
motif([(27.5, 72), (28.75, 76), (30.0, 72), (31.25, 79), (32.5, 76)], amp=0.30)
# Act III groove (33.5-67.0): rolling 8ths, chord-tone arps
def arp(t0, t1, chord, octshift=12, amp=0.22):
    seq = [m + octshift for m in chord] + [chord[-1] + octshift + 5]
    k = 0
    bt = t0
    while bt < t1 - 0.05:
        at = bt
        m = seq[k % len(seq)]
        pl, pr = (0.60, 0.40) if k % 2 == 0 else (0.40, 0.60)
        put(marimba(m, amp=amp, decay=0.55), at, pl, pr)
        k += 1
        bt += BEAT / 2
for t0, t1, tones, _r in CH:
    if 33.5 <= t0 < 67.0:
        arp(t0, t1, tones)
# counter-melody in full groove (46.1-67.0)
motif([(47.5, 79), (50.0, 76), (52.5, 72), (55.0, 76), (57.5, 79),
       (60.0, 76), (62.5, 72), (65.0, 67)], amp=0.28)
# Act IV breath (67.0-74.3): two soft statements only
motif([(68.75, 69), (71.25, 64)], amp=0.26)
# Act V (74.3-92.6): resolution — dawn motif returns, then alone
motif([(75.0, 69), (76.25, 64), (77.5, 67), (78.75, 69), (80.0, 72),
       (83.75, 76), (85.0, 72), (86.25, 69), (87.5, 64)], amp=0.30)

# shaker 16ths in lift + groove (26.2-67.0)
tt = 26.2
while tt < 67.0:
    s = shaker(0.045 if int(tt / (BEAT / 4)) % 4 == 0 else 0.028)
    put(s, tt, 0.45, 0.55)
    tt += BEAT / 4

# kick on 1 & 3 in groove (33.5-67.0), soft
tt = 33.5
while tt < 67.0:
    put(kick(0.42), tt, 0.5, 0.5)
    tt += 2 * BEAT

# ── delay on marimba bus (approx: whole mix lightly) ────────────────────────
d = 0.469
mix = np.stack([L, R])
delayed = np.zeros_like(mix)
di = int(d * SR)
delayed[:, di:] = mix[:, :-di] * 0.22
mix = mix + delayed

# ── VO ducking envelope ─────────────────────────────────────────────────────
def vo_dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())

schedule, duck = [], np.zeros(N)
for line in VO:
    path = f"{VO_DIR}/{line['id']}.wav"
    dur = vo_dur(path)
    schedule.append(dict(id=line["id"], cue=line["cue"], dur=round(dur, 3), file=path))
    a, b = line["cue"] - 0.30, line["cue"] + dur + 0.35
    ia, ib = int(max(0, a) * SR), min(int(b * SR), N)
    if ib > ia:
        duck[ia:ib] = 1.0
# smooth the duck (0.25 s ramps) via box blur
k = int(0.25 * SR)
kernel = np.ones(k) / k
duck = np.convolve(duck, kernel, mode="same")
duck = np.clip(duck * 1.15, 0, 1)          # re-sharpen after blur
gain_env = 1.0 - 0.62 * duck               # music drops to 38% under VO

# music-level automation: intro/outro full, end fade
auto = np.ones(N)
auto[: int(0.8 * SR)] = np.linspace(0.25, 1.0, int(0.8 * SR))
fade_n = int(3.5 * SR)
auto[-fade_n:] = np.linspace(1.0, 0.0, fade_n)

mix *= gain_env * auto

# gentle master soft-clip + normalize
mix = np.tanh(mix * 1.18) / np.tanh(1.18)
mix *= 0.92 / max(1e-9, np.max(np.abs(mix)))

os.makedirs(OUT, exist_ok=True)
import wave
data = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
with wave.open(f"{OUT}/score.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())

with open(f"{OUT}/vo_schedule.json", "w") as f:
    json.dump(schedule, f, indent=2)

print(f"score.wav rendered: {T_END:.2f}s, {os.path.getsize(f'{OUT}/score.wav')//1024} KB")
print("vo_schedule.json:")
for s in schedule:
    print(f"  {s['id']:4s} cue={s['cue']:6.2f} dur={s['dur']:5.2f} end={s['cue']+s['dur']:6.2f}")

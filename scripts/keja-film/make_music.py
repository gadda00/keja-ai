#!/usr/bin/env python3
"""
make_music.py — "Evidence Theme": original score for the Keja AI product film.

96 BPM · A minor · marimba (Kenyan texture) + warm cinematic pads + sub bass
+ soft shaker/kick. Arrangement follows the film's five acts; voiceover
ducking is baked into the render using the narration schedule.
Output: ad_build/film/music/score.wav (48 kHz stereo)
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import VO, total as film_total, vo_cues

SR = 48000
OUT = "/home/z/my-project/ad_build/film/music"
VO_DIR = "/home/z/my-project/ad_build/film/vo"
os.makedirs(OUT, exist_ok=True)
T_END = film_total() + 0.6
N = int(T_END * SR)
t_axis = np.arange(N) / SR
rng = np.random.default_rng(11)


def midi_f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_ar(n, a, r, hold=1.0):
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


def fft_lp(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[f > cutoff] *= 0.15
    return np.fft.irfft(X, len(x))


def pad(freqs, dur, amp=0.16):
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


def marimba(midi, amp=0.34, decay=None):
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


def sub(freq, dur, amp=0.20):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    return amp * np.sin(2 * np.pi * freq * tt) * env_ar(n, 0.25, 0.5)


def shaker(amp=0.05):
    n = int(0.07 * SR)
    x = rng.normal(0, 1, n) * np.exp(-np.linspace(0, 7, n))
    return amp * fft_lp(x, 6500) / 2.5


def kick(amp=0.5):
    n = int(0.22 * SR)
    tt = np.arange(n) / SR
    fr = 105 * np.exp(-tt * 16) + 42
    return amp * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 11)


def riser(dur=2.8, amp=0.20):
    n = int(dur * SR)
    x = rng.normal(0, 1, n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X[f < 300] = 0
    x = np.fft.irfft(X, n)
    x *= np.linspace(0.02, 1.0, n) ** 2
    return amp * x / np.max(np.abs(x))


def impact():
    n = int(2.4 * SR)
    tt = np.arange(n) / SR
    thud = np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 3.2)
    shine = rng.normal(0, 1, n) * np.exp(-tt * 5)
    S = np.fft.rfft(shine)
    f = np.fft.rfftfreq(n, 1 / SR)
    S[f < 2500] = 0
    shine = np.fft.irfft(S, n) * 0.4
    return 0.34 * thud + 0.05 * shine


# ── harmony map (five acts) ─────────────────────────────────────────────────
Am, C, Dm, F, G, E = ([57, 60, 64], [60, 64, 67], [57, 62, 65],
                      [53, 57, 60], [55, 59, 62], [52, 56, 59])
CH = [
    (0.0,   7.3,  Am, 33),   # Act I  — cold open
    (7.3,  12.0,  F,  29),   # Act II — the query
    (12.0, 19.4,  C,  24),
    (19.4, 26.0,  Am, 33),   # Act III — the evidence (impact at 19.4)
    (26.0, 32.0,  F,  29),
    (32.0, 38.0,  G,  31),
    (38.0, 45.0,  Am, 33),
    (45.0, 51.0,  F,  29),
    (51.0, 57.7,  C,  24),   # Act IV — the toolkit
    (57.7, 64.0,  Dm, 26),   # Act V  — the reach
    (64.0, 71.0,  F,  29),
    (71.0, 78.0,  C,  24),
    (78.0, 84.0,  G,  31),
    (84.0, T_END, Am, 33),   # end card — resolve home
]

# ── arrangement ─────────────────────────────────────────────────────────────
L = np.zeros(N)
R = np.zeros(N)


def put(sig, at, panL=0.5, panR=0.5):
    place(L, sig * panL, at)
    place(R, sig * panR, at)


ACT_GAIN = np.interp(
    [t0 for t0, _, _, _ in CH],
    [0, 7.3, 19.4, 26, 34.5, 42.3, 54, 57.7, 67, 78, 83.6, T_END],
    [0.9, 0.95, 1.0, 1.15, 1.05, 1.1, 1.0, 1.15, 1.05, 0.9, 0.55, 0.5],
)

for i, (t0, t1, tones, _root) in enumerate(CH):
    p = pad([midi_f(m) for m in tones], t1 - t0 + 1.6, amp=0.16 * ACT_GAIN[i])
    put(p, t0, 0.52, 0.52)

for t0, t1, _tones, root in CH:
    put(sub(midi_f(root), t1 - t0, amp=0.20), t0, 0.5, 0.5)


def motif(times_notes, amp=0.30):
    for k, (at, m) in enumerate(times_notes):
        if at >= T_END - 1:
            continue
        pl, pr = (0.62, 0.38) if k % 2 == 0 else (0.38, 0.62)
        put(marimba(m, amp=amp), at, pl, pr)


# Act I (0–7.3): sparse dawn call
motif([(1.25, 69), (2.5, 64), (4.0, 67), (5.75, 69), (7.0, 72)])
# Act II (7.3–19.4): the query — questioning thirds
motif([(8.6, 64), (9.85, 67), (11.1, 64), (13.4, 62), (14.65, 64),
       (16.9, 67), (18.15, 72)], amp=0.26)
# Riser into the evidence reveal + impact at the trustscore cut
put(riser(), 16.8, 0.5, 0.5)
put(impact(), 19.4, 0.5, 0.5)
# Act III theme statement (19.4–34.5)
motif([(20.0, 72), (21.25, 76), (22.5, 72), (23.75, 79), (25.0, 76),
       (26.5, 79), (27.75, 76), (29.0, 72), (30.5, 74), (32.0, 76),
       (33.25, 72)], amp=0.32)
# groove: shaker eighths + heartbeat kick through Acts III–IV
bt = 20.0
while bt < 57.0:
    put(shaker(0.05), bt, 0.55, 0.45)
    put(shaker(0.035), bt + 0.3125, 0.45, 0.55)
    if (bt - 20.0) % 1.25 < 0.01:      # heartbeat kick every 2 beats
        put(kick(0.42), bt, 0.5, 0.5)
    bt += 0.625
# rolling arps under Act IV (42.3–57.7)
def arp(t0, t1, chord, octshift=12, amp=0.22):
    seq = [m + octshift for m in chord] + [chord[-1] + octshift + 5]
    k, bt = 0, t0
    while bt < t1 - 0.05:
        m = seq[k % len(seq)]
        pl, pr = (0.60, 0.40) if k % 2 == 0 else (0.40, 0.60)
        put(marimba(m, amp=amp, decay=0.55), bt, pl, pr)
        bt += 0.3125
        k += 1

arp(43.5, 51.0, F)
arp(51.0, 57.5, C)
# Act V (57.7–83.6): full theme, then strip back
motif([(58.5, 76), (59.75, 79), (61.0, 76), (62.25, 81), (63.5, 79),
       (67.5, 74), (68.75, 76), (70.0, 79), (71.5, 76), (73.0, 74),
       (77.5, 72), (78.75, 74), (80.0, 76), (81.5, 74)], amp=0.30)
put(impact(), 83.6, 0.5, 0.5)          # landing on the end card
motif([(85.5, 76), (86.9, 72), (88.6, 69)], amp=0.24)  # final resolve notes

# ── VO ducking (baked): -8 dB under narration, 0.25 s in / 0.6 s out ───────
duck = np.ones(N)
cues = vo_cues()
durs = json.load(open(f"{VO_DIR}/durations.json"))
DUCK_DB = -8.0
level = 10 ** (DUCK_DB / 20)
for ln in VO:
    c, d = cues[ln["id"]], durs[ln["id"]]
    if d <= 0:
        continue
    i0, i1 = int(c * SR), min(int((c + d) * SR), N)
    a = int(0.25 * SR); r = int(0.6 * SR)
    if i0 + a < N:
        duck[i0:i0 + a] = np.minimum(duck[i0:i0 + a],
                                      np.linspace(1, level, a))
    duck[i0 + a:i1] = np.minimum(duck[i0 + a:i1] if i1 > i0 + a else duck[i0:i1],
                                  level)
    if i1 + r < N:
        tail = duck[i1:i1 + r]
        duck[i1:i1 + r] = np.minimum(tail, np.linspace(level, 1, r))

L *= duck
R *= duck

# master gentle limiting + fades
mix = np.stack([L, R])
peak = np.max(np.abs(mix))
if peak > 0.9:
    mix *= 0.9 / peak
fade_in, fade_out = int(0.8 * SR), int(2.2 * SR)
mix[:, :fade_in] *= np.linspace(0, 1, fade_in)
mix[:, -fade_out:] *= np.linspace(1, 0, fade_out)

import wave
with wave.open(f"{OUT}/score.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(np.ascontiguousarray((mix.T * 32767)).astype(np.int16).tobytes())

json.dump({ln["id"]: cues[ln["id"]] for ln in VO},
          open(f"{OUT}/vo_schedule.json", "w"), indent=1)
print(f"score.wav rendered: {T_END:.1f}s, ducked under {len(VO)} lines")

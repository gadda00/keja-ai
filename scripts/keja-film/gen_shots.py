#!/usr/bin/env python3
"""
gen_shots.py — build every shot of the product film.

Two kinds:
  type=shot : a real keja.app screenshot (1920x1080) animated with a smooth,
              eased Ken Burns move (supersampled 2x through zoompan for
              sub-pixel smoothness at 1080p30).
  type=card : a PIL-designed end card (brand palette, typography only).

Every clip is encoded as a 30 fps H.264 intermediate (CRF 16, yuv420p) in
ad_build/film/shots/<id>.mp4 with the exact duration production.py declares.
"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import BUILD, FPS, H, PALETTE, SHOTS, SHOTS_DIR, W

OUT = f"{BUILD}/shots"
os.makedirs(OUT, exist_ok=True)

SS = 3840  # supersample width for buttery Ken Burns


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def ease(t_expr):
    """smoothstep ease on the zoompan progress variable (0..1)."""
    return f"(3*pow({t_expr},2)-2*pow({t_expr},3))"



def kenburns_filter(motion, frames, amt=0.12, pan=0.10):
    """zoompan filter string with eased motion. `on` runs 0..frames-1."""
    t = f"(on/{frames - 1})"
    e = ease(t)
    cx = "iw/2-(iw/zoom/2)"
    cy = "ih/2-(ih/zoom/2)"
    if motion == "in":     # slow push in, centered
        z = f"1+{amt}*{e}"
        x, y = cx, cy
    elif motion == "out":  # slow pull back, centered
        z = f"1+{amt}*(1-{e})"
        x, y = cx, cy
    elif motion == "left": # fixed zoom, drift left->right
        z = f"1+{amt}"
        x = f"(iw-iw/zoom)*{e}"
        y = cy
    elif motion == "right":
        z = f"1+{amt}"
        x = f"(iw-iw/zoom)*(1-{e})"
        y = cy
    else:
        raise ValueError(motion)
    return (f"zoompan=z='{z}':x='{x}':y='{y}':d={frames}:"
            f"s={W}x{H}:fps={FPS}")


def build_shot_clip(shot):
    src = os.path.join(SHOTS_DIR, shot["src"])
    out = os.path.join(OUT, f"{shot['id']}.mp4")
    frames = int(round(shot["dur"] * FPS))
    vf = (
        f"scale={SS}:{int(SS * H / W)},"
        + kenburns_filter(shot["motion"], frames, amt=0.11)
        + ",format=yuv420p"
    )
    cmd = ["ffmpeg", "-y", "-loop", "1", "-i", src,
           "-vf", vf, "-frames:v", str(frames),
           "-r", str(FPS), "-c:v", "libx264", "-preset", "slow",
           "-crf", "16", "-pix_fmt", "yuv420p", out]
    print(f"[shot] {shot['id']:12s} {shot['dur']:4.1f}s {shot['motion']:>5s} <- {shot['src']}", flush=True)
    subprocess.run(cmd, check=True, capture_output=True)


# ───────────────────────────── end card design ──────────────────────────────

F_DIR = "/usr/share/fonts/truetype/freefont"
FONT_DISPLAY = f"{F_DIR}/FreeSerifBold.ttf"
FONT_TEXT = f"{F_DIR}/FreeSansBold.ttf"
FONT_TEXT_R = f"{F_DIR}/FreeSans.ttf"


def end_card(path):
    """1920x1080 brand end card — deep emerald, gold accents, typographic."""
    em, emd = hexrgb(PALETTE["emerald"]), hexrgb(PALETTE["emerald_deep"])
    gold, goldb = hexrgb(PALETTE["gold"]), hexrgb(PALETTE["gold_bright"])
    cream = hexrgb(PALETTE["cream"])

    img = Image.new("RGB", (W, H), emd)
    d = ImageDraw.Draw(img)

    # soft radial glow (upper center)
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W // 2 - 900, -700, W // 2 + 900, 700], fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(260))
    em_layer = Image.new("RGB", (W, H), em)
    img = Image.composite(em_layer, img, glow)
    d = ImageDraw.Draw(img)

    # fine gold rule, top + bottom (echoes the site's UI lines)
    d.rectangle([140, 96, W - 140, 99], fill=gold)
    d.rectangle([140, H - 96, W - 140, H - 93], fill=gold)

    # wordmark: Keja (cream) + AI (gold)
    f_word = ImageFont.truetype(FONT_DISPLAY, 220)
    word = "Keja"
    ai = " AI"
    ww = d.textlength(word, font=f_word)
    aw = d.textlength(ai, font=f_word)
    x0 = (W - (ww + aw)) // 2
    y0 = 300
    d.text((x0, y0), word, font=f_word, fill=cream)
    d.text((x0 + ww, y0), ai, font=f_word, fill=goldb)

    # subtitle
    f_sub = ImageFont.truetype(FONT_TEXT, 44)
    sub = "Swahili for home"
    sw = d.textlength(sub, font=f_sub)
    d.text(((W - sw) // 2, y0 + 250), sub, font=f_sub, fill=(214, 226, 216))

    # tagline
    f_tag = ImageFont.truetype(FONT_TEXT, 56)
    tag = "See the evidence before you buy."
    tw = d.textlength(tag, font=f_tag)
    d.text(((W - tw) // 2, 620), tag, font=f_tag, fill=goldb)

    # URL
    f_url = ImageFont.truetype(FONT_TEXT_R, 72)
    url = "keja.app"
    uw = d.textlength(url, font=f_url)
    d.text(((W - uw) // 2, 760), url, font=f_url, fill=cream)

    # kicker line
    f_k = ImageFont.truetype(FONT_TEXT, 30)
    k = "DISCOVER · VERIFY · ANALYSE · FINANCE · INVEST · TRANSACT · MANAGE"
    kw = d.textlength(k, font=f_k)
    d.text(((W - kw) // 2, 900), k, font=f_k, fill=(170, 190, 174))

    # corner credit
    f_c = ImageFont.truetype(FONT_TEXT, 26)
    c = "A Chacadom Investments venture"
    d.text((140, 20), c, font=f_c, fill=(150, 170, 154))

    img.save(path)


# ─────────────────────────────── run ────────────────────────────────────────

CARD = os.path.join(BUILD, "endcard.png")
end_card(CARD)

for shot in SHOTS:
    out = os.path.join(OUT, f"{shot['id']}.mp4")
    if os.path.exists(out):
        os.remove(out)
    if shot["type"] == "card":
        frames = int(round(shot["dur"] * FPS))
        vf = (f"scale={SS}:{int(SS * H / W)},"
              + kenburns_filter(shot["motion"], frames, amt=0.06)
              + ",format=yuv420p")
        subprocess.run(["ffmpeg", "-y", "-loop", "1", "-i", CARD,
                       "-vf", vf, "-frames:v", str(frames), "-r", str(FPS),
                       "-c:v", "libx264", "-preset", "slow", "-crf", "16",
                       "-pix_fmt", "yuv420p", out],
                      check=True, capture_output=True)
        print(f"[card] endcard       {shot['dur']:4.1f}s", flush=True)
    else:
        build_shot_clip(shot)

print("done:", len(SHOTS), "clips in", OUT)

#!/usr/bin/env python3
"""
gen_overlays.py — render the film's motion-graphic overlays as transparent
PNGs (1920x1080 RGBA), in the brand palette. Applied during assembly with
fade-in/out so they feel kinetic, not glued on.

Kinds:
  kicker : centered small-caps kicker + one display line (understated)
  query  : bottom-left search-style chip carrying the film's query string
  pill   : bottom-left rounded chip: gold kicker + cream line
  score  : centered dial chip: big number + kicker + line
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import BUILD, H, OVERLAYS, PALETTE, W

OUT = f"{BUILD}/overlays"
os.makedirs(OUT, exist_ok=True)

F = "/usr/share/fonts/truetype/freefont"
F_KICKER = f"{F}/FreeSansBold.ttf"
F_LINE = f"{F}/FreeSansBold.ttf"
F_BIG = f"{F}/FreeSerifBold.ttf"


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


SCRIM = (11, 21, 18, 214)          # brand scrim, 84% opaque
GOLD = rgb(PALETTE["gold_bright"]) + (255,)
CREAM = rgb(PALETTE["cream"]) + (255,)
MUT = (190, 205, 193, 255)


def text_spaced(d, xy, s, font, fill, tracking=6):
    """draw text with manual letter-spacing (PIL has none)."""
    x, y = xy
    for ch in s:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking
    return x


def spaced_width(d, s, font, tracking=6):
    return sum(d.textlength(ch, font=font) + tracking for ch in s) - (tracking if s else 0)


def rrect(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)


def make_kicker(ov):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fk = ImageFont.truetype(F_KICKER, 40)
    fl = ImageFont.truetype(F_BIG, 74)
    kw = spaced_width(d, ov["kicker"], fk, 10)
    lw = d.textlength(ov["line1"], font=fl)
    y = int(H * 0.70)
    text_spaced(d, ((W - kw) / 2, y), ov["kicker"], fk, GOLD, 10)
    d.text(((W - lw) / 2, y + 70), ov["line1"], font=fl, fill=CREAM)
    # thin gold rule under
    d.rectangle([(W - 260) / 2, y + 190, (W + 260) / 2, y + 193], fill=GOLD)
    return img


def make_pill(ov):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fk = ImageFont.truetype(F_KICKER, 34)
    fl = ImageFont.truetype(F_LINE, 52)
    x0, y0 = 120, H - 250
    kw = spaced_width(d, ov["kicker"], fk, 8)
    lw = d.textlength(ov["line1"], font=fl)
    bw = max(kw, lw) + 72
    bh = 168
    rrect(d, [x0, y0, x0 + bw, y0 + bh], 22, SCRIM)
    # gold left edge accent
    d.rounded_rectangle([x0, y0, x0 + 10, y0 + bh], radius=5, fill=GOLD)
    text_spaced(d, (x0 + 46, y0 + 30), ov["kicker"], fk, GOLD, 8)
    d.text((x0 + 46, y0 + 88), ov["line1"], font=fl, fill=CREAM)
    return img


def make_query(ov):
    """search-box styled chip: the film's query, typed out."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fk = ImageFont.truetype(F_KICKER, 34)
    fq = ImageFont.truetype(F_LINE, 62)
    x0, y0 = 120, H - 270
    kw = spaced_width(d, ov["kicker"], fk, 8)
    qw = d.textlength(ov["line1"], font=fq)
    bw = max(kw, qw + 66) + 84
    bh = 200
    rrect(d, [x0, y0, x0 + bw, y0 + bh], 26, SCRIM)
    d.rounded_rectangle([x0, y0, x0 + 10, y0 + bh], radius=5, fill=GOLD)
    text_spaced(d, (x0 + 48, y0 + 28), ov["kicker"], fk, GOLD, 8)
    d.text((x0 + 48, y0 + 92), ov["line1"], font=fq, fill=CREAM)
    # blinking-cursor style bar
    d.rectangle([x0 + 52 + qw + 14, y0 + 96, x0 + 58 + qw + 14, y0 + 150], fill=GOLD)
    return img


def make_score(ov):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fk = ImageFont.truetype(F_KICKER, 36)
    fb = ImageFont.truetype(F_BIG, 150)
    fl = ImageFont.truetype(F_LINE, 46)
    kw = spaced_width(d, ov["kicker"], fk, 9)
    bw_num = d.textlength(ov["num"], font=fb)
    lw = d.textlength(ov["line1"], font=fl)
    inner_w = max(kw, bw_num, lw) + 120
    x0 = (W - inner_w) / 2
    y0 = int(H * 0.60)
    rrect(d, [x0, y0, x0 + inner_w, y0 + 350], 28, SCRIM)
    text_spaced(d, ((W - kw) / 2, y0 + 34), ov["kicker"], fk, GOLD, 9)
    d.text(((W - bw_num) / 2, y0 + 86), ov["num"], font=fb, fill=GOLD)
    d.text(((W - lw) / 2, y0 + 268), ov["line1"], font=fl, fill=CREAM)
    return img


KINDS = dict(kicker=make_kicker, pill=make_pill, query=make_query, score=make_score)

for ov in OVERLAYS:
    img = KINDS[ov["kind"]](ov)
    p = os.path.join(OUT, f"{ov['id']}.png")
    img.save(p)
    print(f"[ov] {ov['id']:14s} {ov['kind']:7s} -> {os.path.basename(p)}")

print("done:", len(OVERLAYS), "overlays in", OUT)

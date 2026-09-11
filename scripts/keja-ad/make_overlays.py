#!/usr/bin/env python3
"""
make_overlays.py — motion-graphics overlays + end card for the Keja AI film.

Design system: "savanna trust" — deep emerald + warm gold on cream, calm and
evidence-led. Fonts: DejaVu Sans Bold (display/kickers), DejaVu Serif Bold
Italic (human signature moments). All art 1920x1080 RGBA.
"""
import os, sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from production import PALETTE as C

W, H = 1920, 1080
OUT = "/home/z/my-project/ad_build/overlays"
os.makedirs(OUT, exist_ok=True)

FD = "/usr/share/fonts/truetype/dejavu"
FL = "/usr/share/fonts/truetype/liberation"
F_SANS_B   = f"{FD}/DejaVuSans-Bold.ttf"
F_SANS     = f"{FD}/DejaVuSans.ttf"
F_SERIF_B  = f"{FL}/LiberationSerif-Bold.ttf"
F_SERIF_BI = f"{FL}/LiberationSerif-BoldItalic.ttf"
F_SERIF_I  = f"{FL}/LiberationSerif-Italic.ttf"

EMERALD, DEEP, GOLD, CREAM = C["emerald"], C["emerald_deep"], C["gold_bright"], C["cream"]
INK, WHITE = C["ink"], "#ffffff"


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def font(path, size):
    return ImageFont.truetype(path, size)


def tracked_w(fnt, text, tracking):
    return sum(fnt.getbbox(ch)[2] - fnt.getbbox(ch)[0] for ch in text) \
        + tracking * max(0, len(text) - 1)


def draw_tracked(d, xy, text, fnt, fill, tracking=0):
    """Draw text with letter tracking; left-baseline at xy. Returns end x."""
    x, y = xy
    for ch in text:
        bb = fnt.getbbox(ch)
        d.text((x - bb[0], y), ch, font=fnt, fill=fill)
        x += (bb[2] - bb[0]) + tracking
    return x


def scrim_radial(size=(W, H), strength=0.62, radius=760):
    """Centered dark radial scrim (for centered hero text)."""
    s = Image.new("L", (W // 4, H // 4), 0)
    dd = ImageDraw.Draw(s)
    cx, cy = W // 8, H // 8
    for r in range(int(radius // 4), 0, -6):
        a = int(255 * strength * max(0.0, 1 - (r / (radius / 4)) * 1.15))
        dd.ellipse([cx - r, cy - r * 0.72, cx + r, cy + r * 0.72], fill=a)
    s = s.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(60))
    scr = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    scr.putalpha(s)
    return scr


def soft_shadow_layer(draw_fn, blur=14, alpha=170, dx=0, dy=6):
    """Render a text layer twice: blurred shadow + crisp copy."""
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(lay), shadow=True)
    sh = lay.filter(ImageFilter.GaussianBlur(blur))
    draw_fn(ImageDraw.Draw(lay), shadow=False)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(sh)
    out.alpha_composite(lay)
    return out


# ── 1. cinematic location stamp (skyline) ──────────────────────────────────
def ov_stamp():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(F_SANS_B, 34)
    text = "NAIROBI · 06:42"
    x0, y0 = 128, 132
    img.alpha_composite(soft_shadow_layer(
        lambda dd, shadow=False: draw_tracked(
            dd, (x0, y0), text, f, (10, 14, 12, 150) if shadow else (255, 255, 255, 235),
            tracking=10)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x0, y0 + 66, x0 + tracked_w(f, text, 10), y0 + 71],
                         2, fill=hex_rgb(GOLD) + (255,))
    img.save(f"{OUT}/ov_stamp.png")


# ── 2. the doubt question ──────────────────────────────────────────────────
def ov_doubt():
    img = scrim_radial(strength=0.55, radius=820)
    f = font(F_SERIF_BI, 168)
    text = "Is it real?"

    def paint(dd, shadow=False):
        w = tracked_w(f, text, 2)
        draw_tracked(dd, ((W - w) / 2, H / 2 - 120), text, f,
                     (8, 10, 9, 165) if shadow else (255, 255, 255, 247), tracking=2)
    img.alpha_composite(soft_shadow_layer(paint, blur=18, dy=8))
    img.save(f"{OUT}/ov_doubt.png")


# ── 3. the brand reveal ─────────────────────────────────────────────────────
def ov_reveal():
    img = scrim_radial(strength=0.66, radius=880)
    fk = font(F_SANS_B, 40)
    fb = font(F_SANS_B, 250)
    fi = font(F_SERIF_I, 58)

    def paint(dd, shadow=False):
        col = (6, 10, 8, 175) if shadow else None
        kw = tracked_w(fk, "THIS IS", 22)
        draw_tracked(dd, ((W - kw) / 2, H / 2 - 250), "THIS IS", fk,
                     col or hex_rgb(GOLD) + (255,), tracking=22)
        bw = tracked_w(fb, "KEJA", 26)
        draw_tracked(dd, ((W - bw) / 2, H / 2 - 185), "KEJA", fb,
                     col or (255, 255, 255, 252), tracking=26)
        sw = tracked_w(fi, "Swahili for home", 2)
        draw_tracked(dd, ((W - sw) / 2, H / 2 + 128), "Swahili for home", fi,
                     col or hex_rgb(CREAM) + (240, 0, 0, 0)[0:3] + (240,)
                     if False else hex_rgb(CREAM) + (238,), tracking=2)
    img.alpha_composite(soft_shadow_layer(paint, blur=16, dy=8))
    img.save(f"{OUT}/ov_reveal.png")


# ── 4. trust score gauge ────────────────────────────────────────────────────
def ov_score():
    img = scrim_radial(strength=0.60, radius=840)
    fnum = font(F_SANS_B, 300)
    fk = font(F_SANS_B, 40)
    fl = font(F_SERIF_I, 50)

    def paint(dd, shadow=False):
        col = (6, 10, 8, 170) if shadow else None
        cx, cy = W // 2, H // 2 - 40
        r = 250
        if not shadow:
            dd.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 60),
                       width=14)
            dd.arc([cx - r, cy - r, cx + r, cy + r], start=-225, end=48,
                   fill=hex_rgb(GOLD) + (255,), width=14)
            dd.ellipse([cx - 12, cy - r - 7, cx + 12, cy - r + 21],
                       fill=hex_rgb(GOLD) + (255,))
        nw = tracked_w(fnum, "92", 0)
        draw_tracked(dd, (cx - nw / 2, cy - 165), "92", fnum,
                     col or (255, 255, 255, 252))
        kw = tracked_w(fk, "TRUST SCORE", 24)
        draw_tracked(dd, (cx - kw / 2, cy + 128), "TRUST SCORE", fk,
                     col or hex_rgb(GOLD) + (255,), tracking=24)
        lw = tracked_w(fl, "Evidence, not promises", 2)
        draw_tracked(dd, (cx - lw / 2, cy + r + 46), "Evidence, not promises", fl,
                     col or hex_rgb(CREAM) + (235,), tracking=2)
    img.alpha_composite(soft_shadow_layer(paint, blur=16, dy=8))
    img.save(f"{OUT}/ov_score.png")


# ── 5. feature pills (bottom-left aligned) ──────────────────────────────────
def pill(kicker, line1, name):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(panel)
    x0, y0 = 128, H - 320
    w = max(760, tracked_w(font(F_SANS_B, 48), line1, 1) + 176)
    h = 172
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 26,
                        fill=(8, 18, 14, 148))
    d.rounded_rectangle([x0, y0, x0 + 10, y0 + h], 5, fill=hex_rgb(GOLD) + (255,))
    panel = panel.filter(ImageFilter.GaussianBlur(0.6))
    img.alpha_composite(panel)

    fk = font(F_SANS_B, 30)
    fl = font(F_SANS_B, 50)

    def paint(dd, shadow=False):
        col = (4, 8, 6, 160) if shadow else None
        draw_tracked(dd, (x0 + 56, y0 + 28), kicker, fk,
                     col or hex_rgb(GOLD) + (255,), tracking=16)
        draw_tracked(dd, (x0 + 54, y0 + 76), line1, fl,
                     col or (255, 255, 255, 250), tracking=1)
    img.alpha_composite(soft_shadow_layer(paint, blur=10, dy=5))
    img.save(f"{OUT}/{name}.png")


# ── 6. signature moment (sunset) ────────────────────────────────────────────
def ov_sig():
    img = scrim_radial(strength=0.52, radius=860)
    fb = font(F_SERIF_B, 285)
    fi = font(F_SERIF_I, 62)

    def paint(dd, shadow=False):
        col = (6, 10, 8, 165) if shadow else None
        bw = tracked_w(fb, "Keja", 4)
        draw_tracked(dd, ((W - bw) / 2, H / 2 - 235), "Keja", fb,
                     col or (255, 255, 255, 252), tracking=4)
        sw = tracked_w(fi, "Swahili for home", 2)
        draw_tracked(dd, ((W - sw) / 2, H / 2 + 118), "Swahili for home", fi,
                     col or hex_rgb(GOLD) + (255,), tracking=2)
    img.alpha_composite(soft_shadow_layer(paint, blur=18, dy=8))
    img.save(f"{OUT}/ov_sig.png")


# ── 7. end card (opaque, full frame) ───────────────────────────────────────
def endcard():
    img = Image.new("RGB", (W, H), hex_rgb(DEEP))
    px = img.load()
    top, bottom = hex_rgb("#02281c"), hex_rgb(DEEP)
    for y in range(H):
        k = y / H
        r = int(top[0] * (1 - k) + bottom[0] * k)
        g = int(top[1] * (1 - k) + bottom[1] * k)
        b = int(top[2] * (1 - k) + bottom[2] * k)
        for x in range(0, W, 4):
            for dx in range(4):
                if x + dx < W:
                    px[x + dx, y] = (r, g, b)
    # radial gold glow behind logo
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    for rr in range(520, 0, -8):
        a = int(70 * (1 - rr / 520))
        gd.ellipse([W / 2 - rr * 1.35, H * 0.26 - rr, W / 2 + rr * 1.35,
                    H * 0.26 + rr], fill=a)
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    gold_layer = Image.new("RGB", (W, H), hex_rgb(GOLD))
    img = Image.composite(gold_layer, img,
                          glow.point(lambda v: int(v * 0.30)))
    d = ImageDraw.Draw(img, "RGBA")

    # ── logo mark: rounded emerald tile + white "roof Z" (from logo.svg) ──
    tile = Image.new("RGBA", (520, 520), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    td.rounded_rectangle([24, 24, 496, 496], 68, fill=(2, 46, 31, 255),
                         outline=hex_rgb(GOLD) + (230,), width=5)
    # roof-Z polygons (viewBox 30 -> 472 inner, offset 24)
    def P(pts30):
        return [(24 + x / 30 * 472, 24 + y / 30 * 472) for x, y in pts30]
    white = (255, 255, 255, 255)
    td.polygon(P([(6.16, 7.10), (15.47, 7.10), (14.10, 9.42), (6.16, 9.42)]),
               fill=white)
    td.polygon(P([(24.30, 7.10), (13.14, 22.91), (5.70, 22.91), (16.86, 7.10)]),
               fill=white)
    td.polygon(P([(24.30, 20.58), (24.30, 22.91), (14.53, 22.91),
                  (15.84, 20.58)]), fill=white)
    img.paste(tile, (int(W / 2 - 260), 42), tile)

    # ── wordmark + lines (vertical rhythm: 42..562 tile, then text) ──
    fw = font(F_SANS_B, 104)
    ww = tracked_w(fw, "KEJA AI", 26)
    draw_tracked(d, ((W - ww) / 2, 588), "KEJA AI", fw,
                 (255, 255, 255, 255), tracking=26)
    ft = font(F_SERIF_BI, 54)
    tag = "See the truth before you buy."
    tw = tracked_w(ft, tag, 2)
    draw_tracked(d, ((W - tw) / 2, 716), tag, ft,
                 hex_rgb(GOLD) + (255,), tracking=2)

    # ── URL pill ──
    fu = font(F_SANS_B, 52)
    url = "keja.app"
    uw = tracked_w(fu, url, 6)
    pw, ph = uw + 200, 110
    px0, py0 = (W - pw) / 2, 806
    d.rounded_rectangle([px0, py0, px0 + pw, py0 + ph], ph // 2,
                        fill=hex_rgb(GOLD) + (255,))
    draw_tracked(d, ((W - uw) / 2, py0 + 24), url, fu,
                 (24, 34, 26, 255), tracking=6)

    # ── caps line + footer ──
    fl = font(F_SANS_B, 29)
    line = "ENGLISH  ·  KISWAHILI  ·  FRANÇAIS"
    lw2 = tracked_w(fl, line, 13)
    draw_tracked(d, ((W - lw2) / 2, 944), line, fl,
                 (255, 255, 255, 205), tracking=13)
    fs = font(F_SANS, 25)
    line2 = "Installable on Android & iOS  ·  Works offline"
    l2w = tracked_w(fs, line2, 5)
    draw_tracked(d, ((W - l2w) / 2, 988), line2, fs,
                 (255, 255, 255, 150), tracking=5)
    ff = font(F_SANS, 24)
    foot = "by Chacadom Investments  ·  Westlands, Nairobi"
    ffw = tracked_w(ff, foot, 4)
    draw_tracked(d, ((W - ffw) / 2, 1030), foot, ff, (255, 255, 255, 120),
                 tracking=4)
    img.save(f"{OUT}/endcard.png")


if __name__ == "__main__":
    ov_stamp()
    ov_doubt()
    ov_reveal()
    ov_score()
    pill("PROPERTY PASSPORT", "Proof that travels", "ov_passport")
    pill("RENT DAY", "Collected. Chased. Done.", "ov_landlord")
    pill("DIASPORA-READY", "Invest from anywhere", "ov_diaspora")
    pill("EVERY HOME", "Worth the trip", "ov_home")
    ov_sig()
    endcard()
    for f in sorted(os.listdir(OUT)):
        p = os.path.join(OUT, f)
        print(f"  {f:22s} {os.path.getsize(p)//1024} KB")

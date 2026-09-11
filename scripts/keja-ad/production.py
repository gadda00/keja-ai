#!/usr/bin/env python3
"""
production.py — single source of truth for the Keja AI launch film.

Title:      "See the Truth" — the Keja AI launch film
Client:     Keja AI by Chacadom (keja.app)
Length:     ~93 seconds master (16:9, 1080p, 30fps)
Positioning (from MARKETING_PLAYBOOK.md):
            trust-first, evidence-led, quietly confident — the anti-hype
            property brand. Consumer tagline: "See the truth before you buy."
"""

# ── Brand palette ("savanna trust": deep emerald + warm gold on cream) ─────
PALETTE = {
    "emerald":       "#006942",   # primary
    "emerald_deep":  "#00442f",
    "emerald_chart": "#00794b",
    "gold":          "#9a6d1c",
    "gold_bright":   "#ebb23e",   # hero accent on dark
    "gold_soft":     "#f7eac8",
    "ink":           "#182721",
    "cream":         "#fdfcf9",
    "white":         "#ffffff",
}

# ── Edit constants ──────────────────────────────────────────────────────────
W, H       = 1920, 1080
FPS        = 30
XFADE      = 0.7          # crossfade between shots (s)
FADE_IN    = 1.0          # from black
FADE_OUT   = 1.6          # to black at end
SR         = 48000         # audio sample rate (stereo)

STYLE = ("cinematic photography, photorealistic, warm golden-hour light, "
         "amber and deep-teal color grade, shot on 35mm film, shallow depth "
         "of field, subtle film grain, extremely detailed, professional "
         "advertising cinematography, no text, no watermark")

# ── Shots ───────────────────────────────────────────────────────────────────
# type: still  -> AI still + Ken Burns | video -> AI motion clip | card -> PIL
# motion (stills): in | out | left | right  (Ken Burns direction)
SHOTS = [
    dict(id="skyline",   dur=8.0, type="video", motion="in",
         label="ACT I — THE CITY",
         prompt=("Breathtaking aerial view of Nairobi city skyline at sunrise, "
                 "KICC tower and modern skyscrapers silhouetted against a golden "
                 "orange sky, morning haze over rooftops, first light touching "
                 "the city, " + STYLE),
         vprompt=("Slow forward aerial drone shot over Nairobi city skyline at "
                  "sunrise, KICC tower, golden morning haze, gentle smooth camera "
                  "movement, cinematic, photorealistic, warm amber and teal grade")),
    dict(id="streets",    dur=7.0, type="still", motion="right",
         prompt=("Vibrant Nairobi street at morning golden hour, colorful matatu "
                 "minibus with painted artwork, businesspeople walking to work, "
                 "long warm shadows, jacaranda trees lining the road, dynamic "
                 "urban energy, " + STYLE)),
    dict(id="searcher",   dur=7.5, type="still", motion="in",
         prompt=("Young Kenyan professional woman in her late twenties sitting "
                 "by a window in a dim Nairobi apartment at night, tired and "
                 "worried, scrolling property listings on her smartphone, face "
                 "softly lit by the phone glow, city lights bokeh outside, "
                 "moody and intimate, " + STYLE)),
    dict(id="doubt",      dur=6.5, type="still", motion="in",
         prompt=("Close-up of hands holding a smartphone showing a suspiciously "
                 "perfect faded house photo on a property listing, dim moody "
                 "light, slight tension, out-of-focus cluttered room in the "
                 "background, " + STYLE)),
    dict(id="reveal",     dur=8.0, type="still", motion="out",
         prompt=("Young Kenyan professional woman smiling with quiet relief, "
                 "holding a smartphone glowing with an elegant emerald-green "
                 "real-estate app, bright warm daylight in a modern Nairobi "
                 "apartment, hopeful and confident, " + STYLE)),
    dict(id="trustscore", dur=7.0, type="still", motion="in",
         prompt=("Extreme close-up of hands holding a premium smartphone "
                 "displaying a sleek dark emerald real-estate dashboard with a "
                 "glowing circular gauge and clean minimal charts, soft studio "
                 "lighting, warm blurred background, " + STYLE)),
    dict(id="passport",   dur=7.0, type="still", motion="left",
         prompt=("Close-up of a smartphone held by a young Kenyan man showing "
                 "an elegant emerald-green property profile card with a house "
                 "photo, hand about to share it, warm golden backlight, modern "
                 "cafe setting, " + STYLE)),
    dict(id="landlord",   dur=7.5, type="still", motion="out",
         prompt=("Confident middle-aged Kenyan landlord in a linen shirt "
                 "checking a payment confirmation on his smartphone inside a "
                 "bright modern apartment, keys and lease documents on a wooden "
                 "table, warm morning light, " + STYLE)),
    dict(id="diaspora",   dur=7.5, type="still", motion="right",
         prompt=("Young Kenyan woman on a video call viewing a Nairobi "
                 "apartment, sitting in a cozy modern apartment abroad at "
                 "dusk, warm lamp light, smartphone showing a house, city "
                 "lights through the window behind her, " + STYLE)),
    dict(id="hometour",   dur=8.0, type="still", motion="left",
         prompt=("Interior of a beautiful modern Nairobi apartment bathed in "
                 "warm sunlight, large windows with green trees outside, wooden "
                 "floors, indoor plants, minimal elegant African design, "
                 "serene and inviting, architectural interior photography, "
                 + STYLE)),
    dict(id="keys",       dur=8.0, type="still", motion="in",
         prompt=("Close-up of Kenyan hands exchanging house keys at a sunlit "
                 "apartment doorway, golden backlight halo around the "
                 "doorway, joyful moment of arrival, shallow depth of field, "
                 + STYLE)),
    dict(id="sunset",     dur=8.5, type="video", motion="out",
         label="ACT IV — HOME",
         prompt=("Happy young Kenyan couple relaxing on their apartment "
                 "balcony at golden sunset, Nairobi skyline glowing in the "
                 "distance, warm embrace, glasses raised, deeply content, "
                 + STYLE),
         vprompt=("Slow cinematic dolly shot of a happy young Kenyan couple "
                  "celebrating on an apartment balcony at golden sunset "
                  "overlooking the Nairobi skyline, warm light, gentle camera "
                  "movement, photorealistic")),
    dict(id="endcard",    dur=10.5, type="card", motion="in",
         label=None),
]

# ── Voiceover (calm, evidence-led, quietly confident) ──────────────────────
# cue = seconds into the film (hand-tuned to shot starts, see start_times())
VO = [
    dict(id="L1",  cue=1.6,  text=("Nairobi. Every morning, this city moves. "
                                   "Chasing work, chasing family, chasing home.")),
    dict(id="L2",  cue=13.38, text="But between you and your next home, there are questions."),
    dict(id="L3",  cue=18.44, text="Is the listing real? Is the title clean? Is the price honest?"),
    dict(id="L4",  cue=23.94, text="What if you could see the truth, before you visit?"),
    dict(id="L5",  cue=27.96, text=("This is Keja. Keja is Swahili for home, and Kenya's "
                                   "real-estate intelligence platform.")),
    dict(id="L6a", cue=34.6, text="Every property carries a Trust Score you can interrogate."),
    dict(id="L6b", cue=41.0, text="A Property Passport you can share. Verification you can audit."),
    dict(id="L7",  cue=47.2, text=("Tenants rent homes that actually exist. Landlords "
                                   "collect rent, without the chase.")),
    dict(id="L8",  cue=54.50, text=("Investors see the yield before the money moves. And "
                                   "the diaspora invest in Kenya, from anywhere.")),
    dict(id="L9",  cue=62.96, text=("One app. Three languages. Works offline. Kenya's "
                                   "property market, in your pocket.")),
    dict(id="L10", cue=76.0, text="Keja. Swahili, for home.", speed=0.85),
    dict(id="L11", cue=84.6, text="See the truth before you buy. Find home, at keja dot app.",
         speed=0.95),
]

# ── On-screen motion graphics ───────────────────────────────────────────────
# in/out = appear/disappear (s). pill = rounded chip · kicker = small caps
OVERLAYS = [
    dict(id="ov_stamp",  shot="skyline", in_=1.8, out=6.8,
         kind="stamp", kicker="NAIROBI · 06:42", align="tl"),
    dict(id="ov_doubt",  shot="doubt", in_=1.2, out=5.2,
         kind="big", line1="Is it real?", align="c"),
    dict(id="ov_reveal", shot="reveal", in_=1.6, out=6.8,
         kind="title", kicker="THIS IS", line1="KEJA", line2="Swahili for home",
         align="c"),
    dict(id="ov_score",  shot="trustscore", in_=1.6, out=6.0,
         kind="score", num="92", kicker="TRUST SCORE",
         line1="Evidence, not promises", align="c"),
    dict(id="ov_passport", shot="passport", in_=1.6, out=5.8,
         kind="pill", kicker="PROPERTY PASSPORT", line1="Proof that travels",
         align="bl"),
    dict(id="ov_landlord", shot="landlord", in_=1.6, out=5.8,
         kind="pill", kicker="RENT DAY", line1="Collected. Chased. Done.",
         align="bl"),
    dict(id="ov_diaspora", shot="diaspora", in_=1.6, out=5.8,
         kind="pill", kicker="DIASPORA-READY", line1="Invest from anywhere",
         align="bl"),
    dict(id="ov_home",   shot="hometour", in_=1.8, out=6.4,
         kind="pill", kicker="EVERY HOME", line1="Worth the trip",
         align="bl"),
    dict(id="ov_sig",    shot="sunset", in_=1.8, out=7.0,
         kind="signature", line1="Keja", line2="Swahili for home", align="c"),
]

# ── Edit math ───────────────────────────────────────────────────────────────
def start_times(durs=None):
    """Shot start times on the master timeline (sum - xfade overlaps)."""
    durs = durs or [s["dur"] for s in SHOTS]
    t, out = 0.0, []
    for d in durs:
        out.append(t)
        t += d - XFADE
    return out

def total(durs=None):
    durs = durs or [s["dur"] for s in SHOTS]
    return sum(durs) - XFADE * (len(durs) - 1)

if __name__ == "__main__":
    st = start_times()
    for s, t0 in zip(SHOTS, st):
        print(f"{s['id']:12s} start={t0:6.2f}  dur={s['dur']:4.1f}  type={s['type']}")
    print(f"TOTAL = {total():.2f}s")
    for v in VO:
        print(f"VO {v['id']:4s} @ {v['cue']:6.2f}  {v['text'][:60]}")

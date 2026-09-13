#!/usr/bin/env python3
"""
production.py — single source of truth for the Keja AI product film.

Title:      "See the Evidence" — the Keja AI product film (Edition 2)
Client:     Keja AI by Chacadom (keja.app)
Length:     ~82 seconds master (16:9, 1080p, 30fps)

DIFFERENT FROM THE LAUNCH FILM (Edition 1): every visual is the real
product — screenshots captured from the production site at keja.app in
September 2026, animated with cinematic Ken Burns motion. No AI-generated
b-roll. The product is the film.

Positioning: evidence-led, quietly confident. The consumer promise is
literal: "See the evidence before you buy."
"""

# ── Brand palette ("savanna trust": deep emerald + warm gold on cream) ─────
PALETTE = {
    "emerald":       "#006942",   # primary
    "emerald_deep": "#00442f",
    "gold":          "#9a6d1c",
    "gold_bright":   "#ebb23e",   # hero accent on dark
    "gold_soft":    "#f7eac8",
    "ink":           "#182721",
    "cream":         "#fdfcf9",
    "white":         "#ffffff",
    "scrim":         "#0b1512",   # dark scrim under overlays
}

# ── Edit constants ──────────────────────────────────────────────────────────
W, H       = 1920, 1080
FPS        = 30
XFADE      = 0.7          # crossfade between shots (s)
FADE_IN    = 1.0          # from black
FADE_OUT   = 1.6          # to black at end
SR         = 48000         # audio sample rate (stereo)
SHOTS_DIR  = "/home/z/my-project/ad_build/shots"     # captured screenshots
BUILD      = "/home/z/my-project/ad_build/film"      # working dir

# ── Shots ───────────────────────────────────────────────────────────────────
# type: shot  -> real product screenshot + Ken Burns | card -> PIL-designed
# motion: in | out | left | right (Ken Burns direction)
SHOTS = [
    # ACT I — THE COLD OPEN (this is the real product, live)
    dict(id="hero",        dur=8.0, type="shot", motion="in",
         src="01-home-hero.png",
         label="ACT I — THE COLD OPEN"),
    # ACT II — THE QUERY (ask like a human)
    dict(id="nlsearch",    dur=8.5, type="shot", motion="right",
         src="05-nl-search.png",
         label="ACT II — THE QUERY"),
    dict(id="marketplace", dur=5.0, type="shot", motion="left",
         src="04-properties.png",
         label="ACT II — THE QUERY"),
    # ACT III — THE EVIDENCE (the core reveal: trust + evidence + AI)
    dict(id="trustscore",  dur=9.0, type="shot", motion="in",
         src="07-trust-score.png",
         label="ACT III — THE EVIDENCE"),
    dict(id="evidence",    dur=7.5, type="shot", motion="right",
         src="08-evidence.png",
         label="ACT III — THE EVIDENCE"),
    dict(id="ask",         dur=8.5, type="shot", motion="in",
         src="10-ask-answer.png",
         label="ACT III — THE EVIDENCE"),
    # ACT IV — THE TOOLKIT (the numbers, honestly labelled)
    dict(id="deal",        dur=8.0, type="shot", motion="out",
         src="11-deal-analyst.png",
         label="ACT IV — THE TOOLKIT"),
    dict(id="invest",      dur=5.0, type="shot", motion="in",
         src="12-invest.png",
         label="ACT IV — THE TOOLKIT"),
    dict(id="marketdata",  dur=4.5, type="shot", motion="left",
         src="13-market-data.png",
         label="ACT IV — THE TOOLKIT"),
    # ACT V — THE REACH (diaspora + the register + the close)
    dict(id="diaspora",    dur=10.0, type="shot", motion="in",
         src="15-diaspora.png",
         label="ACT V — THE REACH"),
    dict(id="trustcenter", dur=10.5, type="shot", motion="out",
         src="14-trust-center.png",
         label="ACT V — THE REACH"),
    dict(id="stats",       dur=7.5, type="shot", motion="in",
         src="03-home-stats.png",
         label="ACT V — THE REACH"),
    dict(id="endcard",     dur=9.5, type="card", motion="in",
         src=None,
         label="END CARD"),
]

# ── Voiceover — product-specific, every line anchored to a real surface ────
# off = seconds into the owning shot; gen_vo.py turns these into absolute cues.
VO = [
    dict(id="L1",  shot="hero",       off=1.4, speed=1.0,
         text="This is Keja dot app — live, right now."),
    dict(id="L2",  shot="nlsearch",  off=0.8, speed=0.98,
         text="Ask it like a human. Two-bed in Kilimani, under fifteen million."),
    dict(id="L3",  shot="trustscore", off=0.8, speed=0.98,
         text=("Every listing carries a Trust Score — twelve factors, each one "
               "labelled fact, estimate, or assumption.")),
    dict(id="L4",  shot="evidence",   off=0.8, speed=0.98,
         text="Open the evidence. Check the dates, the scope, the method — and challenge anything."),
    dict(id="L5",  shot="ask",        off=0.8, speed=0.98,
         text=("Ask Keja answers in plain language — with citations, and the "
               "honesty to escalate what it shouldn't answer.")),
    dict(id="L6",  shot="deal",       off=0.6, speed=1.0,
         text="Run the deal. Yields, mortgage math, market bands — every number says what it is."),
    dict(id="L7",  shot="diaspora",   off=0.8, speed=0.98,
         text=("And the diaspora can buy home from abroad — viewings across "
               "time zones, and a Power of Attorney checklist that works.")),
    dict(id="L8",  shot="trustcenter", off=0.8, speed=0.98,
         text=("The Trust Center publishes exactly what is live, what is "
               "simulated, and what is planned. In public. In code.")),
    dict(id="L9",  shot="stats",      off=0.4, speed=0.92,
         text="Keja — Swahili for home. Discover. Verify. Transact."),
    dict(id="L10", shot="endcard",   off=1.6, speed=0.95,
         text="See the evidence before you buy. Keja, at keja dot app."),
]

# ── On-screen motion graphics (kinetic overlays over the real UI) ───────────
# in_/out = seconds relative to the shot's own start.
# kind: pill = rounded chip · kicker = small caps, centered ·
#       score = trust-score dial chip · query = typed search string
OVERLAYS = [
    dict(id="ov_live",    shot="hero",       in_=1.6, out=6.6,
         kind="kicker", kicker="KEJA.APP · LIVE", line1="The product is the film",
         align="c"),
    dict(id="ov_query",  shot="nlsearch",   in_=1.2, out=7.3,
         kind="query", kicker="ASK LIKE A HUMAN",
         line1="2BR Kilimani under 15M", align="bl"),
    dict(id="ov_scale",   shot="marketplace", in_=0.9, out=3.8,
         kind="pill", kicker="DISCOVER", line1="Every card carries its score",
         align="bl"),
    dict(id="ov_score",   shot="trustscore", in_=1.4, out=7.6,
         kind="score", num="12", kicker="TRUST SCORE FACTORS",
         line1="Every one labelled", align="c"),
    dict(id="ov_evid",    shot="evidence",   in_=1.0, out=6.3,
         kind="pill", kicker="THE EVIDENCE PANEL",
         line1="FACT · ESTIMATE · ASSUMPTION", align="bl"),
    dict(id="ov_ask",     shot="ask",        in_=1.0, out=6.3,
         kind="pill", kicker="ASK KEJA AI",
         line1="Answers with citations", align="bl"),
    dict(id="ov_numbers", shot="deal",       in_=0.9, out=4.4,
         kind="pill", kicker="DEAL ANALYST",
         line1="Every number says what it is", align="bl"),
    dict(id="ov_invest",  shot="invest",      in_=0.8, out=3.9,
         kind="pill", kicker="INVESTMENT MATH",
         line1="Yields · Mortgage · Affordability", align="bl"),
    dict(id="ov_data",    shot="marketdata", in_=0.8, out=3.5,
         kind="pill", kicker="MARKET DATA",
         line1="Area bands, honestly sourced", align="bl"),
    dict(id="ov_diaspora", shot="diaspora",  in_=1.0, out=5.3,
         kind="pill", kicker="DIASPORA-READY",
         line1="UK · US · UAE corridors", align="bl"),
    dict(id="ov_register", shot="trustcenter", in_=1.0, out=6.3,
         kind="pill", kicker="THE CLAIMS REGISTER",
         line1="Live · Simulated · Planned — in public", align="bl"),
    dict(id="ov_stats",   shot="stats",      in_=0.7, out=3.6,
         kind="pill", kicker="ONE ECOSYSTEM",
         line1="Nine products, one trust spine", align="bl"),
]

# ── Edit math ───────────────────────────────────────────────────────────────

def shot_starts():
    """Global start time of every shot (xfade overlap accounted)."""
    starts, t = [], 0.0
    for s in SHOTS:
        starts.append(t)
        t += s["dur"] - XFADE
    return starts


def total():
    starts = shot_starts()
    return starts[-1] + SHOTS[-1]["dur"]


def vo_cues():
    """Absolute cue time of every VO line from shot offsets."""
    starts = dict(zip([s["id"] for s in SHOTS], shot_starts()))
    return {ln["id"]: starts[ln["shot"]] + ln["off"] for ln in VO}


if __name__ == "__main__":
    starts = shot_starts()
    for s, t in zip(SHOTS, starts):
        print(f"{t:7.2f}  {s['id']:12s} {s['dur']:4.1f}s  {s['label']}")
    print(f"TOTAL: {total():.1f}s")
    cues = vo_cues()
    for ln in VO:
        print(f"  VO {ln['id']} @ {cues[ln['id']]:6.2f}  {ln['text'][:60]}")

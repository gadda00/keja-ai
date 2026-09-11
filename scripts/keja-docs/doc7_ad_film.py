#!/usr/bin/env python3
"""
doc7_ad_film.py — "See the Truth" Launch Film — Video Production Task File.
Report route (pdf skill) via the proven Keja document kit. Content is driven
by production.py (the film's single source of truth) so the document always
matches the delivered master.
"""
import os, sys

sys.path.insert(0, "/home/z/my-project/scripts/keja-ad")
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
import production as P
from keja_pdf_kit import (
    S, body, bullets, build_doc, callout_row, h1_block, h2_block, lead,
    make_table, mark_body_start, quote_box, Spacer, write_cover, render_cover,
    merge_cover, AVAIL_W,
)
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Image, Paragraph, Table, TableStyle

SB = "/home/z/my-project/ad_build/storyboard"
BODY  = "/home/z/my-project/scripts/keja-docs/doc7_body.pdf"
HTML  = "/home/z/my-project/scripts/keja-docs/doc7_cover.html"
COVER = "/home/z/my-project/scripts/keja-docs/doc7_cover.pdf"
FINAL = "/home/z/my-project/download/Keja_AI_Ad_Film_Task_File.pdf"

starts = P.start_times()
total = P.total()


def tc(t):
    return f"{int(t // 60):01d}:{int(t % 60):02d}"


SHOT_N = {s["id"]: i + 1 for i, s in enumerate(P.SHOTS)}
VO_BY_SHOT = {}
for v in P.VO:
    for i, s in enumerate(P.SHOTS):
        end = starts[i + 1] if i + 1 < len(P.SHOTS) else total
        if starts[i] <= v["cue"] < end:
            VO_BY_SHOT.setdefault(s["id"], []).append(v)
            break
OV_BY_SHOT = {}
for o in P.OVERLAYS:
    OV_BY_SHOT.setdefault(o["shot"], []).append(o)

story = []

# ── 1. Mandate & deliverables ───────────────────────────────────────────────
story += h1_block("Mandate & Deliverables", chapter="1", first_para=lead(
    "This task file defines, end to end, the launch film for Keja AI — a 93-second "
    "brand advertisement for keja.app, produced to a premium standard and delivered "
    "as a 1080p master. It is written as a hand-off document: a director, editor, "
    "motion designer or AI-assisted production pipeline can rebuild or extend the "
    "film from this file alone. The master described here has already been produced "
    "and QA'd; the specifications, cue sheet and storyboard below describe it exactly "
    "as delivered."))
story.append(body(
    "The brief from the client was one sentence: a super amazing, spectacular "
    "advertisement, one to two minutes long. The strategy chapters translate that "
    "into a disciplined creative brief — because the brand's positioning demands "
    "calm, evidence-led confidence rather than hype — and the production chapters "
    "then execute at full cinematic ambition. The result is a film of two registers: "
    "quiet human moments shot like a documentary, and a product story told with "
    "the visual grammar of premium fintech advertising."))
story += make_table(
    ["Deliverable", "Specification", "Status"],
    [["Master film", "1920 x 1080 · 30 fps · 92.6 s · H.264 CRF 18 · AAC 192k "
      "audio · -14 LUFS", "Delivered — Keja_AI_Launch_Film_1080p.mp4"],
     ["Production task file", "This document (creative brief, cue sheet, "
      "storyboard, specs, pipeline)", "Delivered"],
     ["Vertical cutdown 9:16", "Re-edit for TikTok / Reels / Shorts, 30 s", "Planned"],
     ["Square cutdown 1:1", "Feed placements, 20 s", "Planned"],
     ["Kiswahili voiceover", "Alternate VO track on the same master", "Planned"],
     ["Captioned variant", "Burned-in English captions for sound-off viewing", "Planned"]],
    ratios=[0.22, 0.50, 0.28],
    caption="Table 1.1 — Deliverables register.")
story.append(body(
    "Success is measured against the marketing playbook's ninety-day awareness "
    "targets: 250,000 cumulative video views, 3,000 PWA installs and 40,000 "
    "verified-listing views. The film is the top of that funnel — its job is to "
    "plant one idea (Keja shows you the truth before you buy or rent) and make "
    "one action obvious (go to keja.app)."))

# ── 2. Strategy & positioning ──────────────────────────────────────────────
story += h1_block("Strategy & Positioning", chapter="2", first_para=lead(
    "Kenya's property market is urbanising fast and chronically opaque. Portals "
    "monetise attention and leave trust to the buyer; agencies serve institutions "
    "at institutional prices; the informal channel moves most volume with zero "
    "tooling. Nobody owns the trust layer. Keja attacks that gap — not more "
    "listings, but listings you can act on."))
story.append(quote_box(
    "For every stakeholder in Kenyan real estate tired of guessing, Keja AI is the "
    "trust infrastructure that verifies properties, scores them transparently and "
    "guides the money — because a home is too expensive to buy on faith."))
story.append(body(
    "The film therefore leads with verification and evidence, never listing counts. "
    "Its consumer tagline — See the truth before you buy — is the emotional spine "
    "of the whole edit: the first act dramatises the questions every Kenyan renter "
    "and buyer already carries, and the moment of brand reveal answers them. The "
    "tone is calm, quietly confident, anti-hype: no countdowns, no urgency, no "
    "promised returns. Warmth comes from the Swahili meaning of the name — keja "
    "is home."))
story += make_table(
    ["Audience", "Trigger", "What the film shows them"],
    [["Tenants 22-35", "Moving to Nairobi", "A renter who finds a home that actually exists"],
     ["First-time buyers 28-38", "Saved deposit; fear of being conned", "Trust Score and title questions answered on screen"],
     ["Landlords 35-60", "Arrears, agent mistrust", "Rent collected without the chase"],
     ["Investors & diaspora 25-60", "Yield opacity; cannot inspect from abroad", "Yields with receipts; investing in Kenya from anywhere"]],
    ratios=[0.24, 0.34, 0.42],
    caption="Table 2.1 — Primary audiences and the scene that converts them.")
story.append(body(
    "Placement strategy follows the playbook's channel map: the 16:9 master anchors "
    "YouTube pre-roll, the website hero and investor decks; the 9:16 cutdown carries "
    "TikTok and Reels where the 22-35 tenant audience lives; WhatsApp shares are "
    "powered by the Property Passport moment, which doubles as a product demo. The "
    "film's question motif (Is it real? Is it clean? Is it honest?) is designed to "
    "be lifted as standalone social teasers."))

# ── 3. The creative concept ────────────────────────────────────────────────
story += h1_block("The Creative Concept", chapter="3", first_para=lead(
    "Title: See the Truth. Logline: In a city of four million dreamers, the search "
    "for home shouldn't be a gamble — Keja shows you the truth before you visit, "
    "and hands you the keys with evidence behind them."))
story.append(body(
    "The edit is built as a five-act drama in ninety-three seconds. Act One "
    "establishes the city and its morning energy — Nairobi as a character, not a "
    "backdrop. Act Two narrows to one woman's search and the three questions every "
    "renter silently asks. Act Three is the turn: the brand reveal lands with a "
    "musical key change from minor to major, and the product proves itself — Trust "
    "Score, Property Passport, verification you can audit. Act Four widens the "
    "frame to everyone the platform serves: landlords, investors, the diaspora. "
    "Act Five resolves emotionally — keys exchanged at a sunlit door, a couple on "
    "a balcony at golden hour, and the signature line: Keja. Swahili for home."))
story += make_table(
    ["Act", "Time", "Emotional job", "Signature moment"],
    [["I — The City", "0:00-0:13", "Belonging, scale, morning hope", "Aerial dawn over Nairobi; NAIROBI · 06:42 stamp"],
     ["II — The Search", "0:13-0:26", "Recognition of doubt", "'Is it real?' set in serif over the listing"],
     ["III — The Reveal", "0:26-0:46", "Relief, belief", "THIS IS KEJA title + minor-to-major key change"],
     ["IV — Everyone", "0:46-0:67", "Inclusion, momentum", "Feature pills: Rent Day · Diaspora-Ready"],
     ["V — Home", "0:67-1:33", "Warmth, resolution", "Keja — Swahili for home; end card with keja.app"]],
    ratios=[0.16, 0.13, 0.28, 0.43],
    caption="Table 3.1 — Five-act structure of the 93-second edit.")
story.append(body(
    "Three devices hold the film together. First, the question motif — the same "
    "three questions asked in voice-over, typography and product answer. Second, "
    "light as proof: Acts One and Two are graded cool and dim; from the reveal "
    "onward every frame warms — the product literally brings daylight into the "
    "story. Third, the Swahili signature: the name is explained once in Act Three "
    "and then allowed to land alone, in silence, over the sunset in Act Five."))

# ── 4. The script — master cue sheet ────────────────────────────────────────
story += h1_block("The Script — Master Cue Sheet", chapter="4", first_para=lead(
    "The cue sheet is the contract between picture, voice and graphics. Times are "
    "the delivered master's. Voice-over lines are recorded calm and unhurried "
    "(average pace about 140 words per minute) — the edit breathes around them "
    "rather than racing them."))
cue_rows = []
for i, s in enumerate(P.SHOTS):
    end = starts[i + 1] if i + 1 < len(P.SHOTS) else total
    vo = " ".join(v["text"] for v in VO_BY_SHOT.get(s["id"], []))
    ovs = OV_BY_SHOT.get(s["id"], [])
    ost = "; ".join(
        (o.get("kicker", "") + " " + o.get("line1", "")).strip()
        or o.get("line1", "") or (o.get("kicker", "") or "")
        for o in ovs)
    label = {"still": "Ken Burns", "video": "AI motion clip",
             "card": "Designed card"}[s["type"]]
    cue_rows.append([f"{tc(starts[i])}", f"{s['id']} · {label}",
                     vo if vo else "— (music only)", ost if ost else "—"])
story += make_table(
    ["Time", "Picture", "Voice-over", "On-screen text"],
    cue_rows, ratios=[0.08, 0.22, 0.44, 0.26], font=8.5,
    caption="Table 4.1 — Master cue sheet as delivered (92.6 s, 30 fps).")
story.append(body(
    "The narration's final two beats are the only hard-sell moments, and they are "
    "earned: after sixty seconds of proof, the tagline and the call to action "
    "arrive while the end card is already on screen, so the viewer reads and hears "
    "the same instruction — find home at keja.app."))

# ── 5. Storyboard ───────────────────────────────────────────────────────────
story += h1_block("Storyboard", chapter="5", first_para=lead(
    "Thirteen shots carry the film. Two are true AI-generated motion clips (the "
    "opening aerial and the sunset finale); ten are AI cinematography stills "
    "animated with Ken Burns moves (slow push-ins, pull-backs and lateral pans); "
    "the last is the designed end card. Frames below are lifted from the delivered "
    "master at each shot's mid-point."))
DESCR = {
    "skyline": "Aerial dawn over the Nairobi skyline; KICC silhouetted; first "
               "light and morning haze.",
    "streets": "Morning golden hour on a Nairobi street; matatu with painted "
               "artwork; businesspeople walking.",
    "searcher": "Night interior; a young professional scrolls listings; face "
                "lit by the phone; city bokeh outside.",
    "doubt": "Close-up on hands holding a listing photo that looks too good to "
             "be true; dim, doubting mood.",
    "reveal": "The turn: she smiles with quiet relief; the phone glows emerald; "
              "THIS IS KEJA title lands.",
    "trustscore": "Product hero: a premium phone against deep emerald; abstract "
                  "light-lines form the gauge; 92 TRUST SCORE overlay.",
    "passport": "Sharing proof: the Property Passport card about to leave the "
                "phone; warm cafe backlight.",
    "landlord": "Rent day: a landlord in linen checks a payment confirmation; "
                "keys and lease on the table.",
    "diaspora": "Timezone-bridged trust: a video-call viewing from an apartment "
                "abroad at dusk.",
    "hometour": "The reward: a sunlit modern Nairobi apartment — light as proof "
                "of a real, verified home.",
    "keys": "Hands exchange keys in a sunlit doorway; golden backlight halo; "
            "music swells, no narration.",
    "sunset": "Finale motion clip: the couple on their balcony at golden hour; "
              "the signature line lands.",
    "endcard": "Designed end card: emerald gradient, logo tile, wordmark, "
               "tagline, gold keja.app pill, languages.",
}
rows, cells, widths = [], [], [1.55 * inch, AVAIL_W - 1.55 * inch - 8]
for i, s in enumerate(P.SHOTS):
    img_path = f"{SB}/{i + 1:02d}_{s['id']}.png"
    thumb = Image(img_path, width=1.45 * inch, height=0.815 * inch)
    end = starts[i + 1] if i + 1 < len(P.SHOTS) else total
    info = Paragraph(
        f"<b>Shot {i + 1:02d} · {s['id'].upper()}</b> &nbsp;·&nbsp; "
        f"{tc(starts[i])}-{tc(end)} ({s['dur']:.1f} s) &nbsp;·&nbsp; "
        f"{ {'still': 'Ken Burns ' + s['motion'], 'video': 'AI motion clip',
             'card': 'designed card'}[s['type']] }<br/>{DESCR[s['id']]}",
        S["td"])
    rows.append([thumb, info])
    cells.append([thumb, info])
sb_table = Table(cells, colWidths=widths, hAlign="CENTER")
sb_style = [
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor("#b8c8cf")),
]
for r in range(0, len(cells), 2):
    sb_style.append(("BACKGROUND", (0, r), (-1, r), colors.HexColor("#ebedee")))
sb_table.setStyle(TableStyle(sb_style))
story += [Spacer(1, 6), sb_table, Spacer(1, 4),
          Paragraph("Figure 5.1 — Storyboard as delivered (frames from the "
                    "master at each shot mid-point).", S["caption"])]
story.append(body(
    "Casting note: the protagonist is a young Kenyan professional woman — the "
    "tenant persona the film must convert. Landlord, diaspora investor and "
    "developer personas each receive one dedicated shot in Act Four, so every "
    "primary audience sees themselves on screen before the film ends."))

# ── 6. Art direction ────────────────────────────────────────────────────────
story += h1_block("Art Direction", chapter="6", first_para=lead(
    "The visual identity is the brand's savanna-trust system: deep emerald for "
    "growth and trust, warm gold for premium and sun, on cream. In the film these "
    "appear as the grade (amber highlights against deep-teal shadows), the motion "
    "graphics (gold kickers, cream serif italics) and the emerald end card."))
PAL = [
    ("Emerald", P.PALETTE["emerald"], "#FFFFFF"),
    ("Emerald deep", P.PALETTE["emerald_deep"], "#FFFFFF"),
    ("Emerald chart", P.PALETTE["emerald_chart"], "#FFFFFF"),
    ("Warm gold (bright)", P.PALETTE["gold_bright"], "#182721"),
    ("Gold", P.PALETTE["gold"], "#FFFFFF"),
    ("Ink", P.PALETTE["ink"], "#FFFFFF"),
    ("Cream", P.PALETTE["cream"], "#182721"),
    ("Gold soft", P.PALETTE["gold_soft"], "#182721"),
]
def _hex(h):
    h = h.lstrip("#")
    return colors.HexColor("#" + h)
sw_cells = [[], []]
for i, (name, hx, txt) in enumerate(PAL):
    sw_cells[i // 4].append(Paragraph(
        f"<b>{name}</b><br/>{hx}",
        ParagraphStyle(f"sw{i}", parent=S["stat_label"], fontSize=7.6,
                       textColor=colors.HexColor(txt), alignment=1, leading=10)))
sw = Table(sw_cells, colWidths=[AVAIL_W / 4.0] * 4, hAlign="CENTER")
sw_style = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]
for i, (name, hx, txt) in enumerate(PAL):
    sw_style.append(("BACKGROUND", (i % 4, i // 4), (i % 4, i // 4), _hex(hx)))
sw.setStyle(TableStyle(sw_style))
story += [Spacer(1, 6), sw, Spacer(1, 4),
          Paragraph("Figure 6.1 — Film palette, derived from the product's "
                    "design tokens (oklch values converted to sRGB).",
                    S["caption"])]
story += h2_block("Typography", first=body(
    "Display and kickers are set in a bold grotesque (DejaVu Sans Bold in the "
    "delivered master; Inter or Söhne Bold in any live-action re-shoot) with "
    "generous letter tracking for small-caps kickers. Human moments — Is it "
    "real?, Swahili for home — are set in a serif bold italic to carry warmth "
    "and editorial calm. Feature pills use dark translucent panels with a gold "
    "left edge and tracked gold kickers, so the product story reads in one "
    "glance even at thumbnail size."))
story += h2_block("Grade & camera rules", first=body(
    "Acts I-II sit cool and dim (teal shadows, restrained saturation); the "
    "reveal onward warms toward amber highlights; the finale is fully golden. "
    "Everything is shot or graded like 35 mm film: shallow depth of field, "
    "volumetric haze, subtle grain (the master adds 3-percent film grain "
    "uniformly so AI stills and motion clips share one texture). Camera moves "
    "are slow and deliberate — push-ins under 10 percent, pans that never "
    "outrun the narration. The end card is the only flat-graphic frame, which "
    "makes it read as the film's signature."))

# ── 7. Sound design ────────────────────────────────────────────────────────
story += h1_block("Sound Design", chapter="7", first_para=lead(
    "The delivered master carries one narration voice and one original score, "
    "mixed to web loudness. No stock music is used anywhere: the score, Savanna "
    "Dawn, was composed and synthesised for this film — a Kenyan marimba motif "
    "over cinematic pads, sub bass, soft shaker and kick."))
story += make_table(
    ["Element", "Specification as delivered"],
    [["Narration", "Female voice, calm professional register (voice id 'xiaochen'); "
      "English; about 140 wpm; 70 Hz high-pass; 12 lines, head-silence trimmed for "
      "frame-accurate cues"],
     ["Score — Savanna Dawn", "96 BPM, A minor to C major; marimba motif, warm pads, "
      "sub bass, shaker, soft kick; 270-degree key change at the 26 s reveal"],
     ["Ducking", "Score ducks to 38 percent under narration with 250 ms ramps, "
      "baked into the render"],
     ["Loudness", "Master normalised to -14 LUFS integrated, true peak -1.5 dB, "
      "LRA 11 (web standard)"],
     ["Silence", "The keys moment (1:07-1:14) is narration-free by design — the "
      "score swells alone"]],
    ratios=[0.22, 0.78],
    caption="Table 7.1 — Audio specification as delivered.")
story.append(body(
    "The score's structure mirrors the five acts: a sparse dawn motif over the "
    "aerial; a questioning pattern while she scrolls; a riser into the reveal; a "
    "full groove through the product montage; a stripped-back breath under the "
    "keys; and the motif's return, alone, under the end card. If the film is "
    "recut for 30-second cutdowns, the reveal impact and the motif's return are "
    "the two beats that must survive any edit."))

# ── 8. Technical specifications ─────────────────────────────────────────────
story += h1_block("Technical Specifications", chapter="8", first_para=lead(
    "The master is delivered web-first: H.264 high profile in an MP4 container "
    "with faststart, so playback begins before the file finishes downloading on "
    "Kenyan mobile networks. All cutdowns should re-encode from the master's "
    "filtergraph, not from the encoded file, to avoid generation loss."))
story += make_table(
    ["Parameter", "Master (delivered)", "Cutdowns (planned)"],
    [["Duration", "92.6 s (1:33)", "30 s vertical · 20 s square"],
     ["Resolution / rate", "1920 x 1080 · 30 fps CFR", "1080 x 1920 · 30 fps · 1080 x 1080"],
     ["Video codec", "H.264 High, CRF 18, faststart", "H.264 High, CRF 18-20"],
     ["Audio", "AAC 192 kbps · 48 kHz stereo", "AAC 128-160 kbps"],
     ["Loudness", "-14 LUFS · TP -1.5 dB", "same"],
     ["Captions", "Burned-in variant planned (sound-off feeds)", "burned-in, 2-line safe area"],
     ["Safe areas", "Graphics inside 5 percent margins", "keep text out of top/bottom 15 percent"]],
    ratios=[0.18, 0.42, 0.40],
    caption="Table 8.1 — Delivery specifications.")
story.append(body(
    "Vertical reframing guidance: the master's compositions centre their "
    "subjects, so a 9:16 centre-crop preserves every hero moment except the "
    "aerial; for that shot the cutdown should generate a portrait-framed motion "
    "clip rather than crop. Feature pills must be re-laid-out for the vertical "
    "safe area rather than scaled, and the Trust Score gauge should sit in the "
    "upper third where TikTok's UI does not cover it."))

# ── 9. Production pipeline (as built) ──────────────────────────────────────
story += h1_block("Production Pipeline — As Built", chapter="9", first_para=lead(
    "The film was produced with an AI-assisted pipeline in which every creative "
    "decision — script, casting, framing, music, typography, edit — was art "
    "directed, and every generated asset passed an automated perceptual QA gate "
    "before conform. The stage list below is the reproducible recipe."))
story += make_table(
    ["Stage", "Tooling", "Quality gate"],
    [["Script & cue math", "production.py (single source of truth)", "Cue/overlap simulation"],
     ["Cinematography", "Text-to-image, 1344 x 768, shared grade prompt", "Vision-model review: faces, hands, watermark, garbled text"],
     ["Motion clips", "CogVideoX-class text-to-video, 1920 x 1080, 10 s", "Frame extraction + vision review"],
     ["Narration", "Neural TTS (calm female), 12 takes", "ASR round-trip — transcription must match the script"],
     ["Score", "numpy synthesis (marimba, pads, bass, shaker, kick)", "Waveform inspection + mix automation"],
     ["Motion graphics", "PIL: pills, gauge, reveal, end card (brand tokens)", "Vision review for clipping/overlap"],
     ["Conform", "ffmpeg filtergraph: Ken Burns, xfade, overlays, grade, grain, loudnorm", "Stream probe + frame spot-checks + final ASR of the mix"]],
    ratios=[0.16, 0.42, 0.42], font=8.8,
    caption="Table 9.1 — As-built pipeline and its quality gates.")
story.append(body(
    "Two production rules earned their place during the build. First, AI "
    "cinematography must never carry readable text: the UI shots are rendered "
    "as abstract light, and all readable product claims (92 TRUST SCORE, "
    "PROPERTY PASSPORT) are typographic overlays — crisp, brand-true, and "
    "localisable. Second, generated imagery of Kenya must be checked for "
    "authenticity artifacts (a matatu's licence plate garbles easily); one "
    "retake loop was spent exactly there, and the pass rate reached one "
    "hundred percent only after prompts excluded small text."))

# ── 10. Distribution & measurement ─────────────────────────────────────────
story += h1_block("Distribution & Measurement", chapter="10", first_para=lead(
    "The film launches the playbook's ninety-day calendar. In weeks one to "
    "four it anchors the trust story; the awareness KPI is 250,000 cumulative "
    "views across placements, with 3,000 PWA installs as the downstream "
    "signal that the film's single call to action is working."))
story += make_table(
    ["Placement", "Cut", "First-90-days tactic"],
    [["YouTube pre-roll + brand channel", "16:9 master", "Target renters and diaspora; end-card 5 s hold for skip-rate data"],
     ["Website hero (keja.app)", "16:9 master, muted autoplay", "Captions on by default; InstallPrompt follows the end card"],
     ["TikTok / Reels / Shorts", "9:16 cutdown", "Open on 'Is it real?'; tie to the 'Scam or legit?' series"],
     ["Instagram feed & stories", "1:1 cutdown", "Passport carousels retell the Act III product beats"],
     ["WhatsApp", "Shared links + Passport cards", "Share-to-chat from the film's own sharing moment"],
     ["Investor & partner decks", "16:9 master", "Trust Score and diaspora beats are the stills to pull"]],
    ratios=[0.28, 0.20, 0.52], font=8.8,
    caption="Table 10.1 — Placement map for the launch quarter.")
story.append(body(
    "Measurement follows the playbook's honesty principle: views are reported "
    "with placement breakdowns, installs are attributed through the PWA install "
    "prompt, and no metric is claimed without its sample. The film's immediate "
    "next actions are the vertical cutdown, the Kiswahili narration track — "
    "the same edit, re-voiced, since the cue sheet is duration-locked — and "
    "captioned variants for sound-off feeds, in that order."))

# ── build ────────────────────────────────────────────────────────────────────
mark_body_start(story)
build_doc(story, BODY,
          "Keja AI Launch Film — Video Production Task File",
          "Creative brief, cue sheet, storyboard, art direction, sound design, "
          "technical specifications and distribution plan for the Keja AI "
          "launch film 'See the Truth'")

write_cover(
    HTML,
    kicker="Brand Campaign · Launch Film Task File",
    hero="SEE THE<br>TRUTH",
    summary="The complete production task file for Keja AI's 93-second launch "
            "film: strategy, five-act creative, timecoded cue sheet, storyboard, "
            "art direction, sound design, technical specs and distribution — "
            "the film rebuildable from this document alone.",
    meta="Film: See the Truth · Master v1.0 · 92.6 s<br>"
         "<span class='lbl'>A Chacadom Investments venture</span><br>"
         "<span class='lbl'>September 2026</span>",
)
render_cover(HTML, COVER)
merge_cover(COVER, BODY, FINAL,
            "Keja AI Launch Film — Video Production Task File",
            "Production task file for the Keja AI launch film 'See the Truth'")
print("FINAL:", FINAL)

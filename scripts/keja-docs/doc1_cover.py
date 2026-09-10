#!/usr/bin/env python3
"""Doc 1 cover — write, validate, render, merge."""
import sys
sys.path.insert(0, "/home/z/my-project/scripts/keja-docs")
from keja_pdf_kit import (  # noqa: E402
    merge_cover, render_cover, write_cover,
)

HTML = "/home/z/my-project/scripts/keja-docs/doc1_cover.html"
COVER_PDF = "/home/z/my-project/scripts/keja-docs/doc1_cover.pdf"
BODY_PDF = "/home/z/my-project/download/keja-repo-picture-body.pdf"
FINAL = "/home/z/my-project/download/keja-repo-picture.pdf"

write_cover(
    HTML,
    kicker="Engineering Dossier &middot; The Complete Repository Picture",
    hero="KEJA AI",
    summary="The full engineering picture of gadda00/keja-ai: architecture, the nine-product "
            "module map, the Auto-Pilot data pipeline, PWA internals, quality gates and "
            "deployment — one repository, three runtimes, zero unanswered questions.",
    meta="Prepared by the Keja AI engineering team<br>"
         "<span class='lbl'>gadda00/keja-ai &middot; main @ ab30a10</span><br>"
         "<span class='lbl'>10 September 2026</span>",
)

stage = sys.argv[1] if len(sys.argv) > 1 else "all"
if stage in ("render", "all"):
    render_cover(HTML, COVER_PDF)
if stage in ("merge", "all"):
    merge_cover(COVER_PDF, BODY_PDF, FINAL,
                "The Repository Picture — Keja AI Engineering Dossier",
                "Complete engineering documentation of the keja-ai repository")
    print("FINAL:", FINAL)

#!/usr/bin/env python3
"""release.py — publish the product film + Edition-2 documents as a GitHub
release (product-film-v2), replacing the launch-film-v1 release. (curl-based)"""
import json
import os
import re
import subprocess
import sys

REPO = "gadda00/keja-ai"

TOKEN = None
url = subprocess.run(["git", "config", "--get", "remote.origin.url"],
                     capture_output=True, text=True).stdout.strip()
m = re.search(r"https://[^:]*:([^@]+)@", url)
if m:
    TOKEN = m.group(1)
if not TOKEN and os.environ.get("GITHUB_TOKEN"):
    TOKEN = os.environ["GITHUB_TOKEN"]
if not TOKEN:
    sys.exit("no token found")


def curl(method, path, data=None, ctype="application/json", raw_file=None):
    cmd = ["curl", "-s", "-X", method,
           "-H", f"Authorization: token {TOKEN}",
           "-H", "Accept: application/vnd.github+json",
           "-H", f"Content-Type: {ctype}",
           "--max-time", "580"]
    if data is not None:
        cmd += ["-d", json.dumps(data)]
    elif raw_file is not None:
        cmd += ["--data-binary", f"@{raw_file}"]
    cmd.append(path)
    r = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(r.stdout) if r.stdout.strip() else {}
    except json.JSONDecodeError:
        print("RAW:", r.stdout[:500])
        return {}


# 1. delete the old release + its tag (the launch film it carried is retired)
rels = curl("GET", f"https://api.github.com/repos/{REPO}/releases")
for r in rels if isinstance(rels, list) else []:
    if r.get("tag_name") == "launch-film-v1":
        curl("DELETE", f"https://api.github.com/repos/{REPO}/releases/{r['id']}")
        print("deleted release launch-film-v1")
curl("DELETE", f"https://api.github.com/repos/{REPO}/git/refs/tags/launch-film-v1")
print("deleted tag launch-film-v1 (if it existed)")

# 2. create the new release
NOTES = """**See the Evidence — the Keja AI product film (93 s, 1080p30)**

Every frame is the real product: screenshots captured live from [keja.app](https://keja.app) in September 2026 — the natural-language search answering *"2BR Kilimani under 15M"*, the twelve-factor Trust Score, the evidence panel, Ask Keja's cited answers, the Deal Analyst, the Diaspora Hub and the public claims register — animated with cinematic Ken Burns motion, kinetic brand overlays, an original synthesized score and a narration written for this product.

**Also in this release — the Edition-2 document suite:**
- `Keja_Marketing_Playbook_v2.pdf` — product-anchored marketing (live screenshots, researched market data, 90-day gated calendar)
- `Keja_Strategy_v2.pdf` — trust-infrastructure strategy; phase gates are claims-register flips
- `Keja_Partner_Proposals_v2.pdf` — six researched partnership tracks with named targets

*The previous launch film (AI-generated b-roll) has been retired — this is the product, and the product is the film.*
"""
rel = curl("POST", f"https://api.github.com/repos/{REPO}/releases", {
    "tag_name": "product-film-v2",
    "target_commitish": "main",
    "name": "Keja AI — Product Film \u201cSee the Evidence\u201d (1:33) + Edition-2 Documents",
    "body": NOTES,
    "draft": False,
    "prerelease": False,
})
print("release created:", rel.get("html_url"))

# 3. upload assets
ASSETS = [
    ("/home/z/my-project/download/Keja_AI_Product_Film_1080p.mp4",
     "Keja_AI_Product_Film_1080p.mp4"),
    ("/home/z/my-project/download/keja-marketing-playbook-v2.pdf",
     "Keja_Marketing_Playbook_v2.pdf"),
    ("/home/z/my-project/download/keja-strategy-v2.pdf",
     "Keja_Strategy_v2.pdf"),
    ("/home/z/my-project/download/keja-kenya-partner-proposals-v2.pdf",
     "Keja_Partner_Proposals_v2.pdf"),
]
for path, name in ASSETS:
    up = curl(
        "POST",
        f"https://uploads.github.com/repos/{REPO}/releases/{rel['id']}/assets?name={name}",
        ctype="application/octet-stream", raw_file=path)
    print("uploaded:", name, up.get("size"), "bytes")

print("DONE")

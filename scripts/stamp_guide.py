#!/usr/bin/env python3
"""Stamp page numbers + metadata on the Keja domain guide PDF.

Numbering scheme (typesetting/pagination.md):
- Page 1 (cover): no number
- Pages 2..N-1 (body): Arabic starting at 1, centered footer
- Page N (ending/back page): no number
"""
import fitz

SRC = "/home/z/my-project/download/keja-app-netlify-domain-guide.pdf"
MUTED = (0x5F / 255, 0x6E / 255, 0x66 / 255)  # --c-muted

doc = fitz.open(SRC)
n = len(doc)

for i in range(1, n - 1):  # skip cover (0) and ending (n-1)
    page = doc[i]
    w, h = page.rect.width, page.rect.height
    num = str(i)  # body page number starts at 1
    fontsize = 8
    tw = fitz.get_text_length(num, fontname="helv", fontsize=fontsize)
    page.insert_text(
        fitz.Point((w - tw) / 2, h - 16),
        num,
        fontname="helv",
        fontsize=fontsize,
        color=MUTED,
    )

doc.set_metadata({
    "title": "Linking keja.app to Netlify — Custom Domain Setup Guide",
    "author": "Keja AI · Chacadom Investments",
    "subject": "Step-by-step instructions for linking the keja.app custom domain to the keja-ai Netlify site: DNS records at Spaceship, SSL certificate provisioning, primary domain and HTTPS redirects, GitHub Actions deploy pipeline secrets, and verification.",
    "creator": "Z.ai",
    "producer": "Z.ai PDF Workbench",
    "keywords": "keja.app, Netlify, custom domain, DNS, SSL, Let's Encrypt, GitHub Actions, Spaceship",
})

doc.save(SRC, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
doc.close()
print(f"Stamped {n-2} body pages (2..{n-1}) with numbers 1..{n-2}; metadata set.")

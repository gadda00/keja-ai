#!/usr/bin/env python3
"""Merge cover.pdf (page 0) + body.pdf -> final audit PDF with metadata."""
from pypdf import PdfReader, PdfWriter
import os

HERE = os.path.dirname(os.path.abspath(__file__))
A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page

def main():
    cover = os.path.join(HERE, 'cover.pdf')
    body = os.path.join(HERE, 'body.pdf')
    out = os.path.join(HERE, 'final.pdf')
    writer = PdfWriter()
    writer.add_page(normalize_page_to_a4(PdfReader(cover).pages[0]))
    for p in PdfReader(body).pages:
        writer.add_page(normalize_page_to_a4(p))
    writer.add_metadata({
        '/Title': 'Keja AI Platform Technical Audit - Phase 2 Codebase Review and Improvement Recommendations',
        '/Author': 'Keja AI Engineering Audit Team',
        '/Creator': 'Z.ai',
        '/Subject': 'Deep technical audit of the gadda00/keja-ai repository: architecture, code quality, security, PWA, performance, SEO, testing, and a 90-day improvement roadmap.',
    })
    with open(out, 'wb') as f:
        writer.write(f)
    print('MERGED:', out, '| pages:', len(PdfReader(out).pages))

if __name__ == '__main__':
    main()

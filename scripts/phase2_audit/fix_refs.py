#!/usr/bin/env python3
"""Fix chapter cross-references after inserting Market Context (4), AI Capability (11),
and Schema Blueprint (25) chapters. Old->new mapping applied in DESCENDING order so
chains (e.g. 20->22, 22->24) never collide. Special-cases handled via placeholders."""
import re, os

HERE = os.path.dirname(os.path.abspath(__file__))

# old chapter number -> new chapter number
MAPPING = {
    25: 28, 24: 27, 23: 26, 22: 24, 21: 23, 20: 22, 19: 21, 18: 20,
    17: 19, 16: 18, 15: 17, 14: 16, 13: 15, 12: 14, 11: 13, 10: 12,
    9: 10, 8: 9, 7: 8, 6: 7, 5: 6, 4: 5,
}
# chapters 1, 2, 3 unchanged.

SPECIAL_BEFORE = [
    # "Ch. 23 blueprint" actually targets the Schema Blueprint chapter (new 25)
    ("Ch. 23 blueprint", "Ch. @SCHEMA@"),
]

TEXT_FIXES = [
    ("Five appendices provide the raw inventories - routes, storage keys, dependencies, documents, and methodology",
     "Six appendices provide the raw inventories - routes, storage keys, dependencies, documents, glossary, and methodology"),
    ("Part I (this summary, the engagement context, and the product overview)",
     "Part I (this summary, the engagement context, the product overview, and the market context)"),
]

def transform(text):
    for old, new in SPECIAL_BEFORE:
        text = text.replace(old, new)
    # Apply numeric replacements in DESCENDING old-number order
    for old in sorted(MAPPING.keys(), reverse=True):
        new = MAPPING[old]
        text = re.sub(r'\b(Ch\.|Chapter) %d\b' % old, r'\g<1> %d' % new, text)
    text = text.replace('Ch. @SCHEMA@', 'Ch. 25')
    for old, new in TEXT_FIXES:
        text = text.replace(old, new)
    return text

changed = 0
for fname in ['content_1.py', 'content_2.py', 'content_3.py', 'content_4.py',
              'content_5.py', 'content_6.py', 'content_7.py', 'content_8.py']:
    path = os.path.join(HERE, fname)
    with open(path, encoding='utf-8') as f:
        src = f.read()
    out = transform(src)
    if out != src:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(out)
        n = len(re.findall(r'\b(Ch\.|Chapter) \d+\b', out))
        print(f'{fname}: rewritten ({n} refs now present)')
        changed += 1
    else:
        print(f'{fname}: no changes')
print('files changed:', changed)

# -*- coding: utf-8 -*-
import sys, os
sys.stdout.reconfigure(encoding='utf-8')

doc_path = os.path.join(r'c:\Users\Арман\OneDrive\Desktop', 'ТЗ проекта PractDay PS.doc')

with open(doc_path, 'rb') as f:
    raw = f.read()

# Extract text from .doc binary
# In .doc format, the WordDocument stream contains text
# But we can try a simpler approach - find text between known markers
import re

# Try to find readable text portions
# The text is stored directly in the binary in CP1251
# Let's extract all sequences of CP1251 text characters

text_bytes = bytearray()
in_text = False
results = []
current = bytearray()

for i, byte in enumerate(raw):
    # CP1251 Cyrillic range: 0xC0-0xFF (а-я, А-Я), plus common ASCII
    is_text = (0x20 <= byte <= 0x7E) or (0xC0 <= byte <= 0xFF) or byte in (0x0A, 0x0D, 0x09, 0xA8, 0xB8)
    if is_text:
        current.append(byte)
    else:
        if len(current) > 10:
            try:
                decoded = current.decode('cp1251')
                # Filter out binary garbage
                if any('\u0400' <= c <= '\u04FF' for c in decoded):
                    results.append(decoded.strip())
            except:
                pass
        current = bytearray()

# Print all text segments
for segment in results:
    # Clean up
    clean = segment.strip()
    if len(clean) > 20:
        print(clean)
        print()

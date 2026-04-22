# -*- coding: utf-8 -*-
import sys, os
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = os.path.join(r'c:\Users\Арман\Downloads', 'ТЗ проекта PractDay PS.pdf')

from PyPDF2 import PdfReader

reader = PdfReader(pdf_path)

output = os.path.join(r'c:\Users\Арман\OneDrive\Desktop\PractDAY', 'tz_full_text.txt')
with open(output, 'w', encoding='utf-8') as f:
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        f.write(f"\n--- Page {i+1} ---\n")
        f.write(text)
        f.write("\n")

print(f"Saved to {output}")
print(f"Total pages: {len(reader.pages)}")

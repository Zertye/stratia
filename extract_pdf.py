import subprocess, sys

# First install PyPDF2
subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'PyPDF2', '-q'])

from PyPDF2 import PdfReader

reader = PdfReader(r'c:\Users\nael\Desktop\StartIA\Gemini Omni, by StratIA.pdf')
print(f"Number of pages: {len(reader.pages)}")
print("=" * 80)

for i, page in enumerate(reader.pages):
    text = page.extract_text()
    if text:
        print(f"\n--- PAGE {i+1} ---")
        print(text)

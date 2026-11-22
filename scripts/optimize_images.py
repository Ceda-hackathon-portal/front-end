"""Build responsive WebP assets. Run with Python 3 and Pillow installed."""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/images/optimized'
OUTPUT.mkdir(exist_ok=True)
widths = {}
report = []
files = subprocess.check_output(['git', 'ls-files', 'public/images'], cwd=ROOT, text=True).splitlines()
for filename in files:
    source = ROOT / filename
    if source.suffix.lower() not in ('.jpg', '.jpeg', '.png') or source.name == 'ceda-logo.png':
        continue
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        widths[source.name] = [min(960, image.width), min(1920, image.width)]
        sizes = []
        for nominal_width, width in zip((960, 1920), widths[source.name]):
            height = round(image.height * width / image.width)
            target = OUTPUT / f'{source.stem}-{nominal_width}.webp'
            image.resize((width, height), Image.Resampling.LANCZOS).save(target, 'WEBP', quality=76, method=6)
            sizes.append(target.stat().st_size)
        report.append(dict(source=filename, originalBytes=source.stat().st_size, mobileBytes=sizes[0], desktopBytes=sizes[1]))
(ROOT / 'src/data/optimizedImages.json').write_text(json.dumps(widths, indent=2) + '\n', encoding='utf-8')
(ROOT / 'docs/image-sizes.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f'Optimized {len(report)} images; originals retained.')

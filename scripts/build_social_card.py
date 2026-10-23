"""Build the static share card from the checked-in portrait, artwork and fonts.

Requires Python fonttools (with WOFF2 support) and Inkscape on PATH.
Run from any directory: python3 scripts/build_social_card.py
"""

from base64 import b64encode
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
PAPER = "#f5f4ef"
INK = "#172329"


def image_data(name, mime):
    return f"data:{mime};base64,{b64encode((ROOT / name).read_bytes()).decode()}"


def lettering(text, font_file, size, x, baseline, color, tracking=0):
    """Outline the real site font so the export needs no system-font fallback."""
    font = TTFont(ROOT / "fonts" / font_file)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    paths = []
    for character in text:
        glyph_name = cmap[ord(character)]
        pen = SVGPathPen(glyphs)
        glyphs[glyph_name].draw(pen)
        if pen.getCommands():
            paths.append(
                f'<path fill="{color}" d="{pen.getCommands()}" '
                f'transform="translate({x:.3f} {baseline}) scale({scale} {-scale})"/>'
            )
        x += font["hmtx"][glyph_name][0] * scale + tracking
    font.close()
    return "".join(paths)


def main():
    banner = image_data("img/identity-field.jpg", "image/jpeg")
    portrait = image_data("img/carlos-mezquita.jpg", "image/jpeg")
    name = lettering("Carlos Mezquita", "instrument-serif-latin-400-normal.woff2",
                     108, 64, 415, "#ffffff", -2.6)
    role = lettering("Software Engineer", "instrument-sans-latin-400-normal.woff2",
                     38, 66, 570, INK, -.5)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630"
      viewBox="0 0 1200 630">
      <title>Carlos Mezquita — Software Engineer</title>
      <desc>Carlos's large portrait and white serif name on his blue and teal
      identity artwork, with Software Engineer on warm paper below.</desc>
      <defs><clipPath id="portrait"><circle cx="978" cy="240" r="154"/></clipPath></defs>
      <rect width="1200" height="630" fill="{PAPER}"/>
      <image width="1200" height="480" preserveAspectRatio="xMidYMid slice" xlink:href="{banner}"/>
      <circle cx="978" cy="240" r="160" fill="{PAPER}"/>
      <image x="824" y="86" width="308" height="308" clip-path="url(#portrait)" xlink:href="{portrait}"/>
      {name}{role}
    </svg>'''
    with TemporaryDirectory(prefix="portfolio-share-card-") as directory:
        source = Path(directory) / "social-card.svg"
        source.write_text(svg)
        subprocess.run([
            "inkscape", str(source), "--export-type=png",
            f"--export-filename={ROOT / 'img/social-card-v2.png'}",
        ], check=True)
    print("Built img/social-card-v2.png (1200 × 630)")


if __name__ == "__main__":
    main()

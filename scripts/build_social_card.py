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
MUTED = "#5b6466"


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
                     80, 64, 470, INK, -2.1)
    role = lettering("Software Engineer", "instrument-sans-latin-400-normal.woff2",
                     28, 67, 523, MUTED, -.4)
    domain = lettering("carlosmezquita.dev", "instrument-sans-latin-400-normal.woff2",
                       19, 973, 584, MUTED, -.2)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630"
      viewBox="0 0 1200 630">
      <title>Carlos Mezquita — Software Engineer</title>
      <desc>Carlos's portrait overlapping his blue and teal banner, with his name
      and role on warm paper below.</desc>
      <defs><clipPath id="portrait"><circle cx="166" cy="274" r="94"/></clipPath></defs>
      <rect width="1200" height="630" fill="{PAPER}"/>
      <image width="1200" height="270" preserveAspectRatio="xMidYMid slice" xlink:href="{banner}"/>
      <circle cx="166" cy="274" r="102" fill="{PAPER}"/>
      <image x="72" y="180" width="188" height="188" clip-path="url(#portrait)" xlink:href="{portrait}"/>
      {name}{role}{domain}
    </svg>'''
    with TemporaryDirectory(prefix="portfolio-share-card-") as directory:
        source = Path(directory) / "social-card.svg"
        source.write_text(svg)
        subprocess.run([
            "inkscape", str(source), "--export-type=png",
            f"--export-filename={ROOT / 'img/social-card.png'}",
        ], check=True)
    print("Built img/social-card.png (1200 × 630)")


if __name__ == "__main__":
    main()

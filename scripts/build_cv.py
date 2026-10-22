"""Build the public, one-page CV linked from the portfolio (requires ReportLab)."""
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph

ROOT = Path(__file__).resolve().parents[1]
import reportlab
FONT_DIR = Path(reportlab.__file__).parent / 'fonts'
pdfmetrics.registerFont(TTFont('CVSans', str(FONT_DIR / 'Vera.ttf')))
pdfmetrics.registerFont(TTFont('CVSans-Bold', str(FONT_DIR / 'VeraBd.ttf')))
pdfmetrics.registerFontFamily('CVSans', normal='CVSans', bold='CVSans-Bold')
INK = colors.HexColor('#172f3b')
MUTED = colors.HexColor('#53616a')
ACCENT = colors.HexColor('#126652')
STYLES = {
    'name': ParagraphStyle('name', fontName='CVSans-Bold', fontSize=26, leading=30, textColor=INK, spaceAfter=7),
    'subtitle': ParagraphStyle('subtitle', fontName='CVSans', fontSize=11, leading=15, textColor=MUTED, spaceAfter=8),
    'contact': ParagraphStyle('contact', fontName='CVSans', fontSize=9, leading=14, textColor=INK, spaceAfter=12),
    'body': ParagraphStyle('body', fontName='CVSans', fontSize=10, leading=14, textColor=INK, spaceAfter=6),
    'section': ParagraphStyle('section', fontName='CVSans-Bold', fontSize=10, leading=14, textColor=ACCENT, spaceBefore=12, spaceAfter=8),
    'entry': ParagraphStyle('entry', fontName='CVSans-Bold', fontSize=10, leading=14, textColor=INK, spaceAfter=3),
    'meta': ParagraphStyle('meta', fontName='CVSans', fontSize=9, leading=13, textColor=MUTED, spaceAfter=5),
    'bullet': ParagraphStyle('bullet', fontName='CVSans', fontSize=10, leading=14, textColor=INK, leftIndent=10, firstLineIndent=-8, spaceAfter=4),
}

def p(text, style='body'):
    return Paragraph(text, STYLES[style])

story = [
    p('Carlos Mezquita', 'name'),
    p('Software Engineer | Portsmouth, UK', 'subtitle'),
    p('<link href="mailto:mezquitalobato@gmail.com">mezquitalobato@gmail.com</link> | '
      '<link href="https://carlosmezquita.dev">carlosmezquita.dev</link><br/>'
      '<link href="https://github.com/carlosmezquita">github.com/carlosmezquita</link> | '
      '<link href="https://www.linkedin.com/in/carlosmezquitalobato">linkedin.com/in/carlosmezquitalobato</link>', 'contact'),
    p('Software engineer with QA and development experience at Denodo. Building web applications and backend systems while completing a BSc (Hons) top-up at the University of Portsmouth.'),
    p('EXPERIENCE', 'section'),
    p('Denodo | QA &amp; Software Development (Part-time)', 'entry'),
    p('Mar 2023 - Oct 2025 | A Coru\u00f1a, Spain', 'meta'),
    p('- Owned the redesign of parallel execution for a large automated test suite, reducing runtime by several hours.', 'bullet'),
    p('- Contributed to the migration from Jelly to TestNG and developed automated and unit tests.', 'bullet'),
    p('- Investigated defects, verified fixes and supported manual release testing.', 'bullet'),
    p('SELECTED PROJECTS', 'section'),
    p('Surfay | Working prototype', 'entry'),
    p('Built a React/MapLibre interface and Cloudflare Worker backend combining marine forecasts with local coastal profiles, stored snapshots and moderated condition reports. Experimental scores; forecast accuracy has not been validated.'),
    p('<link href="https://github.com/carlosmezquita/surfay">github.com/carlosmezquita/surfay</link>', 'meta'),
    p('Urbot | In development for NMarq', 'entry'),
    p('Building an internal urban-planning tool with guided intake, deterministic planning checks, evidence tracking and human review. React, TypeScript, Cloudflare Workers, D1, R2 and MCP. Private source.'),
    p('Cadeira | Personal project', 'entry'),
    p('Worked across a React/TypeScript client and Node.js backend for AI restaurant reservations, integrating telephone calls, speech services, agent orchestration and booking workflows. Twilio and LangGraph.'),
    p('EDUCATION', 'section'),
    p('University of Portsmouth | Sep 2026 - Jul 2027 (expected)', 'entry'),
    p('BSc (Hons) Computer Science and Advanced Technologies (Top-Up)'),
    p('Liceo La Paz | 2021 - 2023', 'entry'),
    p('Higher Technician in Multiplatform Application Development (DAM)'),
    p('LEADERSHIP &amp; SKILLS', 'section'),
    p('President, University of Portsmouth AI Society. Organising practical workshops, build nights and industry connections.'),
    p('TypeScript/JavaScript, Java, Python, SQL; React, Node.js, Cloudflare Workers, D1/R2, TestNG and Git. Spanish and Galician: native. English: professional.'),
]

def build():
    output = ROOT / 'Carlos-Mezquita-CV.pdf'
    doc = SimpleDocTemplate(str(output), pagesize=A4, leftMargin=42, rightMargin=42,
                            topMargin=36, bottomMargin=36, title='Carlos Mezquita - Software Engineer CV',
                            author='Juan Carlos Mezquita Lobato', invariant=1)
    doc.build(story)
    print(output)

if __name__ == '__main__':
    build()

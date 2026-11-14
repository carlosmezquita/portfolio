"""Export the editable public CV using LibreOffice Writer."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(__file__).with_name('Carlos-Mezquita-CV.docx')
PDF_EXPORT = 'pdf:writer_pdf_Export:{"UseTaggedPDF":{"type":"boolean","value":"true"}}'


def build():
    subprocess.run(
        ['soffice', '--headless', '--convert-to', PDF_EXPORT, '--outdir', str(ROOT), str(SOURCE)],
        check=True,
    )


if __name__ == '__main__':
    build()

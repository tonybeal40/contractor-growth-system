#!/usr/bin/env python3
"""Build print-ready color and black-and-white Josh Barber flyers."""

from __future__ import annotations

import shutil
from pathlib import Path

import qrcode
from PIL import Image, ImageEnhance, ImageOps
from reportlab.lib.colors import Color, HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
PUBLIC_DIR = ROOT / "downloads"
TMP_DIR = ROOT / "tmp" / "pdfs" / "josh-barber"

PAGE_W, PAGE_H = letter
MARGIN = 0.42 * inch

CHARCOAL = HexColor("#1F2933")
CREAM = HexColor("#F7F3EA")
GREEN = HexColor("#2F5D50")
GREEN_DARK = HexColor("#23473D")
COPPER = HexColor("#C96A26")
MUTED = HexColor("#5F6B66")
LINE = HexColor("#D7DEDA")

LANDING_URL = (
    "https://allprometroeastconstruction.com/josh-barber-highland-il.html"
    "?utm_source=print&utm_medium=flyer&utm_campaign=josh_highland_launch"
)


def draw_image_cover(
    c: canvas.Canvas,
    image_path: Path,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    with Image.open(image_path) as image:
        image_ratio = image.width / image.height
    box_ratio = width / height
    if image_ratio > box_ratio:
        draw_height = height
        draw_width = height * image_ratio
        draw_x = x - (draw_width - width) / 2
        draw_y = y
    else:
        draw_width = width
        draw_height = width / image_ratio
        draw_x = x
        draw_y = y - (draw_height - height) / 2
    c.saveState()
    path = c.beginPath()
    path.rect(x, y, width, height)
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(str(image_path), draw_x, draw_y, draw_width, draw_height, mask="auto")
    c.restoreState()


def fit_text(c: canvas.Canvas, text: str, font: str, max_size: float, min_size: float, width: float) -> float:
    size = max_size
    while size > min_size and stringWidth(text, font, size) > width:
        size -= 0.5
    return size


def paragraph(
    c: canvas.Canvas,
    text: str,
    x: float,
    y_top: float,
    width: float,
    font_size: float,
    leading: float,
    color: Color,
    align: int = TA_LEFT,
    font_name: str = "Helvetica",
) -> float:
    style = ParagraphStyle(
        name="flyer",
        fontName=font_name,
        fontSize=font_size,
        leading=leading,
        textColor=color,
        alignment=align,
        spaceAfter=0,
        spaceBefore=0,
    )
    p = Paragraph(text, style)
    _, h = p.wrap(width, PAGE_H)
    p.drawOn(c, x, y_top - h)
    return h


def build_grayscale_assets() -> dict[str, Path]:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    source_assets = {
        "logo": ROOT / "images" / "branding" / "logo-square.png",
        "deck": ROOT / "images" / "deck-build-metro-east-il.webp",
        "shower": ROOT / "images" / "shower-remodel-belleville-il.webp",
        "landscape": ROOT / "images" / "projects" / "metro-east-landscape-front-entry.avif",
    }
    output: dict[str, Path] = {}
    for name, source in source_assets.items():
        target = TMP_DIR / f"{name}-gray.png"
        with Image.open(source) as image:
            rgba = image.convert("RGBA")
            background = Image.new("RGBA", rgba.size, "white")
            background.alpha_composite(rgba)
            gray = ImageOps.grayscale(background.convert("RGB"))
            gray = ImageEnhance.Contrast(gray).enhance(1.12)
            gray.save(target, "PNG", optimize=True)
        output[name] = target
    return output


def add_qr(c: canvas.Canvas, x: float, y: float, size: float) -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    qr_path = TMP_DIR / "josh-highland-landing-qr.png"
    if not qr_path.exists():
        image = qrcode.make(LANDING_URL, box_size=8, border=2)
        image.save(qr_path)
    c.drawImage(str(qr_path), x, y, size, size, preserveAspectRatio=True, mask="auto")


def draw_flyer(target: Path, monochrome: bool) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    gray = build_grayscale_assets() if monochrome else {}
    logo = gray.get("logo", ROOT / "images" / "branding" / "logo-square.png")
    deck = gray.get("deck", ROOT / "images" / "deck-build-metro-east-il.webp")
    shower = gray.get("shower", ROOT / "images" / "shower-remodel-belleville-il.webp")
    landscape = gray.get(
        "landscape", ROOT / "images" / "projects" / "metro-east-landscape-front-entry.avif"
    )

    primary = black if monochrome else GREEN_DARK
    accent = black if monochrome else COPPER
    background = white if monochrome else CREAM
    body_color = black if monochrome else CHARCOAL
    muted = black if monochrome else MUTED
    line = black if monochrome else LINE

    c = canvas.Canvas(str(target), pagesize=letter, pageCompression=1)
    c.setTitle("Josh Barber - All-Pro Highland Area Project Consultant")
    c.setAuthor("All-Pro Construction & Landscape")
    c.setSubject("Highland-area remodeling, decks, concrete, fencing, landscaping, and small jobs")

    c.setFillColor(background)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    # Top brand rail
    c.setFillColor(primary)
    c.rect(0, PAGE_H - 0.9 * inch, PAGE_W, 0.9 * inch, stroke=0, fill=1)
    c.setFillColor(white)
    c.circle(MARGIN + 0.35 * inch, PAGE_H - 0.45 * inch, 0.3 * inch, stroke=0, fill=1)
    c.drawImage(
        str(logo),
        MARGIN + 0.08 * inch,
        PAGE_H - 0.72 * inch,
        0.54 * inch,
        0.54 * inch,
        preserveAspectRatio=True,
        mask="auto",
    )
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(MARGIN + 0.78 * inch, PAGE_H - 0.37 * inch, "ALL-PRO CONSTRUCTION")
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(MARGIN + 0.78 * inch, PAGE_H - 0.58 * inch, "& LANDSCAPE  |  SERVING METRO EAST SINCE 2002")
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 0.47 * inch, "HIGHLAND AREA")

    # Main headline
    top = PAGE_H - 1.14 * inch
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN, top, "YOUR LOCAL ALL-PRO PROJECT CONTACT")
    headline = "Highland-Area Home Projects Start Here"
    headline_size = fit_text(c, headline, "Helvetica-Bold", 27, 21, PAGE_W - 2 * MARGIN)
    c.setFillColor(primary)
    c.setFont("Helvetica-Bold", headline_size)
    c.drawString(MARGIN, top - 0.39 * inch, headline)
    paragraph(
        c,
        "Talk with <b>Josh Barber</b> about remodeling, decks, patios, concrete, fencing, landscaping, repairs, and small jobs.",
        MARGIN,
        top - 0.53 * inch,
        PAGE_W - 2 * MARGIN,
        11.5,
        15,
        body_color,
    )

    # Contact banner
    banner_y = PAGE_H - 2.3 * inch
    c.setFillColor(white)
    c.setStrokeColor(line)
    c.roundRect(MARGIN, banner_y, PAGE_W - 2 * MARGIN, 0.62 * inch, 6, stroke=1, fill=1)
    c.setFillColor(primary)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(MARGIN + 0.18 * inch, banner_y + 0.35 * inch, "JOSH BARBER")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN + 0.18 * inch, banner_y + 0.15 * inch, "ALL-PRO HIGHLAND-AREA PROJECT CONSULTANT")
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 15)
    c.drawRightString(PAGE_W - MARGIN - 0.18 * inch, banner_y + 0.35 * inch, "CALL OR TEXT  618-402-8775")
    c.setFillColor(body_color)
    c.setFont("Helvetica-Bold", 8.8)
    c.drawRightString(PAGE_W - MARGIN - 0.18 * inch, banner_y + 0.15 * inch, "JoshBarber23@yahoo.com")

    # Real work image band
    image_y = PAGE_H - 4.38 * inch
    gap = 0.09 * inch
    total_width = PAGE_W - 2 * MARGIN
    main_width = total_width * 0.5
    side_width = (total_width - main_width - 2 * gap) / 2
    image_h = 1.76 * inch
    draw_image_cover(c, deck, MARGIN, image_y, main_width, image_h)
    draw_image_cover(c, shower, MARGIN + main_width + gap, image_y, side_width, image_h)
    draw_image_cover(c, landscape, MARGIN + main_width + side_width + 2 * gap, image_y, side_width, image_h)
    c.setFillColor(Color(0, 0, 0, alpha=0.68))
    c.rect(MARGIN, image_y, main_width, 0.28 * inch, stroke=0, fill=1)
    c.rect(MARGIN + main_width + gap, image_y, side_width, 0.28 * inch, stroke=0, fill=1)
    c.rect(MARGIN + main_width + side_width + 2 * gap, image_y, side_width, 0.28 * inch, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 7.8)
    c.drawString(MARGIN + 0.08 * inch, image_y + 0.1 * inch, "DECKS & OUTDOOR LIVING")
    c.drawString(MARGIN + main_width + gap + 0.06 * inch, image_y + 0.1 * inch, "BATHROOM REMODELS")
    c.drawString(MARGIN + main_width + side_width + 2 * gap + 0.06 * inch, image_y + 0.1 * inch, "LANDSCAPING")

    # Services and why start with Josh
    content_top = image_y - 0.24 * inch
    left_x = MARGIN
    right_x = PAGE_W / 2 + 0.13 * inch
    column_w = PAGE_W / 2 - MARGIN - 0.25 * inch

    c.setFillColor(primary)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(left_x, content_top, "PROJECTS WE CAN HELP START")
    services = [
        "Kitchen and bathroom remodeling",
        "Deck building and deck repair",
        "Concrete patios and walkways",
        "Fencing and gates",
        "Landscaping and yard cleanup",
        "Small jobs, repairs, and punch lists",
    ]
    y = content_top - 0.24 * inch
    c.setFont("Helvetica", 9.2)
    for item in services:
        c.setFillColor(accent)
        c.rect(left_x, y + 2, 6, 6, stroke=0, fill=1)
        c.setFillColor(body_color)
        c.drawString(left_x + 12, y, item)
        y -= 0.24 * inch

    c.setFillColor(primary)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(right_x, content_top, "WHY START WITH JOSH")
    points = [
        "Direct Highland-area contact",
        "Easy call, text, email, or form",
        "Share photos before the next step",
        "Request goes to Josh and All-Pro",
        "Written estimate after scope review",
        "No charge to submit a request",
    ]
    y = content_top - 0.24 * inch
    c.setFont("Helvetica", 9.2)
    for item in points:
        c.setFillColor(accent)
        c.rect(right_x, y + 2, 6, 6, stroke=0, fill=1)
        c.setFillColor(body_color)
        c.drawString(right_x + 12, y, item)
        y -= 0.24 * inch

    # Simple process fills the lower half without crowding the contact details.
    process_title_y = 3.86 * inch
    c.setFillColor(primary)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(PAGE_W / 2, process_title_y, "FROM PROJECT IDEA TO A CLEAR NEXT STEP")
    steps = [
        ("1", "CONTACT JOSH", "Call, text, email, or scan."),
        ("2", "SHARE THE SCOPE", "Send the city, details, and photos."),
        ("3", "ALL-PRO REVIEW", "The team reviews fit and next steps."),
        ("4", "WRITTEN ESTIMATE", "Pricing follows the reviewed scope."),
    ]
    process_gap = 0.1 * inch
    process_width = (PAGE_W - 2 * MARGIN - process_gap * 3) / 4
    process_y = 2.84 * inch
    process_h = 0.78 * inch
    for index, (number, heading, copy) in enumerate(steps):
        x = MARGIN + index * (process_width + process_gap)
        c.setFillColor(white)
        c.setStrokeColor(line)
        c.roundRect(x, process_y, process_width, process_h, 5, stroke=1, fill=1)
        c.setFillColor(accent)
        c.circle(x + 0.19 * inch, process_y + process_h - 0.19 * inch, 0.12 * inch, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(x + 0.19 * inch, process_y + process_h - 0.225 * inch, number)
        c.setFillColor(primary)
        c.setFont("Helvetica-Bold", 8.1)
        c.drawString(x + 0.36 * inch, process_y + process_h - 0.22 * inch, heading)
        paragraph(
            c,
            copy,
            x + 0.12 * inch,
            process_y + process_h - 0.36 * inch,
            process_width - 0.24 * inch,
            7.4,
            9,
            body_color,
            TA_CENTER,
        )

    c.setFillColor(primary)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawCentredString(
        PAGE_W / 2,
        2.66 * inch,
        "NO CHARGE TO SUBMIT A REQUEST  |  FINAL AVAILABILITY DEPENDS ON LOCATION AND SCOPE",
    )

    # Area/QR band
    area_y = 1.25 * inch
    c.setFillColor(primary)
    c.roundRect(MARGIN, area_y, PAGE_W - 2 * MARGIN, 1.27 * inch, 7, stroke=0, fill=1)
    qr_size = 0.98 * inch
    c.setFillColor(white)
    c.roundRect(PAGE_W - MARGIN - qr_size - 0.12 * inch, area_y + 0.14 * inch, qr_size, qr_size, 4, stroke=0, fill=1)
    add_qr(c, PAGE_W - MARGIN - qr_size - 0.12 * inch, area_y + 0.14 * inch, qr_size)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 12.5)
    c.drawString(MARGIN + 0.18 * inch, area_y + 0.91 * inch, "HIGHLAND AND NEARBY METRO EAST COMMUNITIES")
    paragraph(
        c,
        "Highland, St. Jacob, Marine, Troy, Maryville, Edwardsville, Glen Carbon, Collinsville, O'Fallon, Lebanon, Trenton, Breese, New Baden, Alhambra, and Hamel.",
        MARGIN + 0.18 * inch,
        area_y + 0.76 * inch,
        PAGE_W - 2 * MARGIN - qr_size - 0.45 * inch,
        8.4,
        11,
        white,
    )
    c.setFont("Helvetica-Bold", 7.5)
    c.drawRightString(PAGE_W - MARGIN - 0.1 * inch, area_y + 0.05 * inch, "SCAN TO REQUEST AN ESTIMATE")

    # Footer and disclosure
    c.setFillColor(accent)
    c.rect(0, 0.72 * inch, PAGE_W, 0.38 * inch, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(PAGE_W / 2, 0.85 * inch, "CALL OR TEXT JOSH: 618-402-8775")
    paragraph(
        c,
        "Josh Barber is an All-Pro project consultant, not a separate contractor business. All-Pro Construction &amp; Landscape handles scope review, written estimates, agreements, applicable documentation, and approved work. Availability depends on location, scope, and scheduling.",
        MARGIN,
        0.62 * inch,
        PAGE_W - 2 * MARGIN,
        6.6,
        8.1,
        muted,
        TA_CENTER,
    )
    c.setFillColor(muted)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(PAGE_W / 2, 0.1 * inch, "allprometroeastconstruction.com/josh-barber-highland-il.html")

    c.showPage()
    c.save()


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    color_output = OUTPUT_DIR / "josh-barber-highland-flyer-color.pdf"
    bw_output = OUTPUT_DIR / "josh-barber-highland-flyer-black-white.pdf"
    draw_flyer(color_output, monochrome=False)
    draw_flyer(bw_output, monochrome=True)
    shutil.copy2(color_output, PUBLIC_DIR / color_output.name)
    shutil.copy2(bw_output, PUBLIC_DIR / bw_output.name)
    print(color_output)
    print(bw_output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

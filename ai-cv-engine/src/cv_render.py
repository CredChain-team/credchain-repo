# ─────────────────────────────────────────────────────────────
# CredChain — CV image renderer
# Turns a CV data dict into a designed PNG using Pillow.
# Pure rendering only — no FastAPI / web concerns live here.
# ─────────────────────────────────────────────────────────────

from io import BytesIO
from typing import Any, Dict, List

from PIL import Image, ImageDraw, ImageFont

# ── Canvas (A4-ish portrait at ~96 DPI) ──────────────────────
WIDTH, HEIGHT = 794, 1123
SIDEBAR_W = 260

# ── Palette ──────────────────────────────────────────────────
NAVY = (15, 32, 64)        # sidebar + headings
ACCENT = (39, 110, 241)    # highlight blue
INK = (33, 37, 41)         # body text on white
MUTE = (110, 119, 129)     # secondary text
LIGHT = (236, 240, 247)    # sidebar text
WHITE = (255, 255, 255)
PAGE = (250, 251, 253)     # off-white page

_FONT_DIR = "C:/Windows/Fonts/"


def _font(name: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a Windows TrueType font, falling back to Pillow's default."""
    try:
        return ImageFont.truetype(_FONT_DIR + name, size)
    except Exception:
        return ImageFont.load_default()


def _wrap(draw: ImageDraw.ImageDraw, text: str,
          font: ImageFont.FreeTypeFont, max_w: int) -> List[str]:
    """Greedy word-wrap so text fits inside max_w pixels."""
    words = text.split()
    lines: List[str] = []
    line = ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines or [""]


def _as_list(value: Any) -> List[str]:
    """Coerce skills/achievements into a clean list of strings."""
    if value is None:
        return []
    if isinstance(value, str):
        # allow comma-separated string input too
        return [p.strip() for p in value.split(",") if p.strip()]
    if isinstance(value, (list, tuple)):
        return [str(v).strip() for v in value if str(v).strip()]
    return [str(value)]


def render_cv_png(data: Dict[str, Any]) -> bytes:
    """
    Render a CV dict into PNG image bytes.

    Recognised keys (all optional):
      name, title, summary, email, phone, location,
      skills (list/str), achievements (list/str)
    Unknown keys are ignored, so the route stays flexible.
    """
    name = str(data.get("name") or "Your Name")
    title = str(data.get("title") or "")
    summary = str(data.get("summary") or "")
    email = str(data.get("email") or "")
    phone = str(data.get("phone") or "")
    location = str(data.get("location") or "")
    skills = _as_list(data.get("skills"))
    achievements = _as_list(data.get("achievements"))

    # Fonts
    f_name = _font("arialbd.ttf", 38)
    f_title = _font("arial.ttf", 18)
    f_h = _font("arialbd.ttf", 20)
    f_side_h = _font("arialbd.ttf", 16)
    f_body = _font("arial.ttf", 15)
    f_side = _font("arial.ttf", 14)

    img = Image.new("RGB", (WIDTH, HEIGHT), PAGE)
    d = ImageDraw.Draw(img)

    # ── Sidebar ──────────────────────────────────────────────
    d.rectangle([0, 0, SIDEBAR_W, HEIGHT], fill=NAVY)

    # Avatar circle with the person's initials
    cx, cy, r = SIDEBAR_W // 2, 110, 56
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ACCENT)
    initials = "".join(w[0] for w in name.split()[:2]).upper() or "?"
    iw = d.textlength(initials, font=f_name)
    d.text((cx - iw / 2, cy - 24), initials, font=f_name, fill=WHITE)

    y = cy + r + 30

    def sidebar_section(heading: str, items: List[str], y: int) -> int:
        d.text((28, y), heading.upper(), font=f_side_h, fill=ACCENT)
        d.line([28, y + 24, SIDEBAR_W - 28, y + 24], fill=ACCENT, width=2)
        y += 36
        for item in items:
            for ln in _wrap(d, f"•  {item}", f_side, SIDEBAR_W - 56):
                d.text((28, y), ln, font=f_side, fill=LIGHT)
                y += 22
            y += 4
        return y + 18

    # Contact
    contact = [c for c in (email, phone, location) if c]
    if contact:
        y = sidebar_section("Contact", contact, y)
    # Skills
    if skills:
        y = sidebar_section("Skills", skills, y)

    # ── Main column ──────────────────────────────────────────
    mx = SIDEBAR_W + 40           # left margin of main area
    mw = WIDTH - mx - 40          # usable width
    y = 70

    d.text((mx, y), name, font=f_name, fill=NAVY)
    y += 52
    if title:
        d.text((mx, y), title, font=f_title, fill=ACCENT)
        y += 34

    def main_heading(text: str, y: int) -> int:
        y += 8
        d.text((mx, y), text.upper(), font=f_h, fill=NAVY)
        d.line([mx, y + 28, WIDTH - 40, y + 28], fill=(214, 221, 230), width=2)
        return y + 44

    # Summary / Profile
    if summary:
        y = main_heading("Profile", y)
        for ln in _wrap(d, summary, f_body, mw):
            d.text((mx, y), ln, font=f_body, fill=INK)
            y += 22
        y += 8

    # Achievements
    if achievements:
        y = main_heading("Achievements", y)
        for item in achievements:
            # bullet square
            d.rectangle([mx, y + 6, mx + 8, y + 14], fill=ACCENT)
            lines = _wrap(d, item, f_body, mw - 22)
            for i, ln in enumerate(lines):
                d.text((mx + 22, y), ln, font=f_body, fill=INK)
                y += 22
            y += 8

    # ── Footer strip ─────────────────────────────────────────
    d.rectangle([SIDEBAR_W, HEIGHT - 36, WIDTH, HEIGHT], fill=(241, 244, 249))
    d.text((mx, HEIGHT - 28), "Generated by CredChain AI CV Engine",
           font=_font("arial.ttf", 12), fill=MUTE)

    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

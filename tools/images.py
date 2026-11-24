"""Prepare the pictures of saadlayachi.com: the logo, the S mark, the icons, the portrait, the share image and the
screenshots of the projects.

    uv run --with pillow python -I tools/images.py        (from the portfolio-netlify folder)

Sources: the logo and the portrait come from their own folders on the Desktop; the screenshots are taken by
tools/captures.mjs into tools/captures/ before this script runs.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
DESKTOP = ROOT.parent
OUT = ROOT / "public" / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)
SHOTS = Path(__file__).resolve().parent / "captures"

LOGO = next((DESKTOP / "slab-ingenierie").glob("Golden S*.png"))
PORTRAIT = DESKTOP / "photo-pro" / "saad-layachi-carre.jpg"
BLACK = (6, 6, 6)                      # the page background: the logo fades into it


def faded(image: Image.Image, margin: float = 0.16) -> Image.Image:
    """The picture with its edges melted into the page black, so that no square shows around the logo."""
    w, h = image.size
    mask = Image.new("L", (w, h), 0)
    inset = round(min(w, h) * margin)
    ImageDraw.Draw(mask).rectangle((inset, inset, w - inset, h - inset), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(inset / 2.2))
    return Image.composite(image, Image.new("RGB", (w, h), BLACK), mask)


def save(image: Image.Image, name: str, quality: int = 84) -> None:
    target = OUT / name
    if name.endswith(".webp"):
        image.save(target, quality=quality, method=6)
    else:
        image.save(target, optimize=True)
    print(f"{name}  {image.size[0]} x {image.size[1]}  {target.stat().st_size // 1024} Ko")


def main() -> None:
    logo = Image.open(LOGO).convert("RGB")
    side = logo.width
    # the whole logo, for the top of the page
    save(faded(logo).resize((900, 900), Image.LANCZOS), "slab-logo.webp", 88)
    # the gold S alone: a square around it, for the header and the icons
    box = tuple(round(v * side / 1254) for v in (408, 218, 938, 748))
    mark = faded(logo.crop(box), 0.06)
    save(mark.resize((160, 160), Image.LANCZOS), "slab-s.webp", 90)
    for size, name in ((512, "icon-512.png"), (180, "apple-touch-icon.png"), (48, "favicon.png")):
        save(mark.resize((size, size), Image.LANCZOS), name)
    # the picture shown when the address is shared: the logo in the middle of a wide black card
    share = Image.new("RGB", (1200, 630), BLACK)
    share.paste(faded(logo).resize((630, 630), Image.LANCZOS), (285, 0))
    save(share, "og.png")
    # portrait
    save(Image.open(PORTRAIT).convert("RGB").resize((720, 720), Image.LANCZOS), "saad-layachi.webp", 86)
    # screenshots: a wide one per project, and a phone one where there is one
    for shot in sorted(SHOTS.glob("*.png")):
        image = Image.open(shot).convert("RGB")
        width = 1200 if image.width > image.height else 520
        save(image.resize((width, round(image.height * width / image.width)), Image.LANCZOS), f"{shot.stem}.webp", 82)


if __name__ == "__main__":
    main()

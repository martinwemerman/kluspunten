"""Maakt de app-iconen (gouden munt met ster op kobaltblauw). Draaien: py tools/maak_iconen.py"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

INKT = (22, 34, 74)
UIT = Path(__file__).resolve().parent.parent / "icons"


def ster(cx, cy, R, r):
    punten = []
    for i in range(10):
        straal = r if i % 2 else R
        hoek = math.radians(-90 + i * 36)
        punten.append((cx + straal * math.cos(hoek), cy + straal * math.sin(hoek)))
    return punten


def icoon(grootte, munt=0.36):
    n = grootte * 4  # groot tekenen en verkleinen geeft gladde randen
    img = Image.new("RGB", (n, n))
    d = ImageDraw.Draw(img)
    boven, onder = (53, 104, 247), (28, 62, 196)
    for y in range(n):
        t = y / (n - 1)
        d.line([(0, y), (n, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(boven, onder)))
    c, r = n / 2, n * munt
    rand = n * 0.03
    d.ellipse([c - r, c - r + n * 0.035, c + r, c + r + n * 0.035], fill=INKT)  # schaduw
    d.ellipse([c - r, c - r, c + r, c + r], fill=INKT)
    d.ellipse([c - r + rand, c - r + rand, c + r - rand, c + r - rand], fill=(255, 196, 46))
    r2 = r * 0.78
    d.ellipse([c - r2, c - r2, c + r2, c + r2], outline=(229, 154, 0), width=round(n * 0.012))
    d.polygon(ster(c, c + n * 0.008, r * 0.66, r * 0.31), fill=INKT)
    d.polygon(ster(c, c + n * 0.008, r * 0.52, r * 0.225), fill=(255, 246, 208))
    return img.resize((grootte, grootte), Image.LANCZOS)


UIT.mkdir(exist_ok=True)
icoon(192).save(UIT / "icon-192.png")
icoon(512).save(UIT / "icon-512.png")
icoon(512, munt=0.30).save(UIT / "icon-maskable-512.png")
icoon(180).save(UIT / "apple-touch-icon.png")
print("Iconen gemaakt in", UIT)

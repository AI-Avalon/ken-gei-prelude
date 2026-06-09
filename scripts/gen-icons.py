#!/usr/bin/env python3
"""Generate PNG icons for Crescendo."""
from PIL import Image, ImageDraw, ImageFilter
import math


def lerp(a, b, t):
    return int(a + (b - a) * t)


def draw_gradient_circle(img, size):
    px = img.load()
    cx, cy = size * 0.44, size * 0.38
    for y in range(size):
        for x in range(size):
            dx = x - size / 2
            dy = y - size / 2
            if dx * dx + dy * dy > (size / 2) ** 2:
                continue
            glow = max(0, 1 - math.hypot(x - cx, y - cy) / (size * 0.72))
            edge = math.hypot(dx, dy) / (size / 2)
            r = lerp(8, 32, glow) - int(edge * 2)
            g = lerp(10, 38, glow) - int(edge * 3)
            b = lerp(21, 74, glow) - int(edge * 6)
            px[x, y] = (max(0, r), max(0, g), max(0, b), 255)


def crescent_path(size):
    s = size / 512
    top = []
    bottom = []
    for i in range(64):
        t = i / 63
        x = (132 + 188 * t) * s
        y = (180 + 76 * (t ** 0.92)) * s
        top.append((x, y))
        bottom.append((x, (332 - 76 * (t ** 0.92)) * s))
    return top, bottom


def create_icon(size):
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw_gradient_circle(img, canvas_size)
    draw = ImageDraw.Draw(img)
    s = canvas_size / 512

    gold = (196, 171, 110, 255)
    light = (241, 223, 155, 210)
    shadow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)

    top, bottom = crescent_path(canvas_size)
    wedge = top + list(reversed(bottom))
    sd.line(top, fill=(0, 0, 0, 110), width=max(8, int(34 * s)), joint="curve")
    sd.line(bottom, fill=(0, 0, 0, 110), width=max(8, int(34 * s)), joint="curve")
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(2, int(7 * s))))
    img.alpha_composite(shadow)

    draw.line(top, fill=gold, width=max(8, int(28 * s)), joint="curve")
    draw.line(bottom, fill=gold, width=max(8, int(28 * s)), joint="curve")
    mid = [((146 + 214 * (i / 63)) * s, (226 + 60 * math.sin((i / 63) * math.pi / 2)) * s) for i in range(64)]
    draw.line(mid, fill=light, width=max(3, int(11 * s)), joint="curve")

    # Note head and stem
    note_cx, note_cy = int(380 * s), int(318 * s)
    note_rx, note_ry = int(36 * s), int(27 * s)
    draw.ellipse([note_cx - note_rx, note_cy - note_ry, note_cx + note_rx, note_cy + note_ry], fill=gold)
    stem_x = int(402 * s)
    draw.rounded_rectangle([stem_x - int(7 * s), int(154 * s), stem_x + int(7 * s), int(318 * s)], radius=int(7 * s), fill=gold)
    flag = [
        (stem_x, int(158 * s)),
        (int(438 * s), int(168 * s)),
        (int(438 * s), int(206 * s)),
        (int(412 * s), int(181 * s)),
        (stem_x, int(178 * s)),
    ]
    draw.polygon(flag, fill=gold)

    # Soft lower arc: a portal/listening horizon.
    draw.arc([int(104 * s), int(304 * s), int(408 * s), int(442 * s)], 18, 162, fill=(196, 171, 110, 95), width=max(2, int(5 * s)))

    return img.resize((size, size), Image.Resampling.LANCZOS)


for icon_size in (192, 512):
    create_icon(icon_size).save(f"public/icon-{icon_size}.png")

print("Icons generated: icon-192.png, icon-512.png")

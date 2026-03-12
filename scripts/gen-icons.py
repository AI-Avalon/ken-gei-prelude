#!/usr/bin/env python3
"""Generate favicon PNG icons for Crescendo"""
from PIL import Image, ImageDraw
import math

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy, r = size/2, size/2, size/2
    for y in range(size):
        for x in range(size):
            dx, dy = x - cx, y - cy
            if dx*dx + dy*dy <= r*r:
                t = (x + y) / (2 * size)
                rb = int(15 + t * 11)
                gb = int(18 + t * 13)
                bb = int(37 + t * 24)
                img.putpixel((x, y), (rb, gb, bb, 255))
    
    gold = (196, 171, 110, 255)
    s = size / 512
    
    # Crescendo wedge
    points_top = [(int((120 + (280-120)*t/49) * s), int((160 + (256-160)*t/49) * s)) for t in range(50)]
    points_bot = [(int((120 + (280-120)*t/49) * s), int((352 + (256-352)*t/49) * s)) for t in range(50)]
    lw = max(2, int(14 * s))
    draw.line(points_top, fill=gold, width=lw)
    draw.line(points_bot, fill=gold, width=lw)
    
    # Note head
    note_cx, note_cy = int(370*s), int(300*s)
    note_rx, note_ry = int(38*s), int(28*s)
    draw.ellipse([note_cx-note_rx, note_cy-note_ry, note_cx+note_rx, note_cy+note_ry], fill=gold)
    
    # Note stem
    stem_x = int(398*s)
    stem_w = max(2, int(10*s))
    draw.rectangle([stem_x, int(160*s), stem_x + stem_w, int(302*s)], fill=gold)
    
    # Flag
    flag_x = stem_x + max(1, int(5*s))
    for i in range(max(1, int(25*s))):
        fx = flag_x + int(math.sin(i / max(1, int(15*s)) * math.pi) * 15 * s)
        fy = int(160*s) + i
        rr = max(1, int(4*s))
        draw.ellipse([fx-rr, fy-rr, fx+rr, fy+rr], fill=gold)
    
    return img

icon_192 = create_icon(192)
icon_512 = create_icon(512)
icon_192.save('public/icon-192.png')
icon_512.save('public/icon-512.png')
print('Icons generated: icon-192.png, icon-512.png')

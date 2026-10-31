# Mockup images for the standalone /branddeck/ page: a made-up cafe, "Bun w Bas", rebranded in Crier colors.
# Flat comic style: thick ink outlines, hard offset shadows, halftone dots. Latin text only.
# Run:  python build/branddeck_mockups.py   (writes assets/branddeck/*.webp, 1200x845, each under 200 KB)
import math
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'branddeck')
W, H = 1200, 845
RED, YELLOW, PINK, CYAN, INK, PAPER, WHITE = '#eb1e2d', '#ffde00', '#ff46a0', '#00beff', '#0f0a14', '#FFFAEC', '#ffffff'
LINE = 9   # ink outline
SHADOW = 14  # hard shadow offset

FONT_CANDIDATES = ['C:/Windows/Fonts/ariblk.ttf', '/Library/Fonts/Arial Black.ttf', '/usr/share/fonts/truetype/msttcorefonts/Arial_Black.ttf',
                   'C:/Windows/Fonts/impact.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']


def font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


def canvas(bg):
    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)
    return img, d


def halftone(d, box, color, step=22, r=3.2):
    x0, y0, x1, y1 = box
    for j, y in enumerate(range(y0, y1, step)):
        for x in range(x0 + (step // 2 if j % 2 else 0), x1, step):
            d.ellipse((x - r, y - r, x + r, y + r), fill=color)


def burst_pts(cx, cy, ro, ri, n=14, rot=0.0):
    pts = []
    for i in range(n * 2):
        a = rot + math.pi * i / n
        rr = ro if i % 2 == 0 else ri
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def shift(pts, dx=SHADOW, dy=SHADOW):
    return [(x + dx, y + dy) for x, y in pts]


def poly(d, pts, fill, shadow=True, width=LINE):
    if shadow:
        d.polygon(shift(pts), fill=INK)
    d.polygon(pts, fill=fill)
    d.line(pts + [pts[0], pts[1]], fill=INK, width=width, joint='curve')


def rrect(d, box, fill, radius=26, shadow=True, width=LINE):
    if shadow:
        x0, y0, x1, y1 = box
        d.rounded_rectangle((x0 + SHADOW, y0 + SHADOW, x1 + SHADOW, y1 + SHADOW), radius, fill=INK)
    d.rounded_rectangle(box, radius, fill=fill, outline=INK, width=width)


def oval(d, box, fill, shadow=True, width=LINE):
    if shadow:
        x0, y0, x1, y1 = box
        d.ellipse((x0 + SHADOW, y0 + SHADOW, x1 + SHADOW, y1 + SHADOW), fill=INK)
    d.ellipse(box, fill=fill, outline=INK, width=width)


def text(d, xy, s, size, fill=WHITE, stroke=6, shadow=6, anchor='mm', spacing=0):
    f = font(size)
    x, y = xy
    if shadow:
        d.text((x + shadow, y + shadow), s, font=f, fill=INK, anchor=anchor, stroke_width=stroke, stroke_fill=INK)
    d.text((x, y), s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=INK)


def bean(d, cx, cy, rx, ry, fill=INK, slit=YELLOW, angle=-25):
    # a coffee bean: an outlined oval with a curved slit, rotated
    a = math.radians(angle)
    pts = [(cx + rx * math.cos(t) * math.cos(a) - ry * math.sin(t) * math.sin(a), cy + rx * math.cos(t) * math.sin(a) + ry * math.sin(t) * math.cos(a))
           for t in [i * math.pi / 30 for i in range(60)]]
    d.polygon(pts, fill=fill)
    d.line(pts + [pts[0], pts[1]], fill=INK, width=max(4, LINE - 3), joint='curve')
    slit_pts = []
    for i in range(21):
        u = -0.8 + 1.6 * i / 20
        lx, ly = u * rx, 0.28 * ry * math.sin(u * math.pi)
        slit_pts.append((cx + lx * math.cos(a) - ly * math.sin(a), cy + lx * math.sin(a) + ly * math.cos(a)))
    d.line(slit_pts, fill=slit, width=max(5, int(ry * 0.18)), joint='curve')


def mark(d, cx, cy, r, ring=RED, face=YELLOW, shadow=True):
    # the Bun w Bas badge: a round "bun" with a coffee bean on top and a wink
    oval(d, (cx - r, cy - r, cx + r, cy + r), ring, shadow=shadow)
    ri = r * 0.78
    d.ellipse((cx - ri, cy - ri, cx + ri, cy + ri), fill=face, outline=INK, width=LINE - 2)
    # sesame seeds
    for sx, sy in [(-0.38, -0.42), (0.1, -0.55), (0.42, -0.3), (-0.5, 0.05), (0.5, 0.2)]:
        x, y = cx + sx * ri, cy + sy * ri
        d.ellipse((x - r * 0.05, y - r * 0.03, x + r * 0.05, y + r * 0.03), fill=WHITE, outline=INK, width=3)
    bean(d, cx, cy - ri * 0.05, ri * 0.42, ri * 0.28, fill=INK, slit=PINK)
    # smile + wink
    d.arc((cx - ri * 0.38, cy + ri * 0.12, cx + ri * 0.38, cy + ri * 0.62), 20, 160, fill=INK, width=max(5, int(r * 0.07)))
    d.ellipse((cx - ri * 0.62, cy + ri * 0.28, cx - ri * 0.42, cy + ri * 0.42), fill=PINK)
    d.ellipse((cx + ri * 0.42, cy + ri * 0.28, cx + ri * 0.62, cy + ri * 0.42), fill=PINK)


def ribbon(d, cx, cy, w, h, label, size, fill=RED):
    tail = h * 0.55
    for side in (-1, 1):
        x_in = cx + side * (w / 2 - tail * 0.3)
        x_out = cx + side * (w / 2 + tail)
        tp = [(x_in, cy - h / 2 + h * 0.25), (x_out, cy - h / 2 + h * 0.25), (x_out - side * tail * 0.55, cy + h * 0.25 + h * 0.12), (x_out, cy + h / 2 + h * 0.25), (x_in, cy + h / 2 + h * 0.25)]
        poly(d, tp, PINK, shadow=True)
    poly(d, [(cx - w / 2, cy - h / 2), (cx + w / 2, cy - h / 2), (cx + w / 2, cy + h / 2), (cx - w / 2, cy + h / 2)], fill)
    text(d, (cx, cy + 2), label, size, fill=WHITE, stroke=5, shadow=5)


def steam(d, x, y, height=110):
    for k, dx in enumerate((-40, 0, 40)):
        pts = [(x + dx + 14 * math.sin(t / 10 + k), y - t) for t in range(0, height, 6)]
        d.line(pts, fill=INK, width=8, joint='curve')


def save(img, name):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    q = 86
    while True:
        img.save(p, 'WEBP', quality=q, method=6)
        if os.path.getsize(p) < 200_000 or q <= 40:
            break
        q -= 8
    print(f'{name}: {os.path.getsize(p) // 1024} KB')


# ---------- the six pieces ----------
def logo():
    img, d = canvas(YELLOW)
    halftone(d, (0, 0, W, H), '#f5c400')
    poly(d, burst_pts(600, 380, 360, 285, n=18, rot=0.1), PINK)
    mark(d, 600, 360, 220)
    ribbon(d, 600, 655, 620, 120, 'BUN W BAS', 78)
    text(d, (600, 780), 'COFFEE  *  BUNS  *  GOOD MOODS', 34, fill=INK, stroke=0, shadow=0)
    return img


def cup_shape(d, cx, top, w_top, w_bot, h, body=WHITE, sleeve=RED):
    pts = [(cx - w_top / 2, top), (cx + w_top / 2, top), (cx + w_bot / 2, top + h), (cx - w_bot / 2, top + h)]
    poly(d, pts, body)
    # sleeve band
    s0, s1 = top + h * 0.3, top + h * 0.75
    lerp = lambda y: w_top / 2 + (w_bot / 2 - w_top / 2) * (y - top) / h
    sp = [(cx - lerp(s0), s0), (cx + lerp(s0), s0), (cx + lerp(s1), s1), (cx - lerp(s1), s1)]
    poly(d, sp, sleeve, shadow=False)
    # lid
    rrect(d, (cx - w_top / 2 - 22, top - 42, cx + w_top / 2 + 22, top + 6), body, radius=16, shadow=False)
    rrect(d, (cx - w_top / 2 + 20, top - 72, cx + w_top / 2 - 20, top - 36), body, radius=14, shadow=False)
    return (s0 + s1) / 2


def cup():
    img, d = canvas(CYAN)
    halftone(d, (0, 0, W, H), '#00a6e0')
    poly(d, burst_pts(600, 440, 400, 320, n=16), YELLOW)
    steam(d, 600, 170, 90)
    mid = cup_shape(d, 600, 230, 380, 290, 520)
    mark(d, 600, mid, 105, ring=YELLOW, face=WHITE, shadow=False)
    # small cup next to it
    mid2 = cup_shape(d, 900, 470, 200, 160, 280, body=PINK, sleeve=YELLOW)
    text(d, (900, mid2), 'BWB', 44, fill=RED, stroke=5, shadow=4)
    text(d, (260, 700), 'LATTE?', 70, fill=YELLOW)
    text(d, (260, 780), 'YES.', 70, fill=WHITE)
    return img


def apron():
    img, d = canvas(PINK)
    halftone(d, (0, 0, W, H), '#ec2f8c')
    poly(d, burst_pts(600, 440, 420, 340, n=20, rot=0.2), CYAN)
    # neck strap
    d.line([(510, 170), (540, 60), (660, 60), (690, 170)], fill=INK, width=30, joint='curve')
    d.line([(510, 170), (540, 60), (660, 60), (690, 170)], fill=RED, width=16, joint='curve')
    body = [(480, 160), (720, 160), (735, 330), (830, 360), (810, 800), (390, 800), (370, 360), (465, 330)]
    poly(d, body, RED)
    # waist ties
    d.line([(375, 380), (250, 420), (220, 470)], fill=INK, width=26, joint='curve')
    d.line([(825, 380), (950, 420), (980, 470)], fill=INK, width=26, joint='curve')
    mark(d, 600, 330, 110, ring=YELLOW, face=WHITE, shadow=False)
    text(d, (600, 500), 'BUN W BAS', 58, fill=YELLOW, stroke=5, shadow=5)
    rrect(d, (470, 580, 730, 740), YELLOW, radius=18, shadow=False)
    d.line([(600, 580), (600, 740)], fill=INK, width=LINE)
    text(d, (535, 660), 'PENS', 30, fill=INK, stroke=0, shadow=0)
    text(d, (665, 660), 'TIPS', 30, fill=INK, stroke=0, shadow=0)
    return img


def menu():
    img, d = canvas(RED)
    halftone(d, (0, 0, W, H), '#d0101f')
    rrect(d, (170, 70, 1030, 790), INK, radius=30)
    d.rounded_rectangle((200, 100, 1000, 760), 20, outline=YELLOW, width=6)
    mark(d, 290, 190, 70, ring=PINK, face=YELLOW, shadow=False)
    text(d, (640, 170), 'BUN W BAS', 76, fill=YELLOW, stroke=4, shadow=5)
    text(d, (640, 245), 'TODAY ON THE MENU', 32, fill=CYAN, stroke=0, shadow=0)
    items = [('ESPRESSO', PINK), ('LATTE', YELLOW), ('CAPPUCCINO', CYAN), ('COLD BREW', PINK), ('SESAME BUN', YELLOW)]
    f = font(44)
    for i, (name, c) in enumerate(items):
        y = 330 + i * 86
        d.text((250, y), name, font=f, fill=WHITE, anchor='lm')
        x_end = d.textlength(name, font=f) + 270
        for x in range(int(x_end), 820, 22):
            d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=WHITE)
        for k in range(3):  # S / M / L cup icons, no prices
            cx = 860 + k * 44
            s = 12 + k * 4
            d.polygon([(cx - s, y - s), (cx + s, y - s), (cx + s * 0.7, y + s), (cx - s * 0.7, y + s)], fill=c, outline=WHITE)
    return img


def mat():
    img, d = canvas(PAPER)
    halftone(d, (0, 0, W, H), '#efe3c4')
    # floor tiles
    for x in range(0, W, 150):
        d.line([(x, 0), (x - 300, H)], fill='#e6d8b5', width=4)
    poly(d, [(170, 230), (1030, 230), (1100, 720), (100, 720)], RED)
    poly(d, [(225, 275), (975, 275), (1030, 675), (170, 675)], YELLOW, shadow=False)
    halftone(d, (240, 290, 960, 660), '#f0cc00', step=26, r=3)
    mark(d, 330, 470, 105, ring=PINK, face=WHITE, shadow=False)
    text(d, (690, 410), 'HELLO!', 120, fill=RED, stroke=6, shadow=7)
    text(d, (690, 560), 'COFFEE INSIDE', 58, fill=WHITE, stroke=5, shadow=5)
    # two sneakers' worth of footprints
    for fx, fy in [(870, 760), (960, 800)]:
        d.ellipse((fx - 26, fy - 14, fx + 26, fy + 14), fill='#d6c8a5')
    return img


def card_layer(front):
    cw, ch = 560, 330
    layer = Image.new('RGBA', (cw + 60, ch + 60), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((20 + SHADOW, 20 + SHADOW, 20 + cw + SHADOW, 20 + ch + SHADOW), 22, fill=INK)
    if front:
        d.rounded_rectangle((20, 20, 20 + cw, 20 + ch), 22, fill=RED, outline=INK, width=LINE)
        halftone(d, (40, 40, 20 + cw - 20, 20 + ch - 20), '#d0101f', step=20, r=2.6)
        mark(d, 160, 185, 95, ring=YELLOW, face=WHITE, shadow=False)
        text(d, (420, 165), 'BUN', 72, fill=YELLOW, stroke=5, shadow=5)
        text(d, (420, 240), 'W BAS', 56, fill=WHITE, stroke=5, shadow=5)
    else:
        d.rounded_rectangle((20, 20, 20 + cw, 20 + ch), 22, fill=YELLOW, outline=INK, width=LINE)
        d.rectangle((20 + LINE, 250, 20 + cw - LINE, 20 + ch - LINE), fill=PINK)
        d.line([(20, 250), (20 + cw, 250)], fill=INK, width=LINE)
        f1, f2 = font(44), font(26)
        d.text((60, 90), 'BARISTA BOSS', font=f1, fill=INK, anchor='lm')
        d.text((60, 150), 'COFFEE  *  BUNS', font=f2, fill=INK, anchor='lm')
        d.text((60, 195), 'GOOD MOODS DAILY', font=f2, fill=INK, anchor='lm')
        d.text((300, 300), 'BUN W BAS', font=f2, fill=WHITE, anchor='mm', stroke_width=3, stroke_fill=INK)
    return layer


def cards():
    img, d = canvas(CYAN)
    halftone(d, (0, 0, W, H), '#00a6e0')
    poly(d, burst_pts(600, 420, 430, 350, n=22), PINK)
    back = card_layer(False).rotate(9, resample=Image.BICUBIC, expand=True)
    front = card_layer(True).rotate(-7, resample=Image.BICUBIC, expand=True)
    img.paste(back, (520, 40), back)
    img.paste(front, (70, 330), front)
    return img


def hero():
    img, d = canvas(RED)
    d.polygon([(560, 0), (W, 0), (W, H), (380, H)], fill=PINK)
    halftone(d, (0, 0, W, H), INK, step=26, r=2.6)
    poly(d, burst_pts(620, 420, 400, 320, n=18, rot=0.15), YELLOW)
    # menu board behind
    rrect(d, (720, 120, 1080, 470), INK, radius=22)
    d.rounded_rectangle((740, 140, 1060, 450), 14, outline=YELLOW, width=5)
    text(d, (900, 195), 'MENU', 60, fill=YELLOW, stroke=3, shadow=4)
    for i, c in enumerate((PINK, CYAN, YELLOW)):
        y = 270 + i * 58
        d.rounded_rectangle((775, y - 12, 960, y + 12), 8, fill=WHITE)
        d.ellipse((990, y - 14, 1018, y + 14), fill=c)
    # door mat in front
    poly(d, [(170, 650), (760, 650), (800, 800), (130, 800)], CYAN)
    text(d, (465, 725), 'HELLO!', 64, fill=YELLOW, stroke=5, shadow=5)
    # big cup
    steam(d, 520, 150, 80)
    mid = cup_shape(d, 520, 220, 300, 230, 410)
    mark(d, 520, mid, 85, ring=YELLOW, face=WHITE, shadow=False)
    # badge top-left
    mark(d, 210, 230, 130)
    ribbon(d, 210, 420, 330, 80, 'BUN W BAS', 46)
    return img


if __name__ == '__main__':
    for name, fn in [('hero', hero), ('logo', logo), ('cup', cup), ('apron', apron), ('menu-board', menu), ('door-mat', mat), ('business-cards', cards)]:
        save(fn(), f'{name}.webp')

#!/usr/bin/env python3
"""Make the homepage walkthrough images in assets/demo/ from Sahm Mena's real Instagram screenshots.

Input (not in the repo): a folder with grid.png (the profile page, logo at the top) and post1.png .. post6.png
(one screenshot per reel, in grid order). Usage:  python build/demo-images.py <folder>

- post-1.webp .. post-6.webp: the reel covers, downscaled, lossy WebP.
- logo.webp: the round profile picture (the white SAHM circle) cut out of grid.png, transparent outside the circle.
Nothing is drawn or added; the files are crops of the screenshots only.
"""
import os, sys
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'demo')
SRC = sys.argv[1]

os.makedirs(OUT, exist_ok=True)
POST_W = 240  # the mock shows them at most ~250 css px wide (the Instagram card); 4:5 covers

for i in range(1, 7):
    im = Image.open(os.path.join(SRC, f'post{i}.png')).convert('RGB')
    w, h = im.size
    im = im.resize((POST_W, round(h * POST_W / w)), Image.LANCZOS)
    im.save(os.path.join(OUT, f'post-{i}.webp'), 'WEBP', quality=78, method=6)
    print(f'post-{i}.webp', im.size, os.path.getsize(os.path.join(OUT, f'post-{i}.webp')), 'bytes')

# the profile picture: the circle centred at (626, 215) with the gradient ring ~82 px out, in a 1920 x 1072 screenshot
grid = Image.open(os.path.join(SRC, 'grid.png')).convert('RGB')
cx, cy, r = 626, 215, 80
box = (cx - r, cy - r, cx + r, cy + r)
logo = grid.crop(box).convert('RGBA')
mask = Image.new('L', logo.size, 0)
ImageDraw.Draw(mask).ellipse((0, 0, logo.size[0] - 1, logo.size[1] - 1), fill=255)
logo.putalpha(mask)
logo = logo.resize((128, 128), Image.LANCZOS)
logo.save(os.path.join(OUT, 'logo.webp'), 'WEBP', quality=90, method=6)
print('logo.webp', logo.size, os.path.getsize(os.path.join(OUT, 'logo.webp')), 'bytes')

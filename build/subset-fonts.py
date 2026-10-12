#!/usr/bin/env python3
"""Make the small web-font files the pages use (speed: fewer font bytes before the first paint on phones).

Run after changing any text (i18n/, templates/, site.js, data/):  python3 build/subset-fonts.py && node build/build.mjs
Needs fonttools + brotli (pip install fonttools brotli). The original font files in fonts/ stay untouched (the studio deck
uses them); this writes fonts/*.subset.woff2 and fonts/subset-coverage.json. build/check.mjs fails when a page uses a
character that the subset files do not contain, so a forgotten re-run cannot ship a missing glyph.

- Archivo (variable, wght 100-900) and Noto Sans Arabic 400/700: same fonts, only the characters the site uses
  (plus printable ASCII and common punctuation; for Arabic every basic letter, haraka, digit and punctuation mark).
- Instrument Sans: the four static files (400/500/600/700) are one design interpolated along weight, so they are rebuilt
  as one variable file with 400 and 700 as masters. 500 and 600 come out identical to the static files (the script stops
  if any point or advance width differs by more than 1 font unit). fonts.css keeps four @font-face rules (400/500/600/700)
  pointing at that one file, so the browser picks the same weights as before and downloads one file instead of four.
"""
import glob, json, os, re, statistics, sys, tempfile
from fontTools import subset, varLib
from fontTools.designspaceLib import DesignSpaceDocument, AxisDescriptor, SourceDescriptor
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
F = lambda *p: os.path.join(ROOT, 'fonts', *p)

def site_text():
    files = glob.glob(os.path.join(ROOT, 'i18n', '*.json')) + glob.glob(os.path.join(ROOT, 'templates', '*.html')) \
        + glob.glob(os.path.join(ROOT, 'data', '*.json')) + [os.path.join(ROOT, 'site.js')]
    chars = set()
    for f in files:
        s = open(f, encoding='utf-8').read()
        s = re.sub(r'&#x([0-9a-fA-F]+);', lambda m: chr(int(m.group(1), 16)), s)
        s = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), s)
        s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
        chars |= set(s)
    import html.entities
    for name in ('copy', 'middot', 'nbsp', 'rarr', 'larr', 'mdash', 'ndash', 'hellip', 'laquo', 'raquo', 'rsquo', 'lsquo', 'ldquo', 'rdquo', 'times', 'deg', 'reg', 'trade', 'euro', 'bull'):
        chars.add(chr(html.entities.name2codepoint[name]))
    return chars

def is_latin(c):
    o = ord(c)
    return 0x20 <= o < 0x600 or 0x2000 <= o <= 0x22FF or o in (0xFEFF, 0xFFFD)

def is_arabic(c):
    o = ord(c)
    return 0x600 <= o <= 0x6FF or 0x750 <= o <= 0x77F or 0xFB50 <= o <= 0xFEFC or o in (0x200C, 0x200D, 0x200E, 0x200F)

def do_subset(src, dst, text, keep_vf=True):
    font = TTFont(src)
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.glyph_names = True  # keeps the post table names: without them Chrome on macOS draws the same outlines slightly differently
    opts.flavor = 'woff2'
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(font)
    font.flavor = 'woff2'
    font.recalcTimestamp = False  # same input, same bytes (stable hashed file names)
    font.save(dst)
    return sorted({chr(u) for u in font.getBestCmap()})

def instrument_variable(text, dst):
    tmp = tempfile.mkdtemp()
    statics = {}
    for w in (400, 500, 600, 700):
        p = os.path.join(tmp, f'is{w}.woff2')
        do_subset(F(f'instrument-sans-latin-{w}-normal.woff2'), p, text)
        f = TTFont(p); f.flavor = None; f.recalcTimestamp = False; f.save(os.path.join(tmp, f'is{w}.ttf')); statics[w] = TTFont(os.path.join(tmp, f'is{w}.ttf'))
    # the intermediate weights must be the straight-line blend of 400 and 700, or the variable file would change them
    a, b = statics[400], statics[700]
    for w in (500, 600):
        t, c, worst = (w - 400) / 300, statics[w], 0
        for g in a.getGlyphOrder():
            ga, gb, gc = a['glyf'][g], b['glyf'][g], c['glyf'][g]
            if ga.numberOfContours > 0:
                for (xa, ya), (xb, yb), (xc, yc) in zip(ga.coordinates, gb.coordinates, gc.coordinates):
                    worst = max(worst, abs(xa + (xb - xa) * t - xc), abs(ya + (yb - ya) * t - yc))
            worst = max(worst, abs(a['hmtx'][g][0] + (b['hmtx'][g][0] - a['hmtx'][g][0]) * t - c['hmtx'][g][0]))
        if worst > 1.0:
            sys.exit(f'Instrument Sans {w} is not the blend of 400 and 700 (off by {worst} units); keep the static files')
    ds = DesignSpaceDocument()
    ax = AxisDescriptor(); ax.tag, ax.name, ax.minimum, ax.default, ax.maximum = 'wght', 'Weight', 400, 400, 700; ds.addAxis(ax)
    for w in (400, 700):
        sd = SourceDescriptor(); sd.path = os.path.join(tmp, f'is{w}.ttf'); sd.name = f'w{w}'; sd.location = {'Weight': w}; ds.addSource(sd)
    vf, _, _ = varLib.build(ds)
    vf.flavor = 'woff2'
    vf.recalcTimestamp = False
    vf.save(dst)
    return sorted({chr(u) for u in vf.getBestCmap()})

chars = site_text()
latin = {c for c in chars if is_latin(c)} | {chr(i) for i in range(0x20, 0x7F)} | set(' –—‘’“”…•€™©®°×·«»')
# Arabic: what the site uses + every basic Arabic letter, haraka, digit and punctuation mark (so names typed into the forms
# keep joined letters); the Persian/Urdu extensions of the block are left out (a missing glyph falls back to the system font)
arabic = {c for c in chars if is_arabic(c)} | {chr(i) for i in range(0x621, 0x653)} | {chr(i) for i in range(0x660, 0x66E)} \
    | {chr(i) for i in (0x60C, 0x61B, 0x61F, 0x640, 0x670, 0x200C, 0x200D, 0x200E, 0x200F)}
lt, at = ''.join(sorted(latin)), ''.join(sorted(arabic))
cov = {
    'archivo': do_subset(F('archivo-latin-wght-normal.woff2'), F('archivo-latin-wght-normal.subset.woff2'), lt),
    'instrument': instrument_variable(lt, F('instrument-sans-latin-var.subset.woff2')),
    'arabic400': do_subset(F('noto-sans-arabic-arabic-400-normal.woff2'), F('noto-sans-arabic-arabic-400-normal.subset.woff2'), at),
    'arabic700': do_subset(F('noto-sans-arabic-arabic-700-normal.woff2'), F('noto-sans-arabic-arabic-700-normal.subset.woff2'), at),
}
json.dump({k: ''.join(v) for k, v in cov.items()}, open(F('subset-coverage.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
for f in sorted(glob.glob(F('*.subset.woff2'))):
    print(os.path.basename(f), os.path.getsize(f))

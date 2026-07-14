#!/usr/bin/env python3
"""Generate PWA icons (pure stdlib PNG writer).

Renders the emberfox sprite (copied from js/sprites.js) on the game's
background color at 192, 512, and a 512 maskable with extra safe padding.
Run: python3 tools/gen_icons.py
"""
import os
import struct
import zlib

PAL = {
    'o': (0x2a, 0x1a, 0x20), 'a': (0xe8, 0x76, 0x3a), 'b': (0xf5, 0xa5, 0x5c),
    'c': (0xff, 0xf1, 0xdc), 'k': (0x1a, 0x10, 0x14), 'f': (0xff, 0xd2, 0x3e),
    'g': (0xff, 0x8c, 0x2e),
}
GRID = [
    '................',
    '...o....o.......',
    '..oao..oao......',
    '..obao.obao.....',
    '..oaaaoaaao.....',
    '..oaaaaaaao.....',
    '..oakaaakao.....',
    '..oaaacaaao.....',
    '...oacccao......',
    'f...oaaaaoo.....',
    'gf.oaaaaaaao....',
    'ogfoaaaaaaao....',
    '.ogfaaaaaao.....',
    '..ooaooaoo......',
    '...oao..oao.....',
    '....o....o......',
]
BG = (0x13, 0x10, 0x22)
FRAME = (0x35, 0x30, 0x5a)


def make_pixels(size, pad_frac):
    px = [[BG for _ in range(size)] for _ in range(size)]
    frame_w = max(2, size // 48)
    for y in range(size):
        for x in range(size):
            if x < frame_w or y < frame_w or x >= size - frame_w or y >= size - frame_w:
                px[y][x] = FRAME
    pad = int(size * pad_frac)
    scale = (size - 2 * pad) // 16
    ox = (size - scale * 16) // 2
    oy = (size - scale * 16) // 2
    for r, row in enumerate(GRID):
        for c, ch in enumerate(row):
            if ch == '.':
                continue
            col = PAL[ch]
            for dy in range(scale):
                for dx in range(scale):
                    px[oy + r * scale + dy][ox + c * scale + dx] = col
    return px


def write_png(path, px):
    size = len(px)
    raw = b''.join(b'\x00' + b''.join(struct.pack('BBB', *p) for p in row) for row in px)

    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
           + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    print(f'wrote {path} ({size}x{size})')


out = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(out, exist_ok=True)
write_png(os.path.join(out, 'icon-192.png'), make_pixels(192, 0.10))
write_png(os.path.join(out, 'icon-512.png'), make_pixels(512, 0.10))
write_png(os.path.join(out, 'icon-512-maskable.png'), make_pixels(512, 0.22))

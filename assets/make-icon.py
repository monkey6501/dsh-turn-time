"""Draw the market storefront tile for dsh-turn-time: a stopwatch, 180x180 PNG.

The geometry is the same stopwatch as ``icon.svg`` (a 36-unit canvas), scaled
to 180px: every source coordinate is multiplied by ``UNIT``.
"""

from PIL import Image, ImageDraw

UNIT = 5          # 36-unit canvas -> 180px
SUPERSAMPLE = 4   # draw big, downsample for antialiasing
SIZE = 180

BLUE = (91, 140, 192, 255)
STROKE = 2.4 * UNIT
RADIUS = 10.5 * UNIT
CX, CY = 18 * UNIT, 21 * UNIT

S = SIZE * SUPERSAMPLE
image = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)


def px(value):
    """One 36-unit coordinate to supersampled pixels."""
    return round(value * UNIT * SUPERSAMPLE)


def dot(x, y, radius):
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=BLUE)


# Dial ring.
stroke = px(2.4)
draw.ellipse(
    [px(18) - px(10.5), px(21) - px(10.5), px(18) + px(10.5), px(21) + px(10.5)],
    outline=BLUE,
    width=stroke,
)

# Hands: down from 14.6 to the centre, then out to 22.2 / 23.5, round capped.
cap = stroke / 2
draw.line([(px(18), px(14.6)), (px(18), px(21)), (px(22.2), px(23.5))], fill=BLUE, width=stroke, joint="curve")
dot(px(18), px(14.6), cap)
dot(px(22.2), px(23.5), cap)
dot(px(18), px(21), cap)

# Crown and stem above the dial.
draw.rounded_rectangle(
    [px(16.1), px(5.4), px(19.9), px(9.0)],
    radius=px(1.0),
    fill=BLUE,
)
draw.rectangle([px(17.2), px(8.6), px(18.8), px(11.2)], fill=BLUE)

image = image.resize((SIZE, SIZE), Image.LANCZOS)
image.save(r"D:\Models\DSH\plugin\dsh-turn-time\assets\icon-180.png", "PNG", optimize=True)
print("written", image.size, image.mode)

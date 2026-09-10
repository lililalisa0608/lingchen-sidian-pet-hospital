from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "characters"
OUTPAINT = ASSETS / "lin-xia-right-edge-outpaint-source-v1.png"
OUTPUT_SIZE = (1100, 1672)


def build_extension() -> Image.Image:
    generated = Image.open(OUTPAINT).convert("RGB").resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    extension = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    source_pixels = generated.load()
    extension_pixels = extension.load()
    candidate = set()

    # Image generation returned the transparent area as a light checkerboard.
    # On the right-side patch the actual sleeve/backpack is olive or dark, so
    # luminance + colour separation gives us a clean foreground matte.
    for y in range(generated.height):
        for x in range(880, generated.width):
            red, green, blue = source_pixels[x, y]
            luminance = (red + green + blue) / 3
            saturation = max(red, green, blue) - min(red, green, blue)
            dark = max(0.0, min(1.0, (202 - luminance) / 42))
            colour = max(0.0, min(1.0, (saturation - 5) / 24))
            alpha = max(dark, colour)
            if alpha < 0.12:
                continue
            ramp = max(0.0, min(1.0, (x - 880) / 60))
            alpha_byte = round(255 * alpha * ramp)
            extension_pixels[x, y] = (red, green, blue, alpha_byte)
            if alpha_byte > 24:
                candidate.add((x, y))

    # Keep only substantial shapes joined to the original right boundary.
    # This removes tiny checkerboard artefacts without touching the portrait.
    keep = set()
    while candidate:
        seed = candidate.pop()
        component = {seed}
        stack = [seed]
        min_x = seed[0]
        while stack:
            x, y = stack.pop()
            min_x = min(min_x, x)
            for point in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if point in candidate:
                    candidate.remove(point)
                    component.add(point)
                    stack.append(point)
        if min_x <= 945 and len(component) >= 500:
            keep.update(component)

    for y in range(extension.height):
        for x in range(880, extension.width):
            if (x, y) not in keep:
                extension_pixels[x, y] = (0, 0, 0, 0)
    return extension


def repair(input_name: str, output_name: str, extension: Image.Image) -> None:
    original = Image.open(ASSETS / input_name).convert("RGBA")
    output = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    output.alpha_composite(extension)
    output.alpha_composite(original)
    output.save(ASSETS / output_name, "WEBP", lossless=True, method=6)


right_edge = build_extension()
repair("lin-xia-dialogue-neutral-v4.webp", "lin-xia-dialogue-neutral-v5.webp", right_edge)
repair("lin-xia-dialogue-troubled-v4.webp", "lin-xia-dialogue-troubled-v5.webp", right_edge)

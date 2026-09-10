#!/usr/bin/env python3
"""
AURA Audio Engine: High-Fidelity Image Color Palette Extractor
Analyzes album covers, YouTube thumbnails, and local images to extract dominant vibrant colors and dark ambient gradients.
Accurately crops letterbox bars, detects vibrant or moody atmospheric tones, and synthesizes harmonious dark gradients.
"""
import sys
import os
import io
import json
import urllib.request
from PIL import Image

def extract_palette(target):
    if not target:
        return None

    target = target.strip()

    # If it's a YouTube ID (e.g. dQw4w9WgXcQ or yt-dQw4w9WgXcQ-12345)
    if not target.startswith('http') and not os.path.exists(target):
        clean_id = target
        if clean_id.startswith('yt-'):
            parts = clean_id.split('-')
            if len(parts) >= 2:
                clean_id = parts[1]
        target = f"https://img.youtube.com/vi/{clean_id}/hqdefault.jpg"

    try:
        if target.startswith('http://') or target.startswith('https://'):
            req = urllib.request.Request(target, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            content = urllib.request.urlopen(req, timeout=6).read()
            img = Image.open(io.BytesIO(content)).convert('RGB')
        elif os.path.exists(target):
            img = Image.open(target).convert('RGB')
        else:
            return None

        w, h = img.size
        # Crop YouTube letterbox black bars if 4:3 hqdefault thumbnail
        if abs(w / h - 4/3) < 0.05:
            img = img.crop((0, int(h * 0.12), w, int(h * 0.88)))

        # Downscale to 48x48 for fast analysis while preserving key dominant regions
        img = img.resize((48, 48), Image.Resampling.BILINEAR)
        colors = img.getcolors(maxcolors=2500)
        if not colors:
            return None

        # Sort by pixel frequency
        colors.sort(key=lambda x: x[0], reverse=True)

        candidates = []
        for count, (r, g, b) in colors:
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            delta = max_c - min_c
            val = max_c / 255.0
            sat = (delta / max_c) if max_c > 0 else 0

            # Discard letterbox black remnants or blinding pure white
            if val < 0.08 or (val > 0.96 and sat < 0.05):
                continue

            # Vibrancy score prioritizing rich musical tones
            vibrancy_score = (sat * 2.5 + (1.0 - abs(val - 0.55)) * 0.8) * (count ** 0.35)
            candidates.append({
                "score": vibrancy_score,
                "sat": sat,
                "val": val,
                "count": count,
                "rgb": (r, g, b)
            })

        if not candidates:
            return None

        # 1. First priority: rich vibrant accents (sat >= 0.18)
        saturated = [c for c in candidates if c["sat"] >= 0.18]
        if saturated:
            saturated.sort(key=lambda x: x["score"], reverse=True)
            chosen_rgb = saturated[0]["rgb"]
        else:
            # 2. Second priority for noir / moody monochrome albums: pick dominant midtone
            midtones = [c for c in candidates if 0.22 <= c["val"] <= 0.85]
            if midtones:
                midtones.sort(key=lambda x: x["count"], reverse=True)
                chosen_rgb = midtones[0]["rgb"]
            else:
                chosen_rgb = candidates[0]["rgb"]

        r, g, b = chosen_rgb

        # Ensure primary accent has sufficient luminosity for crisp UI rendering
        max_val = max(r, g, b)
        if max_val < 130:
            boost = 150 / max(max_val, 1)
            br = min(255, int(r * boost))
            bg = min(255, int(g * boost))
            bb = min(255, int(b * boost))
            primary_hex = f"#{br:02x}{bg:02x}{bb:02x}"
            accent_r, accent_g, accent_b = br, bg, bb
        else:
            primary_hex = f"#{r:02x}{g:02x}{b:02x}"
            accent_r, accent_g, accent_b = r, g, b

        # Generate harmonious dark background gradients that guarantee text contrast
        # Left side: deep atmospheric tint matching the cover art
        dark_r = max(20, int(accent_r * 0.30))
        dark_g = max(20, int(accent_g * 0.30))
        dark_b = max(20, int(accent_b * 0.30))

        # Right side: deep obsidian night shadow
        deep_r = max(8, int(accent_r * 0.08))
        deep_g = max(8, int(accent_g * 0.08))
        deep_b = max(8, int(accent_b * 0.08))

        return {
            "primary": primary_hex,
            "gradient": [
                f"rgba({dark_r}, {dark_g}, {dark_b}, 0.90)",
                f"rgba({deep_r}, {deep_g}, {deep_b}, 0.96)"
            ],
            "border": f"rgba({accent_r}, {accent_g}, {accent_b}, 0.42)",
            "glow": primary_hex,
            "progressBar": primary_hex
        }
    except Exception as e:
        sys.stderr.write(f"Palette extraction error: {e}\n")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps(None))
        sys.exit(0)

    arg = sys.argv[1]
    result = extract_palette(arg)
    print(json.dumps(result))

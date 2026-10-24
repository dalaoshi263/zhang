"""Build a calibrated, transparent portrait sprite from the supplied turn video.

Run ``--inspect`` first. Contact sheets label exact zero-based SOURCE frame
numbers, never the sampled/contact-sheet index. Run ``--build`` only after
visually auditing those sheets and calibrating ANGLE_SOURCE_KEYS below.

Dependencies: Pillow + NumPy, and the existing project-local ffmpeg executable.
No computer-vision model, external image service, or runtime video is needed.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter


PROJECT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path('D:/Backup/Downloads/自由-第1集-分镜1-1.mp4')
WORK = PROJECT / 'tmp' / 'portrait-turn'
OUT = PROJECT / 'public' / 'portrait-turn'
FRAME_SIZE = (960, 960)
FPS = 24

# Calibrated only AFTER inspecting contact-sheet-01/02.jpg and full-size frames.
# Screen-space convention: 0 right; 90 down; 180 left; 270 up.
# There is deliberately NO 45-degree lower-right anchor: the supplied clip
# does not contain an independently photographed lower-right pose.
ANGLE_SOURCE_KEYS = [
    (0, 28, 'right'), (90, 136, 'down'), (105, 128, 'down-left-15'),
    (120, 124, 'down-left-30'), (135, 116, 'down-left'),
    (150, 112, 'left-down-30'), (165, 108, 'left-down-15'),
    (180, 100, 'left'), (195, 96, 'left-up-15'),
    (210, 92, 'left-up-30'), (225, 88, 'up-left'),
    (240, 84, 'up-left-30'), (255, 80, 'up-left-15'),
    (270, 72, 'up'), (285, 68, 'up-right-15'),
    (300, 60, 'up-right-30'), (315, 52, 'up-right'),
    (330, 40, 'right-up-30'), (340, 36, 'right-up-20'),
    (350, 32, 'right-up-10'),
]


def calibrated_config():
    source_frames = [0] + [key[1] for key in ANGLE_SOURCE_KEYS]
    return {
        'version': 1,
        'frameWidth': 448, 'frameHeight': 448,
        'columns': 7, 'rows': 3, 'frameCount': len(source_frames),
        'frontFrame': 0, 'frontSourceFrame': 0,
        'faceAnchor': {'x': .5, 'y': .43}, 'deadZone': 42,
        'sourceFrames': source_frames,
        'angleKeys': [{'angle': angle, 'frame': index + 1,
                       'sourceFrame': source_frame, 'label': label}
                      for index, (angle, source_frame, label) in enumerate(ANGLE_SOURCE_KEYS)],
        'angleConvention': 'screen space: 0=right, 90=down, 180=left, 270=up',
        'calibrationMethod': 'manual visual audit of exact-source-frame contact sheets and full-size frames; nearest calibrated pose, never angle/360*frameCount',
        'missingPoses': ['down-right'],
        'missingPoseFallback': 'nearest angular key; ties use right, no fabricated mirrored frame',
        'sourceFps': FPS, 'sourceFrameCount': 193,
        'crop': {'x': 0, 'y': 0, 'width': 960, 'height': 960},
        'matting': 'border-color spatial model + edge-connected background + protected subject silhouette; no global white/gray brightness key',
    }


def write_config():
    OUT.mkdir(parents=True, exist_ok=True)
    config = calibrated_config()
    (OUT / 'calibration.json').write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding='utf-8')
    for source in WORK.glob('contact-sheet-*.jpg'):
        (OUT / source.name).write_bytes(source.read_bytes())
    return config


def ffmpeg_path() -> Path:
    candidates = list((PROJECT / 'tmp' / 'cinematic' / 'imageio_ffmpeg' / 'binaries').glob('ffmpeg*.exe'))
    candidates += list((Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/Lib/site-packages/imageio_ffmpeg/binaries').glob('ffmpeg*.exe'))
    if not candidates:
        raise RuntimeError('Expected existing project-local ffmpeg runtime.')
    return candidates[0]


def font(size=20):
    return ImageFont.truetype('C:/Windows/Fonts/arial.ttf', size)


def extract(source: Path):
    frames_dir = WORK / 'source-frames'
    frames_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = WORK / 'source-manifest.json'
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if manifest.get('sourceSize') == source.stat().st_size and len(list(frames_dir.glob('frame-*.png'))) == manifest['frameCount']:
            return manifest
    command = [str(ffmpeg_path()), '-hide_banner', '-loglevel', 'error', '-i', str(source),
               '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    frame_bytes = FRAME_SIZE[0] * FRAME_SIZE[1] * 3
    count = 0
    while True:
        raw = process.stdout.read(frame_bytes)
        if not raw:
            break
        if len(raw) != frame_bytes:
            raise RuntimeError(f'Incomplete decoded frame {count}: {len(raw)} bytes')
        Image.frombytes('RGB', FRAME_SIZE, raw).save(frames_dir / f'frame-{count:04d}.png', compress_level=1)
        count += 1
    error = process.stderr.read().decode('utf-8', 'replace')
    if process.wait() != 0:
        raise RuntimeError(error)
    manifest = {'source': str(source), 'sourceSize': source.stat().st_size, 'sourceWidth': 960,
                'sourceHeight': 960, 'fps': FPS, 'frameCount': count,
                'frameIndexConvention': 'zero-based decoded source frame; no temporal resampling'}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return manifest


def contact_sheet(manifest):
    indices = list(range(0, manifest['frameCount'], 4))
    if indices[-1] != manifest['frameCount'] - 1:
        indices.append(manifest['frameCount'] - 1)
    # Two sheets retain enough facial detail to audit up/down and diagonal looks.
    sheets = []
    for page, start in enumerate(range(0, len(indices), 25), 1):
        page_indices = indices[start:start + 25]
        cell_w, image_h, label_h, cols = 280, 280, 32, 5
        rows = math.ceil(len(page_indices) / cols)
        sheet = Image.new('RGB', (cols * cell_w, rows * (image_h + label_h) + 48), '#181818')
        draw = ImageDraw.Draw(sheet)
        draw.text((16, 12), f'SOURCE FRAMES — page {page} — exact zero-based frame / 24fps', font=font(19), fill='#ffffff')
        for index, source_index in enumerate(page_indices):
            image = Image.open(WORK / 'source-frames' / f'frame-{source_index:04d}.png')
            image.thumbnail((cell_w, image_h), Image.Resampling.LANCZOS)
            x, y = (index % cols) * cell_w, 48 + (index // cols) * (image_h + label_h)
            sheet.paste(image, (x, y))
            draw.text((x + 10, y + image_h + 5), f'FRAME {source_index:03d}   {source_index / FPS:.3f}s', font=font(18), fill='#ffffff')
        output = WORK / f'contact-sheet-{page:02d}.jpg'
        sheet.save(output, quality=94, subsampling=0)
        sheets.append(str(output))
    return sheets


def inspect(source):
    manifest = extract(source)
    sheets = contact_sheet(manifest)
    print(json.dumps({'manifest': manifest, 'contactSheets': sheets}, ensure_ascii=False, indent=2), flush=True)


def background_model(rgb):
    """Fit the border's actual color, rather than assuming white is removable.

    The lower border is excluded: a bust portrait's pale clothing reaches it.
    A polynomial accommodates the supplied background's gentle lighting falloff.
    """
    h, w = rgb.shape[:2]
    y, x = np.mgrid[:h, :w]
    x = x.astype(np.float32) / (w - 1)
    y = y.astype(np.float32) / (h - 1)
    basis = np.stack((np.ones_like(x), x, y, x * x, x * y, y * y), axis=-1)
    sample = ((x < .012) | (x > .988)) & (y < .67)
    sample |= (y < .007)
    fit_x, fit_y = basis[sample], rgb[sample].astype(np.float32)
    # Robust refit rejects compression outliers / any hair touching a border.
    coefficients = np.linalg.lstsq(fit_x, fit_y, rcond=None)[0]
    residual = np.linalg.norm(fit_y - fit_x @ coefficients, axis=-1)
    keep = residual < np.percentile(residual, 92)
    coefficients = np.linalg.lstsq(fit_x[keep], fit_y[keep], rcond=None)[0]
    return np.clip(basis @ coefficients, 0, 255)


def connected_border(mask):
    import cv2
    h, w = mask.shape
    _, labels = cv2.connectedComponents(mask.astype(np.uint8), connectivity=8)
    ids = np.unique(np.concatenate((labels[0], labels[:int(h * .7), 0], labels[:int(h * .7), -1])))
    ids = ids[ids != 0]
    return np.isin(labels, ids)


def matte_frame(source_index, preview=False):
    """Color key with edge connectivity and protected interior + GrabCut trimap.

    NO brightness/global white/gray threshold is used. Clothing that resembles
    the backdrop remains foreground when it sits within the subject silhouette.
    """
    import cv2
    from scipy import ndimage
    image = Image.open(WORK / 'source-frames' / f'frame-{source_index:04d}.png').convert('RGB')
    rgb = np.asarray(image)
    backdrop = background_model(rgb)
    distance = np.linalg.norm(rgb.astype(np.float32) - backdrop, axis=-1)
    border_bg = connected_border(distance < 22)
    raw_foreground = ~border_bg
    labels, count = ndimage.label(raw_foreground)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    subject = labels == sizes.argmax()
    subject = ndimage.binary_fill_holes(subject)
    subject = ndimage.binary_closing(subject, iterations=3, border_value=0)
    # Preserve the portrait's lower connected torso at the image boundary.
    subject[-8:] = raw_foreground[-8:] | subject[-9]
    definite_fg = ndimage.binary_erosion(subject, iterations=8)
    trimap = np.full(rgb.shape[:2], cv2.GC_PR_BGD, np.uint8)
    trimap[subject] = cv2.GC_PR_FGD
    trimap[definite_fg] = cv2.GC_FGD
    trimap[border_bg & (distance < 8)] = cv2.GC_BGD
    trimap[0] = cv2.GC_BGD
    trimap[:int(rgb.shape[0] * .65), 0] = cv2.GC_BGD
    trimap[:int(rgb.shape[0] * .65), -1] = cv2.GC_BGD
    cv2.grabCut(rgb.copy(), trimap, None, np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64), 2, cv2.GC_INIT_WITH_MASK)
    keep = (trimap == cv2.GC_FGD) | (trimap == cv2.GC_PR_FGD)
    labels, count = ndimage.label(keep)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    keep = ndimage.binary_fill_holes(labels == sizes.argmax())
    # One sub-pixel feather; no broad shrink or color-based deletion of fabric.
    alpha = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), .65)
    # Remove only backdrop contribution on fractional edges; preserve opaque RGB.
    safe_alpha = np.maximum(alpha[..., None], .22)
    clean = (rgb.astype(np.float32) - backdrop * (1 - alpha[..., None])) / safe_alpha
    clean = np.where((alpha > .02)[..., None], np.clip(clean, 0, 255), 0)
    rgba = np.dstack((clean.astype(np.uint8), np.round(alpha * 255).astype(np.uint8)))
    output = Image.fromarray(rgba, 'RGBA')
    if preview:
        preview_path = WORK / f'matte-frame-{source_index:04d}.webp'
        output.save(preview_path, lossless=True)
        checker = Image.new('RGB', image.size, '#202027')
        draw = ImageDraw.Draw(checker)
        for yy in range(0, image.height, 40):
            for xx in range(0, image.width, 40):
                if (xx // 40 + yy // 40) % 2:
                    draw.rectangle((xx, yy, xx + 39, yy + 39), fill='#35353f')
        checker.paste(output, mask=output.getchannel('A'))
        checker.save(WORK / f'matte-preview-{source_index:04d}.jpg', quality=95)
        print(str(preview_path), flush=True)
    return output


def alpha_evidence(rgba, rgb):
    alpha = np.asarray(rgba.getchannel('A'))
    # Visually audited fabric positions are independent of the alpha result.
    # Every pose keeps these same cardigan/tee patches, since no frame is
    # recropped or recentered independently.
    patches = {'left_cardigan': (80, 860), 'right_cardigan': (875, 860),
               'inner_tee': (480, 942), 'left_knit': (140, 790),
               'right_knit': (820, 790)}
    sample_result = {name: int(alpha[y - 2:y + 3, x - 2:x + 3].min())
                     for name, (x, y) in patches.items()}
    # These SOURCE-coordinate rectangles were checked against the unkeyed
    # photos, so the pale-fabric assertion is independent of the resulting mask.
    pale_rois = {}
    for name, (x0, y0, x1, y1) in {
        'left_sleeve': (65, 790, 215, 945),
        'right_sleeve': (780, 790, 895, 945),
    }.items():
        source_roi = rgb[y0:y1, x0:x1]
        alpha_roi = alpha[y0:y1, x0:x1]
        pale = (source_roi.mean(axis=-1) > 175) & ((source_roi.max(axis=-1).astype(np.int16) - source_roi.min(axis=-1)) < 55)
        values = alpha_roi[pale]
        pale_rois[name] = {'sourcePalePixelCount': int(len(values)),
                           'minAlpha': int(values.min()) if len(values) else 0,
                           'opaqueFraction': float(np.mean(values >= 250)) if len(values) else 0}
    torso_holes = 0
    for row in alpha[700:]:
        # Ignore fractional Lanczos ringing beyond the actual outer sleeve.
        # Test zeros INSIDE the two opaque silhouette boundaries, not outside
        # them between faint alpha=1 resampling specks and the real garment.
        xs = np.flatnonzero(row >= 250)
        if len(xs):
            torso_holes += int(np.sum(row[xs[0]:xs[-1] + 1] == 0))
    return {'auditedFabricPatchMinAlpha': sample_result,
            'allAuditedFabricPatchesOpaque': all(value == 255 for value in sample_result.values()),
            'sourcePaleClothingRois': pale_rois,
            'allSourcePaleClothingOpaque': all(item['opaqueFraction'] == 1 for item in pale_rois.values()),
            'internalTorsoTransparentPixels': torso_holes}


def matte_frame_pillow(source_index, preview=False):
    """Dependency-light equivalent with a connected, hole-free bust silhouette.

    Same border-color key, but fill the connected subject per scanline so its
    pale knitted garment is never punched full of background-colored holes.
    Partial-alpha/color cleanup is restricted to the OUTER hair boundary.
    """
    image = Image.open(WORK / 'source-frames' / f'frame-{source_index:04d}.png').convert('RGB')
    rgb = np.asarray(image)
    backdrop = background_model(rgb)
    distance = np.linalg.norm(rgb.astype(np.float32) - backdrop, axis=-1)
    key = Image.fromarray((distance < 13).astype(np.uint8) * 255).copy()
    ImageDraw.floodfill(key, (0, 0), 128)
    # There is only one connected backdrop; make sure both top corners seed it.
    if key.getpixel((image.width - 1, 0)) == 255:
        ImageDraw.floodfill(key, (image.width - 1, 0), 128)
    subject_candidate = Image.fromarray((np.asarray(key) != 128).astype(np.uint8) * 255).filter(ImageFilter.MedianFilter(5)).copy()
    ImageDraw.floodfill(subject_candidate, (image.width // 2, image.height // 2), 128)
    connected = np.asarray(subject_candidate) == 128
    silhouette = np.zeros(connected.shape, np.uint8)
    for y, row in enumerate(connected):
        xs = np.flatnonzero(row)
        if len(xs):
            silhouette[y, xs[0]:xs[-1] + 1] = 255
    mask = Image.fromarray(silhouette)
    alpha = np.asarray(mask.filter(ImageFilter.GaussianBlur(.55))).astype(np.float32) / 255
    inner = np.asarray(mask.filter(ImageFilter.MinFilter(17))) > 0
    y = np.arange(image.height)[:, None]
    hair_boundary = (~inner) & (y < image.height * .69)
    # Estimate fractional hair coverage against its measured backdrop. This
    # cannot affect any white/gray clothing, face, lenses, or opaque interior.
    luminance_difference = backdrop.mean(axis=-1) - rgb.mean(axis=-1)
    coverage = np.clip(luminance_difference / 82, 0, 1)
    coverage = coverage * coverage * (3 - 2 * coverage)
    alpha = np.where(hair_boundary, alpha * coverage, alpha)
    clean = (rgb.astype(np.float32) - backdrop * (1 - alpha[..., None])) / np.maximum(alpha[..., None], .06)
    clean = np.where((alpha > .008)[..., None], np.clip(clean, 0, 255), 0)
    output = Image.fromarray(np.dstack((clean.astype(np.uint8), np.round(alpha * 255).astype(np.uint8))), 'RGBA')
    if preview:
        output.save(WORK / f'matte-frame-{source_index:04d}.webp', lossless=True)
        checker = Image.new('RGB', image.size, '#202027')
        checker.paste(output, mask=output.getchannel('A'))
        checker.save(WORK / f'matte-preview-{source_index:04d}.jpg', quality=95)
    return output


def build_assets():
    config = write_config()
    tile_size = (config['frameWidth'], config['frameHeight'])
    atlas = Image.new('RGBA', (tile_size[0] * config['columns'], tile_size[1] * config['rows']))
    checks = []
    selected = {}
    for atlas_index, source_index in enumerate(config['sourceFrames']):
        rgba = matte_frame_pillow(source_index)
        rgb = np.asarray(Image.open(WORK / 'source-frames' / f'frame-{source_index:04d}.png').convert('RGB'))
        alpha = np.asarray(rgba.getchannel('A'))
        checks.append({'atlasIndex': atlas_index, 'sourceFrame': source_index,
                       'transparentPixels': int(np.sum(alpha == 0)),
                       'topCornersTransparent': bool(alpha[0, 0] == 0 and alpha[0, -1] == 0),
                       **alpha_evidence(rgba, rgb)})
        tile = rgba.resize(tile_size, Image.Resampling.LANCZOS)
        atlas.paste(tile, ((atlas_index % config['columns']) * tile_size[0], (atlas_index // config['columns']) * tile_size[1]))
        selected[source_index] = tile
        tile.save(WORK / f'selected-source-{source_index:04d}.webp', quality=88, method=6, exact=True)
        if atlas_index == config['frontFrame']:
            tile.save(OUT / 'frame_front.webp', quality=88, method=6, exact=True)
        print(f'Prepared atlas {atlas_index + 1}/{config["frameCount"]}, source frame {source_index}', flush=True)
    atlas.save(OUT / 'sprite.webp', quality=84, method=6, exact=True)
    directions = [('UP', 72), ('RIGHT', 28), ('DOWN', 136), ('LEFT', 100),
                  ('UP LEFT', 88), ('DOWN LEFT', 116), ('CENTER / FRONT', 0), ('UP RIGHT', 52)]
    size, label_h, cols = 320, 44, 4
    dark = Image.new('RGB', (cols * size, 2 * (size + label_h)), '#18181e')
    checker = dark.copy()
    for index, (label, source_index) in enumerate(directions):
        tile = selected[source_index].resize((size, size), Image.Resampling.LANCZOS)
        x, y = (index % cols) * size, (index // cols) * (size + label_h)
        dark.paste(tile, (x, y), tile.getchannel('A'))
        for yy in range(y, y + size, 20):
            for xx in range(x, x + size, 20):
                color = '#77777d' if ((xx - x) // 20 + (yy - y) // 20) % 2 else '#aeafb5'
                ImageDraw.Draw(checker).rectangle((xx, yy, xx + 19, yy + 19), fill=color)
        checker.paste(tile, (x, y), tile.getchannel('A'))
        for sheet in (dark, checker):
            ImageDraw.Draw(sheet).text((x + 10, y + size + 9), f'{label}  /  SOURCE {source_index}', font=font(16), fill='white')
    dark.save(WORK / 'calibrated-directions-dark.jpg', quality=95, subsampling=0)
    checker.save(WORK / 'calibrated-directions-checker.jpg', quality=95, subsampling=0)
    qa = {'sourceUntouched': True, 'atlasWidth': atlas.width, 'atlasHeight': atlas.height,
          'frameWidth': tile_size[0], 'frameHeight': tile_size[1], 'frames': checks,
          'spriteBytes': (OUT / 'sprite.webp').stat().st_size,
          'frontBytes': (OUT / 'frame_front.webp').stat().st_size,
          'allTopCornersTransparent': all(item['topCornersTransparent'] for item in checks),
          'allSourcePaleClothingOpaque': all(item['allSourcePaleClothingOpaque'] for item in checks),
          'allAuditedFabricPatchesOpaque': all(item['allAuditedFabricPatchesOpaque'] for item in checks),
          'totalInternalTorsoTransparentPixels': sum(item['internalTorsoTransparentPixels'] for item in checks)}
    (WORK / 'alpha-qa.json').write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in qa.items() if key != 'frames'}, ensure_ascii=False, indent=2), flush=True)
    assert qa['allTopCornersTransparent'], 'A source background corner remains opaque.'
    assert qa['allSourcePaleClothingOpaque'], 'Independent source pale-fabric ROI lost opacity.'
    assert qa['allAuditedFabricPatchesOpaque'], 'An audited fabric patch lost opacity.'
    assert qa['totalInternalTorsoTransparentPixels'] == 0, 'An internal garment hole was detected.'


def validate_assets():
    """Validate DECODED final WebP alpha against independent source fabric ROIs."""
    config = calibrated_config()
    atlas = Image.open(OUT / 'sprite.webp').convert('RGBA')
    checks = []
    for atlas_index, source_index in enumerate(config['sourceFrames']):
        x, y = atlas_index % config['columns'] * config['frameWidth'], atlas_index // config['columns'] * config['frameHeight']
        tile = atlas.crop((x, y, x + config['frameWidth'], y + config['frameHeight']))
        rgba = tile.resize(FRAME_SIZE, Image.Resampling.NEAREST)
        rgb = np.asarray(Image.open(WORK / 'source-frames' / f'frame-{source_index:04d}.png').convert('RGB'))
        alpha = np.asarray(rgba.getchannel('A'))
        checks.append({'atlasIndex': atlas_index, 'sourceFrame': source_index,
                       'transparentPixels': int(np.sum(alpha == 0)),
                       'topCornersTransparent': bool(alpha[0, 0] == 0 and alpha[0, -1] == 0),
                       **alpha_evidence(rgba, rgb)})
    qa = {'testedArtifact': 'decoded final public/portrait-turn/sprite.webp',
          'analysisCoordinateSize': list(FRAME_SIZE),
          'analysisNote': 'Decoded 448px tiles are nearest-neighbor resized to original 960px source coordinates for independent fabric ROI checks and pixel counts.',
          'atlasWidth': atlas.width, 'atlasHeight': atlas.height,
          'frameWidth': config['frameWidth'], 'frameHeight': config['frameHeight'],
          'frames': checks, 'spriteBytes': (OUT / 'sprite.webp').stat().st_size,
          'frontBytes': (OUT / 'frame_front.webp').stat().st_size,
          'allTopCornersTransparent': all(item['topCornersTransparent'] for item in checks),
          'allSourcePaleClothingOpaque': all(item['allSourcePaleClothingOpaque'] for item in checks),
          'allAuditedFabricPatchesOpaque': all(item['allAuditedFabricPatchesOpaque'] for item in checks),
          'totalInternalTorsoTransparentPixels': sum(item['internalTorsoTransparentPixels'] for item in checks)}
    (WORK / 'alpha-qa.json').write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in qa.items() if key != 'frames'}, ensure_ascii=False, indent=2), flush=True)
    assert qa['allTopCornersTransparent'], 'Decoded sprite has an opaque background corner.'
    assert qa['allSourcePaleClothingOpaque'], 'Decoded sprite lost pale/gray fabric opacity.'
    assert qa['allAuditedFabricPatchesOpaque'], 'Decoded sprite lost an audited fabric patch.'
    assert qa['totalInternalTorsoTransparentPixels'] == 0, 'Decoded sprite has a garment hole.'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--matte-preview', type=int)
    parser.add_argument('--config-only', action='store_true')
    parser.add_argument('--pillow-preview', type=int)
    parser.add_argument('--build', action='store_true')
    parser.add_argument('--validate', action='store_true')
    args = parser.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    if args.validate:
        validate_assets()
    elif args.build:
        build_assets()
        validate_assets()
    elif args.pillow_preview is not None:
        matte_frame_pillow(args.pillow_preview, preview=True)
    elif args.config_only:
        print(json.dumps(write_config(), ensure_ascii=False, indent=2))
    elif args.matte_preview is not None:
        matte_frame(args.matte_preview, preview=True)
    else:
        inspect(args.source)


if __name__ == '__main__':
    main()

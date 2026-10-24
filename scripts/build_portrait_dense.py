"""Dense, real photographed frames; no face warping or blended double images."""
from __future__ import annotations
import concurrent.futures
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import build_portrait_sprite as original

OUT = original.OUT
WORK = original.WORK
CACHE = WORK / 'dense-frames'
SIDE = 320
SOURCES = list(range(193))


def prepare(source_index):
    target = CACHE / f'frame-{source_index:04d}.png'
    report_path = CACHE / f'frame-{source_index:04d}.json'
    if target.exists() and report_path.exists():
        return source_index, json.loads(report_path.read_text(encoding='utf-8'))
    rgba = original.matte_frame_pillow(source_index)
    rgb = np.asarray(Image.open(WORK / 'source-frames' / f'frame-{source_index:04d}.png').convert('RGB'))
    alpha = np.asarray(rgba.getchannel('A'))
    evidence = {'sourceFrame': source_index,
                'topCornersTransparent': bool(alpha[0, 0] == 0 and alpha[0, -1] == 0),
                **original.alpha_evidence(rgba, rgb)}
    rgba.resize((SIDE, SIDE), Image.Resampling.LANCZOS).save(target, compress_level=1)
    report_path.write_text(json.dumps(evidence, indent=2), encoding='utf-8')
    return source_index, evidence


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    checks = []
    with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
        for count, (source_index, evidence) in enumerate(pool.map(prepare, SOURCES), 1):
            checks.append(evidence)
            print(f'Dense tile {count}/{len(SOURCES)} source {source_index}', flush=True)
    config = original.calibrated_config()
    config.update({'version': 2, 'frameWidth': SIDE, 'frameHeight': SIDE,
                   'columns': 14, 'rows': 14, 'frameCount': len(SOURCES),
                   'sourceFrames': SOURCES, 'frontFrame': 0, 'returnFrontFrame': 192,
                   'animationMethod': 'real consecutive source frames 0..192; uniform source crop; no face warp, no crossfade',
                   'stabilization': 'uniform 960x960 source crop, no per-frame scale or face alignment'})
    for key in config['angleKeys']:
        key['frame'] = SOURCES.index(key['sourceFrame'])
    atlas = Image.new('RGBA', (SIDE * config['columns'], SIDE * config['rows']))
    for index, source_index in enumerate(SOURCES):
        tile = Image.open(CACHE / f'frame-{source_index:04d}.png').convert('RGBA')
        atlas.paste(tile, ((index % config['columns']) * SIDE, (index // config['columns']) * SIDE))
        if source_index == 0:
            tile.save(OUT / 'frame_front.webp', quality=88, method=6, exact=True)
    next_atlas = OUT / 'sprite-next.webp'
    atlas.save(next_atlas, quality=84, method=6, exact=True)
    next_atlas.replace(OUT / 'sprite.webp')
    (OUT / 'calibration.json').write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding='utf-8')
    qa = {'frameCount': len(SOURCES), 'atlasSize': list(atlas.size),
          'spriteBytes': (OUT / 'sprite.webp').stat().st_size,
          'allCornersTransparent': all(row['topCornersTransparent'] for row in checks),
          'allPaleClothesPreserved': all(row['allSourcePaleClothingOpaque'] for row in checks),
          'allFabricPatchesPreserved': all(row['allAuditedFabricPatchesOpaque'] for row in checks),
          'internalTorsoHoles': sum(row['internalTorsoTransparentPixels'] for row in checks),
          'frames': checks}
    (WORK / 'dense-alpha-qa.json').write_text(json.dumps(qa, indent=2), encoding='utf-8')
    print(json.dumps({key: value for key, value in qa.items() if key != 'frames'}, indent=2), flush=True)
    assert qa['allCornersTransparent'] and qa['allPaleClothesPreserved'] and qa['allFabricPatchesPreserved']
    assert qa['internalTorsoHoles'] == 0
    # A complete proof sheet contains actual frames, composited onto a dark site-like background.
    sample = [0, 14, 28, 40, 52, 60, 72, 80, 88, 100, 108, 116, 124, 136, 140]
    sheet = Image.new('RGB', (5 * 240, 3 * 268), '#17171b')
    draw = ImageDraw.Draw(sheet)
    for n, source_index in enumerate(sample):
        tile = Image.open(CACHE / f'frame-{source_index:04d}.png').resize((240, 240), Image.Resampling.LANCZOS)
        x, y = (n % 5) * 240, (n // 5) * 268
        sheet.paste(tile, (x, y), tile.getchannel('A'))
        draw.text((x + 8, y + 244), f'SOURCE {source_index:03d}', fill='white', font=original.font(15))
    sheet.save(WORK / 'dense-portrait-proof.jpg', quality=94)


if __name__ == '__main__':
    main()

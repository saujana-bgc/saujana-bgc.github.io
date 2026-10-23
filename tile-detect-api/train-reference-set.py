"""Train a lightweight second tile-set classifier from a 37-face reference sheet.

The exported ONNX model keeps the detector's existing image/logits contract.
It is a nearest-prototype classifier: each face is represented by an augmented
mean crop, while the production MobileNet remains the default for other sets.
"""
from __future__ import annotations

import argparse
import json
from io import BytesIO
from pathlib import Path

import cairosvg
import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper
from PIL import Image, ImageEnhance, ImageFilter

CLASSES = [
    'Chun', 'Haku', 'Hatsu', 'Man1', 'Man2', 'Man3', 'Man4', 'Man5',
    'Man5-Dora', 'Man6', 'Man7', 'Man8', 'Man9', 'Nan', 'Pei', 'Pin1',
    'Pin2', 'Pin3', 'Pin4', 'Pin5', 'Pin5-Dora', 'Pin6', 'Pin7', 'Pin8',
    'Pin9', 'Shaa', 'Sou1', 'Sou2', 'Sou3', 'Sou4', 'Sou5', 'Sou5-Dora',
    'Sou6', 'Sou7', 'Sou8', 'Sou9', 'Ton',
]
SOURCE_LABELS = [
    *[f'{i}m' for i in range(1, 10)], '5mr',
    *[f'{i}p' for i in range(1, 10)], '5pr',
    *[f'{i}s' for i in range(1, 10)], '5sr',
    '1z', '2z', '3z', '4z', '5z', '6z', '7z',
]
CLASS_FOR_LABEL = {
    **{f'{i}m': f'Man{i}' for i in range(1, 10)}, '5mr': 'Man5-Dora',
    **{f'{i}p': f'Pin{i}' for i in range(1, 10)}, '5pr': 'Pin5-Dora',
    **{f'{i}s': f'Sou{i}' for i in range(1, 10)}, '5sr': 'Sou5-Dora',
    '1z': 'Ton', '2z': 'Nan', '3z': 'Shaa', '4z': 'Pei',
    '5z': 'Haku', '6z': 'Hatsu', '7z': 'Chun',
}
COLUMN_CENTERS = [250, 585, 920, 1255, 1590, 1925, 2260, 2595, 2930, 3240]
ROW_CENTERS = [320, 775, 1230, 1690]
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)[:, None, None]
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)[:, None, None]


def vector(image: Image.Image) -> np.ndarray:
    pixels = np.asarray(image.resize((160, 160), Image.Resampling.BILINEAR).convert('RGB'), dtype=np.float32) / 255
    return ((pixels.transpose(2, 0, 1) - MEAN) / STD).reshape(-1)


def augmented_tile(sheet: Image.Image, x: int, y: int, seed: int, width: int = 290, height: int = 410) -> np.ndarray:
    rng = np.random.default_rng(seed)
    jitter_x, jitter_y = rng.integers(-10, 11, size=2)
    tile = sheet.crop((x - width // 2 + jitter_x, y - height // 2 + jitter_y, x + width // 2 + jitter_x, y + height // 2 + jitter_y))
    tile = ImageEnhance.Brightness(tile).enhance(float(rng.uniform(0.78, 1.2)))
    tile = ImageEnhance.Contrast(tile).enhance(float(rng.uniform(0.8, 1.2)))
    if rng.random() < 0.35:
        tile = tile.filter(ImageFilter.GaussianBlur(float(rng.uniform(0.0, 0.7))))
    return vector(tile)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--straight-view', type=Path, help='A straight, top-to-bottom full-set view in the same confirmed order')
    parser.add_argument('--output', type=Path, default=Path('tile-model-combined.onnx'))
    parser.add_argument('--metadata', type=Path, default=Path('tile-model-set-b.json'))
    args = parser.parse_args()

    sheet = Image.open(args.source)
    sheets: list[tuple[Image.Image, list[tuple[int, int]], int, int]] = [
        (sheet, [(COLUMN_CENTERS[index % 10], ROW_CENTERS[index // 10]) if index < 30 else (COLUMN_CENTERS[index - 30], ROW_CENTERS[3]) for index in range(37)], 290, 410),
    ]
    if args.straight_view:
        straight = Image.open(args.straight_view)
        man = [(553, 226 + 65 * index) for index in range(10)]
        pin = [(421, 233 + 65 * index) for index in range(10)]
        sou = [(280, 238 + 65 * index) for index in range(10)]
        honors = [(137, 332 + 65 * index) for index in range(7)]
        sheets.append((straight, man + pin + sou + honors, 64, 88))
    physical_prototypes: dict[str, np.ndarray] = {}
    svg_prototypes: dict[str, tuple[np.ndarray, np.ndarray]] = {}
    training_scores: list[float] = []
    for index, label in enumerate(SOURCE_LABELS):
        samples = np.concatenate([
            np.stack([augmented_tile(view, points[index][0], points[index][1], index * 1000 + view_index * 100 + n, width, height) for n in range(40)])
            for view_index, (view, points, width, height) in enumerate(sheets)
        ])
        prototype = samples.mean(axis=0)
        physical_prototypes[CLASS_FOR_LABEL[label]] = prototype
        svg_path = Path(__file__).parent.parent / 'public' / 'tiles' / f'{CLASS_FOR_LABEL[label]}.svg'
        # Match the current detector's artwork regression exactly: the SVG is
        # placed on a cream portrait tile, photographed sideways in a strip,
        # then the detector tries both upright rotations.
        art = Image.open(BytesIO(cairosvg.svg2png(url=str(svg_path), output_width=64, output_height=94))).convert('RGBA')
        portrait = Image.new('RGB', (80, 120), '#eee5c8')
        portrait.paste(art, ((80 - art.width) // 2, (120 - art.height) // 2), art)
        svg_prototypes[CLASS_FOR_LABEL[label]] = (vector(portrait), vector(portrait.rotate(180)))
        # Same unnormalised class score emitted by the ONNX Gemm node below.
        training_scores.extend(((2 * samples * prototype).sum(axis=1) - np.square(prototype).sum()).tolist())

    # Keep both visual styles as separate prototypes, then take the best match
    # per class inside one ONNX graph. This is one combined model, not a router.
    ordered = np.stack([
        prototype
        for name in CLASSES
        for prototype in (physical_prototypes[name], physical_prototypes[name], *svg_prototypes[name])
    ])
    # -||x-c||² = 2x·c - ||c||² - ||x||²; the final term is shared by every
    # class, so it is unnecessary for selecting the highest logit.
    weights = (2 * ordered).T.astype(np.float32)
    bias = (-np.square(ordered).sum(axis=1)).astype(np.float32)
    dimensions = weights.shape[0]
    graph = helper.make_graph(
        [
            helper.make_node('Flatten', ['image'], ['flat'], axis=1),
            helper.make_node('Gemm', ['flat', 'weights', 'bias'], ['style_logits']),
            helper.make_node('Reshape', ['style_logits', 'shape'], ['grouped_logits']),
            helper.make_node('ReduceMax', ['grouped_logits'], ['logits'], axes=[2], keepdims=0),
        ],
        'riichi-set-b-prototypes',
        [helper.make_tensor_value_info('image', TensorProto.FLOAT, ['batch', 3, 160, 160])],
        [helper.make_tensor_value_info('logits', TensorProto.FLOAT, ['batch', len(CLASSES)])],
        [numpy_helper.from_array(weights, 'weights'), numpy_helper.from_array(bias, 'bias'), numpy_helper.from_array(np.array([-1, len(CLASSES), 4], dtype=np.int64), 'shape')],
    )
    model = helper.make_model(graph, producer_name='saujana-bgc', opset_imports=[helper.make_opsetid('', 11)])
    model.ir_version = 8
    onnx.save(model, args.output)
    scores = np.array(training_scores)
    # Scores above this lower-tail value are close enough to use the new-set
    # model. Keeping this strict prevents the reference prototypes from
    # stealing scans from the original artwork classifier.
    threshold = float(np.quantile(scores, 0.02))
    args.metadata.write_text(json.dumps({'matchThreshold': threshold, 'classes': CLASSES}, indent=2))
    print(f'Wrote {args.output} and {args.metadata}; match threshold {threshold:.0f}; features {dimensions}')


if __name__ == '__main__':
    main()

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
OUT = HERE / "cut"
PAD = 4
ALPHA_MIN = 24
BIG_COMPONENT_AREA = 2000

BACKGROUND_NAMES = [
    "classroom", "schoolyard-forest", "magic-library",
    "lab", "observatory", "campus",
    "office", "lecture-hall", "ai-crystal-lab",
    "forest-battle", "crystal-cave", "sky-altar",
]
ENEMY_NAMES = [
    "leaf-slime", "acorn-guardian", "flying-grimoire", "staff-owl",
    "thunder-bat", "lab-robot", "crystal-turtle", "stone-golem",
    "data-fox", "gear-beetle", "ink-spirit", "clock-tower-keeper",
    "blue-dragonet", "amethyst-golem", "sky-kirin", "star-dragon-sage",
]
UI_NAMES = [
    "frame-wood", "frame-stone", "frame-metal", "frame-crystal",
    "emblem-book", "emblem-owl", "emblem-graduation", "emblem-dragon",
    "fx-slash", "fx-hit", "fx-shield", "fx-magic-circle",
    "chest", "emerald", "trophy-book", "reward-star",
]


def cut_backgrounds():
    atlas = Image.open(HERE / "rpg-background-atlas-v1.png").convert("RGB")
    tile_w, tile_h = atlas.width // 3, atlas.height // 4
    entries = []
    for i, name in enumerate(BACKGROUND_NAMES):
        r, c = divmod(i, 3)
        box = (c * tile_w, r * tile_h, (c + 1) * tile_w, (r + 1) * tile_h)
        path = OUT / "backgrounds" / f"{name}.png"
        atlas.crop(box).save(path)
        entries.append({"name": name, "file": f"backgrounds/{name}.png",
                        "atlas_box": list(box), "size": [tile_w, tile_h]})
    return entries


def cut_sprites(atlas_name, names, folder):
    atlas = Image.open(HERE / atlas_name).convert("RGBA")
    rgba = np.array(atlas)
    alpha = rgba[:, :, 3]
    labels, count = ndimage.label(alpha >= ALPHA_MIN)
    areas = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
    cell_w, cell_h = atlas.width / 4, atlas.height / 4

    owner = np.full(count + 1, -1, dtype=int)
    centers = ndimage.center_of_mass(np.ones_like(labels), labels, range(1, count + 1))
    for idx, (cy, cx) in enumerate(centers, start=1):
        r = min(3, int(cy // cell_h))
        c = min(3, int(cx // cell_w))
        owner[idx] = r * 4 + c

    big_per_cell = {}
    for idx in range(1, count + 1):
        if areas[idx - 1] >= BIG_COMPONENT_AREA:
            big_per_cell.setdefault(owner[idx], []).append(idx)
    missing = [i for i in range(16) if i not in big_per_cell]
    if missing:
        raise SystemExit(f"{atlas_name}: no main component in cells {missing}")

    entries = []
    for i, name in enumerate(names):
        keep = np.isin(labels, [k for k in range(1, count + 1) if owner[k] == i])
        ys, xs = np.where(keep)
        y0, y1 = max(0, ys.min() - PAD), min(atlas.height, ys.max() + 1 + PAD)
        x0, x1 = max(0, xs.min() - PAD), min(atlas.width, xs.max() + 1 + PAD)
        soft = ndimage.binary_dilation(keep, iterations=6)
        sprite = rgba.copy()
        sprite[~soft, 3] = 0
        crop = Image.fromarray(sprite[y0:y1, x0:x1])
        crop.save(OUT / folder / f"{name}.png")
        entries.append({
            "name": name, "file": f"{folder}/{name}.png",
            "atlas_box": [int(x0), int(y0), int(x1), int(y1)],
            "size": [int(x1 - x0), int(y1 - y0)],
            "anchor_bottom_center": [int((x1 - x0) // 2), int(y1 - y0)],
        })
    return entries


def main():
    for sub in ("backgrounds", "enemies", "ui"):
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    manifest = {
        "source": "rpg-expansion-v1",
        "backgrounds": cut_backgrounds(),
        "enemies": cut_sprites("rpg-enemies-atlas-v1.png", ENEMY_NAMES, "enemies"),
        "ui": cut_sprites("rpg-ui-effects-atlas-v1.png", UI_NAMES, "ui"),
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    for group in ("backgrounds", "enemies", "ui"):
        print(group, len(manifest[group]))
        for e in manifest[group]:
            print("  ", e["name"], e["size"])


if __name__ == "__main__":
    main()

"""Argus guided regional extraction core. See README for usage and limitations.

Generated from the tested canonical implementation; original code is MIT.
Photographs and their derivatives retain their own source licenses.
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_closing, binary_dilation, binary_erosion, gaussian_filter, gaussian_filter1d, label, map_coordinates
from scipy.signal import find_peaks

def homography(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
    rows = []
    for (x, y), (u, v) in zip(src, dst):
        rows.extend([[x, y, 1, 0, 0, 0, -u*x, -u*y],
                     [0, 0, 0, x, y, 1, -v*x, -v*y]])
    h = np.linalg.solve(np.asarray(rows, float), dst.reshape(8))
    return np.r_[h, 1].reshape(3, 3)

def project(h: np.ndarray, x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    p = h @ np.stack((x.ravel(), y.ravel(), np.ones(x.size)))
    return (p[0] / p[2]).reshape(x.shape), (p[1] / p[2]).reshape(y.shape)

def close_seams(rgb: np.ndarray, band: int | None = None) -> np.ndarray:
    """Pair opposite borders, then feather into untouched interior."""
    x = rgb.astype(np.float32).copy()
    h, w = x.shape[:2]
    band = min(band or max(4, min(h, w) // 12), h // 4, w // 4)
    for i in range(band):
        t = i / max(band - 1, 1)
        both = (x[:, i].copy() + x[:, -i-1].copy()) / 2
        x[:, i] = (1-t) * both + t * x[:, i]
        x[:, -i-1] = (1-t) * both + t * x[:, -i-1]
    for i in range(band):
        t = i / max(band - 1, 1)
        both = (x[i].copy() + x[-i-1].copy()) / 2
        x[i] = (1-t) * both + t * x[i]
        x[-i-1] = (1-t) * both + t * x[-i-1]
    return np.uint8(np.clip(np.rint(x), 0, 255))

def srgb_to_linear(rgb: np.ndarray) -> np.ndarray:
    value = np.asarray(rgb, dtype=np.float32) / 255
    return np.where(value <= .04045, value / 12.92, ((value + .055) / 1.055) ** 2.4)

def linear_to_srgb(rgb: np.ndarray) -> np.ndarray:
    value = np.clip(rgb, 0, 1)
    return np.where(value <= .0031308, value * 12.92, 1.055 * value ** (1 / 2.4) - .055)

def polygon_mask(size: tuple[int, int], polygons: list) -> np.ndarray:
    image = Image.new("L", size)
    draw = ImageDraw.Draw(image)
    for polygon in polygons:
        draw.polygon([tuple(p) for p in polygon], fill=255)
    return np.asarray(image) > 0

def rectify(rgb: np.ndarray, region: dict, reference_size: list) -> tuple:
    w, h = region["uv_size"]
    square = np.array([[0, 0], [w-1, 0], [w-1, h-1], [0, h-1]], float)
    matrix = homography(square, np.asarray(region["plane_quad"], float))
    yy, xx = np.mgrid[:h, :w]
    sx, sy = project(matrix, xx, yy)
    source_x = sx * (rgb.shape[1]-1) / (reference_size[0]-1)
    source_y = sy * (rgb.shape[0]-1) / (reference_size[1]-1)
    uv = np.stack([map_coordinates(rgb[..., c].astype(float), [source_y, source_x],
                                   order=1, mode="nearest") for c in range(3)], axis=-1)
    def warp(polygons):
        raw = polygon_mask(tuple(reference_size), polygons)
        return map_coordinates(raw.astype(float), [sy, sx], order=0, mode="constant") > .5
    valid = (source_x >= 0) & (source_x < rgb.shape[1]-1) & (source_y >= 0) & (source_y < rgb.shape[0]-1)
    return np.uint8(np.rint(uv)), warp(region["seeds"]), warp(region["exclude"]), valid, matrix

def classify_owner(rgb: np.ndarray, seeds: np.ndarray, excluded: np.ndarray,
                   valid: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Illumination-tolerant chromaticity classifier anchored to sample islands."""
    eligible = binary_erosion(valid, iterations=2) & ~binary_dilation(excluded, iterations=2)
    examples = seeds & eligible
    if examples.sum() < 12:
        raise ValueError("Material needs at least twelve supported seed pixels")
    log = np.log(np.maximum(gaussian_filter(rgb.astype(float), (.7, .7, 0)), 3))
    chroma = log - log.mean(axis=2, keepdims=True)
    center = np.median(chroma[examples], axis=0)
    mad = np.maximum(np.median(np.abs(chroma[examples]-center), axis=0)*1.4826, .025)
    distance = np.mean(((chroma-center)/mad)**2, axis=2)
    luminance = rgb.astype(float).mean(axis=2)
    floor = max(8, float(np.percentile(luminance[examples], 5))*.22)
    owner = eligible & (distance <= 12) & (luminance > floor)
    owner = binary_closing(owner, iterations=1) & eligible
    components, _ = label(owner)
    supported = np.unique(components[examples & owner]); supported = supported[supported != 0]
    owner &= np.isin(components, supported)
    confidence = np.exp(-distance/12) * eligible
    if owner.sum() < 128:
        raise ValueError("Insufficient connected material support")
    return owner, confidence

def neutralize(rgb: np.ndarray, owner: np.ndarray) -> tuple[np.ndarray, np.ndarray, dict]:
    """Fit only broad scalar illumination, using material-owned pixels alone.

    A scalar gain preserves chromaticity. The field cannot absorb nearby
    windows, signs or other materials because they have zero fitting weight.
    """
    linear = srgb_to_linear(rgb)
    luminance = np.maximum(linear @ [.2126, .7152, .0722], .002)
    sigma = (max(10, rgb.shape[0]*.17), max(10, rgb.shape[1]*.17))
    weight = gaussian_filter(owner.astype(float), sigma)
    field = gaussian_filter(np.log(luminance)*owner, sigma)/np.maximum(weight, 1e-8)
    target = float(np.percentile(field[owner], 60))
    gain = np.clip(np.exp(target-field), .4, 3)
    corrected = linear*gain[..., None]
    base = np.uint8(np.rint(linear_to_srgb(np.clip(corrected, 0, 1))*255))
    stats = {"gain_p05_p95": np.percentile(gain[owner], [5, 95]).round(4).tolist(),
             "clipped_owned_fraction": round(float((corrected[owner] > 1).any(axis=1).mean()), 6),
             "fitted_log_illumination_std": round(float(field[owner].std()), 6),
             "method": "masked broad log-luminance field; scalar gain; material color ratios retained",
             "qualification": "single-image illumination estimate, not measured albedo"}
    return base, gain, stats

def board_profile(rgb: np.ndarray, owner: np.ndarray) -> tuple[int | None, list[int]]:
    gray = rgb.astype(float).mean(axis=2)/255
    rows = np.array([np.median(row[mask]) if mask.any() else np.nan
                     for row, mask in zip(gray, owner)])
    known = np.flatnonzero(np.isfinite(rows))
    rows = np.interp(np.arange(len(rows)), known, rows[known])
    detail = gaussian_filter1d(rows, .8)-gaussian_filter1d(rows, 18)
    peaks, _ = find_peaks(-detail, distance=12, prominence=max(.006, detail.std()*.5))
    if len(peaks) < 4:
        return None, peaks.tolist()
    differences = np.diff(peaks)
    pitch = int(round(float(np.median(differences))))
    if pitch < 12 or pitch > len(rows)//4:
        return None, peaks.tolist()
    return pitch, peaks.tolist()

def valid_donors(owner: np.ndarray, height: int, width: int) -> np.ndarray:
    """Top-left coordinates whose complete donor rectangle has ownership."""
    if height > owner.shape[0] or width > owner.shape[1]:
        return np.empty((0, 2), int)
    integral = np.pad(owner.astype(np.int64), ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    sums = integral[height:, width:] - integral[:-height, width:] - integral[height:, :-width] + integral[:-height, :-width]
    return np.argwhere(sums == height*width)

def make_repeat(base: np.ndarray, owner: np.ndarray, pattern: str, seed: int = 7) -> tuple:
    rng = np.random.default_rng(seed)
    pitch, seams = board_profile(base, owner) if pattern == "horizontal_boards" else (None, [])
    ph = 2*pitch if pitch else min(64, min(owner.shape)//2)
    pw = min(128 if pitch else 64, owner.shape[1]//2)
    donors = valid_donors(owner, ph, pw)
    while len(donors) < 20 and min(ph, pw) > 12:
        if pitch and pw > 24:
            pw //= 2
        else:
            ph = max(12, ph//2); pw = max(12, pw//2); pitch = None
        donors = valid_donors(owner, ph, pw)
    if not len(donors):
        raise ValueError("No uncontaminated material patch; no outside material will be filled in")
    if pitch:
        aligned = donors[np.isin(donors[:, 0], seams)]
        if len(aligned) >= 8:
            donors = aligned
        else:
            pitch = None
    oh, ow = (pitch*max(4, min(10, 512//pitch)), 512) if pitch else (384, 384)
    overlap_y = pitch if pitch else max(4, ph//4)
    overlap_x = max(4, pw//4)
    ys = list(range(0, oh-ph+1, ph-overlap_y)); xs = list(range(0, ow-pw+1, pw-overlap_x))
    if not ys: ys = [0]
    if not xs: xs = [0]
    if ys[-1] != oh-ph: ys.append(oh-ph)
    if xs[-1] != ow-pw: xs.append(ow-pw)
    canvas = np.zeros((oh, ow, 3), float); occupied = np.zeros((oh, ow), bool); used = []
    for y in ys:
        for x in xs:
            old = canvas[y:y+ph, x:x+pw]; support = occupied[y:y+ph, x:x+pw]
            candidates = donors[rng.integers(0, len(donors), size=24)]
            scores = []
            for sy, sx in candidates:
                patch = base[sy:sy+ph, sx:sx+pw].astype(float)
                scores.append(float(np.square(old[support]-patch[support]).mean()) if support.any() else 0)
            choice = np.argsort(scores)[int(rng.integers(0, 3))]
            sy, sx = candidates[choice]; patch = base[sy:sy+ph, sx:sx+pw]
            alpha = np.ones((ph, pw))
            if x: alpha[:, :overlap_x] *= np.linspace(0, 1, overlap_x)[None, :]
            if y: alpha[:overlap_y] *= np.linspace(0, 1, overlap_y)[:, None]
            alpha = np.where(support, alpha, 1)
            old[:] = old*(1-alpha[..., None])+patch*alpha[..., None]
            occupied[y:y+ph, x:x+pw] = True
            used.append({"source_uv_xywh": [int(sx), int(sy), pw, ph], "output_xy": [x, y]})
    tile = close_seams(np.uint8(np.clip(np.rint(canvas), 0, 255)))
    return tile, {"seed": seed, "patch_size_wh": [pw, ph], "eligible_donors": len(donors),
                  "selected_donors": used, "all_donors_fully_owned": True,
                  "board_pitch_uv_pixels": pitch, "detected_seam_rows": seams,
                  "method": "board-phase-aligned quilting" if pitch else "masked overlap-ranked quilting",
                  "rotation": 0, "mirror": False,
                  "seam_rgb_mae_255": float((np.abs(tile[:, 0].astype(float)-tile[:, -1]).mean()+np.abs(tile[0].astype(float)-tile[-1]).mean())/2)}

def material_maps(tile: np.ndarray, roughness: float, strength: float) -> dict:
    gray = srgb_to_linear(tile) @ [.2126, .7152, .0722]
    detail = gaussian_filter(gray, .6, mode="wrap")-gaussian_filter(gray, 8, mode="wrap")
    relief = detail/max(float(np.std(detail))*5, .08)*strength
    height = np.clip(.5+relief, 0, 1)
    dx = (np.roll(height, -1, axis=1)-np.roll(height, 1, axis=1))/2
    dy = (np.roll(height, -1, axis=0)-np.roll(height, 1, axis=0))/2
    normal = np.dstack((-dx*3, dy*3, np.ones_like(dx)))
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    return {"basecolor": tile, "height": np.uint16(np.rint(height*65535)),
            "normal": np.uint8(np.rint((normal*.5+.5)*255)),
            "roughness": np.full(gray.shape, round(roughness*255), np.uint8),
            "metallic": np.zeros(gray.shape, np.uint8), "ao": np.full(gray.shape, 255, np.uint8)}

def region_obj(folder: Path, owner: np.ndarray, step: int = 8) -> int:
    """A planar UV mesh with unsupported sub-areas omitted, including holes."""
    h, w = owner.shape; lines = ["mtllib region.mtl", "o owned_material_region"]; triangles = 0
    for y in range(0, h-step, step):
        for x in range(0, w-step, step):
            if not owner[y:y+step+1, x:x+step+1].all(): continue
            first = triangles//2*4+1
            for px, py in [(x,y),(x+step,y),(x+step,y+step),(x,y+step)]:
                lines.append(f"v {px/w:.6f} {-py/w:.6f} 0")
                lines.append(f"vt {px/(w-1):.6f} {1-py/(h-1):.6f}")
            if not triangles: lines.append("usemtl material_region")
            lines += [f"f {first}/{first} {first+2}/{first+2} {first+1}/{first+1}",
                      f"f {first}/{first} {first+3}/{first+3} {first+2}/{first+2}"]
            triangles += 2
    (folder/"region.obj").write_text("\n".join(lines)+"\n")
    (folder/"region.mtl").write_text("newmtl material_region\nKd 1 1 1\nmap_Kd area-neutral.png\nmap_d owner-mask.png\n")
    return triangles

def rgba(rgb: np.ndarray, owner: np.ndarray) -> np.ndarray:
    return np.dstack((np.where(owner[..., None], rgb, 0), owner.astype(np.uint8)*255))

# CLI appended by ship_scene_material_page.py to the public algorithm module.
def main():
    parser=argparse.ArgumentParser(description='Extract one guided material region from a scene photo')
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--case',required=True)
    parser.add_argument('--material',required=True)
    parser.add_argument('--spec',type=Path,default=Path(__file__).with_name('scene_material_regions.json'))
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    spec=json.loads(args.spec.read_text())
    case=next(c for c in spec['cases'] if c['id']==args.case)
    region=next(m for m in case['materials'] if m['id']==args.material)
    rgb=np.asarray(Image.open(args.source).convert('RGB'))
    uv,seeds,excluded,valid,matrix=rectify(rgb,region,case['reference_size'])
    owner,confidence=classify_owner(uv,seeds,excluded,valid)
    base,gain,lighting=neutralize(uv,owner)
    tile,repeat=make_repeat(base,owner,region['pattern'])
    args.output.mkdir(parents=True,exist_ok=True)
    maps=material_maps(tile,region['roughness'],region['relief_strength'])
    maps.update({'area-source':rgba(uv,owner),'area-neutral':rgba(base,owner),'owner-mask':owner.astype(np.uint8)*255})
    for name,array in maps.items():Image.fromarray(array).save(args.output/(name+'.png'))
    triangles=region_obj(args.output,owner)
    report={'source':{'author':case['author'],'title':case['photo_subject'],'url':case['source_url'],
                     'license':'https://creativecommons.org/licenses/by/2.0/',
                     'sha256':hashlib.sha256(args.source.read_bytes()).hexdigest()},
            'guidance':region,'lighting':lighting,'repeat':repeat,'region_mesh_triangles':triangles,
            'uv_to_reference_matrix':matrix.tolist(), 'owned_uv_pixels':int(owner.sum()),
            'qualification':'guided review candidate; albedo, roughness, relief and physical scale unmeasured'}
    (args.output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'output':str(args.output),'owned_uv_pixels':int(owner.sum()),'triangles':triangles}))

if __name__=='__main__':main()

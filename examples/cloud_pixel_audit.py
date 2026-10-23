"""CUDA audit of source-bound fox photos against twelve saved camera renders.

SHIP_MANIFEST:
  META:
    name: ship_fox_cloud_pixel_audit
    kind: operation
    description: Compare real owner-bound photo and render pixels on CUDA; report spatial residuals.

The saved comparison JPEGs are lossy. This stage localizes residuals; it does
not replace the original renderer's qualification metrics or alter geometry.
"""

from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import sys
import time
import zipfile

import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def rgb(blob: bytes) -> torch.Tensor:
    array = np.asarray(Image.open(io.BytesIO(blob)).convert("RGB"), dtype=np.uint8).copy()
    return torch.from_numpy(array).to(device="cuda", dtype=torch.float32).permute(2, 0, 1) / 255.0


def tiles(values: torch.Tensor, mask: torch.Tensor, rows: int = 20, cols: int = 14) -> list[list[float | None]]:
    weighted = F.adaptive_avg_pool2d((values * mask)[None, None], (rows, cols))[0, 0]
    coverage = F.adaptive_avg_pool2d(mask[None, None], (rows, cols))[0, 0]
    mean = weighted / coverage.clamp_min(1e-6)
    a = mean.cpu().numpy()
    c = coverage.cpu().numpy()
    return [[round(float(a[y, x]), 3) if c[y, x] >= .05 else None
             for x in range(cols)] for y in range(rows)]


def main(root: Path, output: Path) -> None:
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA unavailable; this audit requires actual GPU pixel processing")
    root = root.resolve()
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("contract") != "argus-fox-cloud-pixel-audit-input/v1":
        raise ValueError("Unexpected manifest contract")
    rows = manifest.get("views", [])
    if [row.get("view") for row in rows] != list(range(1, 13)):
        raise ValueError("Expected exactly twelve ordered source views")
    for row in rows:
        entry = row["bundle"]
        path = root / entry["file"]
        if path.resolve().parent != root or sha256(path) != entry["sha256"]:
            raise ValueError(f"Bundle identity mismatch: view {row['view']}")
    begin = time.monotonic()
    results = []
    assets = []
    for row in rows:
        with zipfile.ZipFile(root / row["bundle"]["file"]) as archive:
            blobs = {role: archive.read(row[role]["member"])
                     for role in ("photo", "mask", "control", "candidate")}
        for role, blob in blobs.items():
            if hashlib.sha256(blob).hexdigest() != row[role]["packed_sha256"]:
                raise ValueError(f"Packed {role} changed in view {row['view']}")
        photo, control, candidate = (rgb(blobs[key]) for key in ("photo", "control", "candidate"))
        owner = np.asarray(Image.open(io.BytesIO(blobs["mask"])).convert("L"), dtype=np.uint8)
        if photo.shape != control.shape or photo.shape != candidate.shape or owner.shape != tuple(photo.shape[1:]):
            raise ValueError(f"Raster dimensions disagree in view {row['view']}")
        mask = torch.from_numpy((owner >= 128).astype(np.float32)).to("cuda")
        # Match the original comparison's three-pixel owner erosion. The saved
        # JPEGs do not preserve exact mesh-hit pixels, so this is a separate ROI.
        valid = 1 - F.max_pool2d((1 - mask)[None, None], kernel_size=7, stride=1, padding=3)[0, 0]
        count = int(valid.sum().item())
        if count < 100:
            raise ValueError(f"Too few owner-interior pixels in view {row['view']}")
        control_error = (photo - control).abs().mean(0) * 255
        candidate_error = (photo - candidate).abs().mean(0) * 255
        delta = candidate_error - control_error
        selected = valid > .5
        mean_control = float(control_error[selected].mean().item())
        mean_candidate = float(candidate_error[selected].mean().item())
        result = {
            "view": row["view"], "owner_interior_pixels": count,
            "control_rgb_mae_255": round(mean_control, 5),
            "candidate_rgb_mae_255": round(mean_candidate, 5),
            "candidate_minus_control_mae_255": round(mean_candidate - mean_control, 5),
            "candidate_better_pixel_fraction": round(float((delta[selected] < 0).float().mean().item()), 6),
            "candidate_error_p90_255": round(float(torch.quantile(candidate_error[selected], .9).item()), 5),
            "candidate_worse_tiles_20x14": tiles(delta, valid),
            "candidate_error_tiles_20x14": tiles(candidate_error, valid),
        }
        delta_array = (delta * valid).cpu().numpy()
        valid_array = valid.cpu().numpy() > .5
        change = np.zeros((*delta_array.shape, 3), dtype=np.uint8)
        change[..., 0] = np.uint8(np.clip(delta_array, 0, 20) / 20 * 255)
        change[..., 2] = np.uint8(np.clip(-delta_array, 0, 20) / 20 * 255)
        change[~valid_array] = 0
        error_array = (candidate_error * valid).cpu().numpy()
        error_image = np.zeros((*error_array.shape, 3), dtype=np.uint8)
        error_image[..., 0] = np.uint8(np.clip(error_array, 0, 80) / 80 * 255)
        error_image[~valid_array] = 0
        for kind, array in (("change", change), ("candidate-error", error_image)):
            path = output / f"view-{row['view']:02d}-{kind}.png"
            Image.fromarray(array, mode="RGB").save(path)
            assets.append({"file": path.name, "sha256": sha256(path), "bytes": path.stat().st_size})
        results.append(result)
        print("ARGUS_PIXEL_VIEW " + json.dumps(result, separators=(",", ":")), flush=True)
    torch.cuda.synchronize()
    summary = {
        "contract": "argus-fox-cloud-pixel-audit/v1", "status": "diagnostic",
        "source_report_sha256": manifest["source_report_sha256"],
        "manifest_sha256": sha256(manifest_path),
        "gpu": torch.cuda.get_device_name(0), "torch": torch.__version__,
        "view_count": len(results),
        "mean_control_rgb_mae_255": round(sum(r["control_rgb_mae_255"] for r in results) / 12, 5),
        "mean_candidate_rgb_mae_255": round(sum(r["candidate_rgb_mae_255"] for r in results) / 12, 5),
        "candidate_better_views": sum(r["candidate_minus_control_mae_255"] < 0 for r in results),
        "processing_wall_seconds": round(time.monotonic() - begin, 3),
        "heatmap_legend": "change: red means candidate has higher RGB error, blue means lower; full intensity is 20/255 error. candidate-error: red full intensity is 80/255 RGB error. Black is outside the own-mask interior.",
        "artifact_count": len(assets) + 1,
        "limits": "All twelve photo/render pairs are resampled to 360x542 JPEGs for the job file limit; saved renders were already lossy. ROI is each original owner mask resampled nearest and eroded 3 px, without exact mesh-hit intersection. Spatial diagnostic only, no asset promotion.",
    }
    (output / "report.json").write_text(json.dumps({"summary": summary, "views": results,
                                                  "assets": assets}, indent=2) + "\n", encoding="utf-8")
    print("ARGUS_PIXEL_SUMMARY " + json.dumps(summary, sort_keys=True), flush=True)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))

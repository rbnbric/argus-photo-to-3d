"""Pack the public demo images into the Argus CUDA audit manifest contract.

This creates a fresh replay from compressed demo assets. It is not the original
Nebius job input and should not be used to claim the published job's exact scores.
"""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile

from PIL import Image

SIZE = (360, 542)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main(source: Path, output: Path) -> None:
    source = source.resolve()
    output = output.resolve()
    if output.exists():
        raise FileExistsError(output)
    output.mkdir(parents=True)
    rows = []
    for view in range(1, 13):
        names = {
            "photo": f"view-{view:02d}-original.jpg",
            "mask": f"view-{view:02d}-owner-mask.png",
            "control": f"view-{view:02d}-neutral-control.jpg",
            "candidate": f"view-{view:02d}-material-candidate.jpg",
        }
        row = {"view": view, "packed_size": list(SIZE)}
        members = {}
        for role, name in names.items():
            original = (source / name).read_bytes()
            with Image.open(io.BytesIO(original)) as loaded:
                resized = loaded.convert("L" if role == "mask" else "RGB").resize(
                    SIZE, Image.Resampling.NEAREST if role == "mask" else Image.Resampling.LANCZOS
                )
            stream = io.BytesIO()
            resized.save(stream, format="PNG" if role == "mask" else "JPEG",
                         **({"optimize": True} if role == "mask" else {"quality": 85, "subsampling": 2}))
            member = role + (".png" if role == "mask" else ".jpg")
            members[member] = stream.getvalue()
            row[role] = {"member": member, "source_sha256": digest(original),
                         "packed_sha256": digest(members[member])}
        bundle = output / f"view-{view:02d}.zip"
        with zipfile.ZipFile(bundle, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for name, blob in members.items():
                archive.writestr(name, blob)
        row["bundle"] = {"file": bundle.name, "sha256": digest(bundle.read_bytes())}
        rows.append(row)
    manifest = {"contract": "argus-fox-cloud-pixel-audit-input/v1", "status": "demo_replay",
                "source_report_sha256": digest(b"Argus public demo assets; not original source report"),
                "limits": "Repacked from published compressed demo images; not original Nebius input.",
                "views": rows}
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Packed {len(rows)} views in {output}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: prepare_demo_audit.py docs/assets/fox audit-input")
    main(Path(sys.argv[1]), Path(sys.argv[2]))

# Argus — inspectable photo to 3D studies

Argus is an experimental Blender-assisted 2D-to-3D texture maker and photogrammetry-to-PBR workflow. It also studies how those same material and UV steps can be recombined on coarse scene geometry. This public repository contains the **working browser demonstration**, the source-bound diagnostic method used on Nebius, and review artifacts. The full reconstruction pipeline is still being consolidated; this is a documented demonstration, not a one-click production release.

## Try it

**[Open the interactive demonstration](https://rbnbric.github.io/argus-photo-to-3d/)**. Select one of twelve fox cameras, slide the source/render comparison, inspect neutral and textured renders, and switch residual heatmaps. The model section plays a 36-frame orbit; the GLB itself is not bundled with this public snapshot. The [real-photo surface studies](https://rbnbric.github.io/argus-photo-to-3d/surface-examples.html) let you switch between two oblique photographs, their proposed UV faces, and material previews. These studies are marked WIP because their proxy shape and PBR values are inferred.

The [12-image Devpost gallery](https://rbnbric.github.io/argus-photo-to-3d/gallery/) is also available as a [ZIP for direct upload](downloads/Argus-Devpost-Images-20261023.zip). The [2:27 demo video](https://rbnbric.github.io/argus-photo-to-3d/argus-community-demo.mp4) is captioned. [YouTube upload text and thumbnail](YOUTUBE_UPLOAD.md) are ready.

To run the site locally:

```bash
python -m http.server 8000 --directory docs
```

Open `http://127.0.0.1:8000/`.

## What is demonstrated

- A textured fox review candidate reconstructed from twelve source photographs, with saved camera comparisons and explicit failed or review-only gates.
- A three-state showroom: neutral shape, base color, and base color plus normal detail.
- Source-bound CUDA image diagnostics run as a Nebius AI Cloud Serverless Job on an NVIDIA H100, with twenty-four verified heatmaps and a per-view report. `examples/cloud_pixel_audit.py` is the published audit stage.
- One NVIDIA Nemotron 3 Super diagnostic review through Nebius Token Factory. It recommended a next test from measured evidence; deterministic checks retained final qualification authority.
- Two CC BY 2.0 oblique-photo scene recombinations of the same texture and UV procedure, shown as WIP with proposed face UVs, repeat swatches, and lit previews.

The mesh and textures in this demonstration were built with local compute. The Nebius job processed saved photo/render pairs; it did **not** generate the mesh. Captured-light fitting and physical PBR qualification remain review-only. The local full-resolution comparison and the resampled cloud audit use different masks and sampling, so their scores are not interchangeable.

## Reproduce the published CUDA diagnostic stage

`examples/cloud_pixel_audit.py` accepts a manifest folder and an output folder. It requires Python 3, NumPy, Pillow, and a CUDA-enabled PyTorch install. The manifest contract is `argus-fox-cloud-pixel-audit-input/v1`; it specifies twelve ordered views, one ZIP per view, and SHA-256 hashes for the photo, owner mask, neutral control, and candidate render. The script verifies each hash, erodes the owner mask, computes RGB residuals on the GPU, and saves per-view JSON and heatmaps.

Use your own camera-bound image bundles or `examples/prepare_demo_audit.py` to package the published comparison images. The latter prepares a **new replay input** from compressed public demo images. Its results should not be quoted as the original Nebius run's exact measurements.

```bash
python examples/prepare_demo_audit.py docs/assets/fox audit-input
python examples/cloud_pixel_audit.py audit-input audit-output
```

The second command requires a CUDA GPU. The browser demo runs without one. See [the measured Nebius report](docs/docs/ARGUS_NEBIUS_DIAGNOSTIC_REPORT_20261022.md) for the original run, scope, and cost arithmetic.

## Contents

- `docs/`: GitHub Pages demonstration, image gallery, source studies, and evidence.
- `examples/`: runnable CUDA audit and a manifest packer for the public comparison images.
- `downloads/`: direct-upload gallery and study artifact ZIPs.
- `CREDITS.md`: attribution and media license boundaries.
- `LICENSE`: MIT license for original code and original site design only.

## Current limits

The browser site presents a saved experiment. It does not accept uploaded photographs or run reconstruction in the browser. The two surface studies use authored face boundaries and inferred material channels. The fox material candidate improved six of twelve source views under the local metric, but its mean color error did not beat the neutral control. The diagnostic report and camera viewer keep that failure visible.

## Credits and reuse

Please read [CREDITS.md](CREDITS.md) before reusing the photos or derived media. Source photographs carry Creative Commons licenses independent of the code license. No API keys, private image sets, internal workspace files, or cloud credentials are included.

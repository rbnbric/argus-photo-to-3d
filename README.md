# Argus — inspectable photo to 3D studies

Argus is an experimental Blender-assisted 2D-to-3D texture maker and photogrammetry-to-PBR workflow. It also studies how those same material and UV steps can be recombined on coarse scene geometry. This public repository contains the **working browser demonstration**, the source-bound diagnostic method used on Nebius, and review artifacts. The full reconstruction pipeline is still being consolidated; this is a documented demonstration, not a one-click production release.

## Try it

**[Open the interactive demonstration](https://rbnbric.github.io/argus-photo-to-3d/)**. Select one of twelve fox cameras, slide the source/render comparison, inspect neutral and textured renders, and switch residual heatmaps. The bottom mode strip keeps photo matching, 3D comparison, material layers, textures, and reports in one workspace. A 3.1 MB web GLB supports real orbiting with shared-camera wipe, checker, and blend comparisons. Original and cleaned splats are available as aligned point previews; Gaussian covariance is omitted. The three-state Blender showroom retains its warm/cool lighting and rotation controls. The [real-photo surface studies](https://rbnbric.github.io/argus-photo-to-3d/surface-examples.html) now isolate eight material regions inside two oblique photographs. Inspect source masks, regional UVs, light-neutralization comparisons, donor patches, repeat textures, and lit orb/cube previews. Each region has a material/UV download and report. The earlier whole-face UVs and scene proxies remain available. The selections are guided; lighting and physical material parameters remain estimates.

The [12-image Devpost gallery](https://rbnbric.github.io/argus-photo-to-3d/gallery/) is also available as a [ZIP for direct upload](downloads/Argus-Devpost-Images-20261023.zip). The [2:27 demo video](https://www.youtube.com/watch?v=sbvY6fdppkQ) is captioned. [YouTube description and thumbnail](YOUTUBE_UPLOAD.md) are included.

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
- Two CC BY 2.0 real-photo material studies showing source zones, offset, quilt, adaptive quilt, selective mirror, and inferred shape priors.
- Two CC BY 2.0 scene studies with eight guided material regions, owned-pixel UVs, illumination reduction, constrained repeats, regional mesh exports, and lit previews.

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
- `examples/`: runnable CUDA audit, public-image manifest packer, and standalone guided regional material extractor.
- `downloads/`: direct-upload gallery and study artifact ZIPs.
- `CREDITS.md`: attribution and media license boundaries.
- `LICENSE`: MIT license for original code and original site design only.

## Current limits

The browser site presents a saved experiment. It does not accept uploaded photographs or run reconstruction in the browser. The two surface studies use authored face boundaries and inferred material channels. The fox material candidate improved six of twelve source views under the local metric, but its mean color error did not beat the neutral control. The diagnostic report and camera viewer keep that failure visible.

## Credits and reuse

Please read [CREDITS.md](CREDITS.md) before reusing the photos or derived media. Source photographs carry Creative Commons licenses independent of the code license. No API keys, private image sets, internal workspace files, or cloud credentials are included.

## Reproduce a regional material

The [material lab](https://rbnbric.github.io/argus-photo-to-3d/surface-examples.html#community_building/wood_siding) starts with the national park building's exterior siding. The roof, foundation stone and painted trim are separate materials. The office separates partition fabric, wall paint, carpet and cabinet finish. These examples use authored planes, material samples and object exclusions; pixel ownership, masked lighting fitting, donor selection and quilting are deterministic. They do not claim automatic detection of every material in an arbitrary photo.

The standalone core in `examples/regional_materials.py` exports the same numerical functions used for these results. Python 3.10+, NumPy, SciPy and Pillow are required. Download the credited [3000-pixel cabin source](https://live.staticflickr.com/2820/13230532283_428706e68a_3k.jpg) as `community_building.jpg`, then run:

```bash
python -m pip install numpy scipy pillow
python examples/regional_materials.py --source community_building.jpg --case community_building --material wood_siding --output siding-result
```

Keep the source's full framing. The authored coordinates scale with the original image dimensions; an unrelated crop needs new guidance. `examples/scene_material_regions.json` contains all eight regions. The output includes source/neutral regional UVs, ownership mask, base color, tangent-space OpenGL normal, 16-bit height, roughness, metallic, AO, an OBJ/MTL and a donor report. The CLI reproduces maps and the regional mesh; the website's context overlays and illustrative orb/cube renders are packaged review outputs.

Only fully owned donor rectangles enter a repeat. Siding and roof rows use detected row spacing; other materials use overlap-ranked quilting. Broad illumination is reduced using a scalar field fitted within the selected material. Roughness is a constant authored prior; metallic is zero and AO is neutral white. Normal and height are appearance-derived estimates, not measurements. Mesh coordinates describe a planar UV patch, without recovered metric scale. All of this remains an inspectable WIP. Source credits and adaptation details accompany each downloadable material report.

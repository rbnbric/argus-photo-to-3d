# Media and method credits

The MIT `LICENSE` covers the original code and site design in this repository. It does **not** replace the licenses below for source photographs or their adaptations.

## Fox capture and derivatives

The twelve fox source photographs come from John Davies, [Photogrammetry-examples/Fox](https://github.com/john-davies/Photogrammetry-examples/tree/master/Fox), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Argus resized and recompressed the photographs, made masks, comparison renders, a derived textured model, material states, gallery plates, and a video from this capture. These distributed fox-derived media retain CC BY-SA 4.0 attribution and share-alike obligations. Davies describes the physical fox as belonging to his wife; the sculpture's original maker is unknown.

## Real-photo material extraction

[“brick and plaster texture”](https://www.flickr.com/photos/dg_pics/3937990893/) by David Gunter, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Argus selected a pale plaster crop, built a repeating sample, and rendered orb and cube previews; the source photo and a mixed crop remain visible in the pass/fail plate. This is a bounded repeat study, not a physical PBR qualification.

## Oblique-photo studies

- [“Community Building (2014) 8247”](https://www.flickr.com/photos/50693818@N08/13230532283) by Grand Canyon National Park, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Argus adapted it through UV rectification, source overlays, proxy geometry, and inferred material maps and previews.
- [“my office”](https://www.flickr.com/photos/85278812@N00/1725317) by Robbie Sproule, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Argus made the same kinds of adaptations.

Their authored material labels and face boundaries are proposals. Their PBR parameters are not measured. The gallery credit receipt is in `docs/gallery/SURFACE-SOURCE-CREDITS.txt`.

## Method foundations

Argus was developed with Blender, Python, computer vision, and local GPU tools. We studied and used ideas from the Blender, COLMAP, Nerfstudio, gsplat, Open3D, Manifold, and BiRefNet communities. This repository does not vendor their software. The diagnostic GPU stage ran on Nebius AI Cloud, and a bounded diagnostic call used NVIDIA Nemotron 3 Super through Nebius Token Factory.

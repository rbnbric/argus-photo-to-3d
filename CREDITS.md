# Media and method credits

The MIT `LICENSE` covers the original code and site design in this repository. It does **not** replace the licenses below for source photographs or their adaptations.

## Fox capture and derivatives

The twelve fox source photographs come from John Davies, [Photogrammetry-examples/Fox](https://github.com/john-davies/Photogrammetry-examples/tree/master/Fox), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Argus resized and recompressed the photographs, made masks, comparison renders, a derived textured model, material states, gallery plates, and a video from this capture. These distributed fox-derived media retain CC BY-SA 4.0 attribution and share-alike obligations. Davies describes the physical fox as belonging to his wife; the sculpture's original maker is unknown.

## Real-photo material extraction

- [“Abstract - Peeling Paint”](https://www.flickr.com/photos/53496815@N00/424540015/) by Paul Stevenson, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Argus made source-zone, offset, quilt, opt-in mirror, and editable normal-prior previews from the blue paint.
- [“The face in the door”](https://www.flickr.com/photos/62356799@N06/15940045866/) by sagesolar, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Argus cropped a weathered-wood region and made offset, quilt, adaptive-quilt, and editable height-prior previews.

The material candidates are appearance proposals. Their normal and height priors are inferred, not measured physical PBR. The source photographs and material adaptations are credited again in `docs/gallery/SURFACE-SOURCE-CREDITS.txt`.

## Oblique-photo studies

- [“Community Building (2014) 8247”](https://www.flickr.com/photos/50693818@N08/13230532283) by Grand Canyon National Park, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Argus adapted it through UV rectification, source overlays, proxy geometry, and inferred material maps and previews.
- [“my office”](https://www.flickr.com/photos/85278812@N00/1725317) by Robbie Sproule, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Argus made the same kinds of adaptations.

Their authored material labels and face boundaries are proposals. Their PBR parameters are not measured. The gallery credit receipt is in `docs/gallery/SURFACE-SOURCE-CREDITS.txt`.

## Method foundations

Argus was developed with Blender, Python, computer vision, and local GPU tools. We studied and used ideas from the Blender, COLMAP, Nerfstudio, gsplat, Open3D, Manifold, and BiRefNet communities. This repository does not vendor their software. The diagnostic GPU stage ran on Nebius AI Cloud, and a bounded diagnostic call used NVIDIA Nemotron 3 Super through Nebius Token Factory.

## Browser viewer dependencies

- Three.js 0.180.0, MIT; vendored runtime and license in `docs/vendor/three/`.
- Google Draco decoder, Apache 2.0; vendored decoder and license in `docs/vendor/three/draco/`.
- Roboto variable font, SIL Open Font License; font and license in `docs/assets/fonts/`.

The web GLB is a Draco-compressed adaptation of the credited fox review model. Its geometry count and embedded material maps are retained; compression quantizes vertex attributes. The original and cleaned splat previews retain all source point positions and colors in the same coordinate frame, but omit Gaussian shape/covariance. These fox-derived assets retain CC BY-SA 4.0. Receipts are beside the assets in `docs/assets/fox/`.

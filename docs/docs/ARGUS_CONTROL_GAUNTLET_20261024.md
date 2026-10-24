# Argus control gauntlet · 24 October 2026

Argus is an experimental photo-to-3D and material workflow. A good model orbit is
one kind of evidence; a match to each source camera, a reusable material, and an
asset that opens in Blender are different tests. This log keeps those decisions
separate. [Open the demo](../index.html), [material examples](../surface-examples.html),
and [source credits](../../CREDITS.md).

## First run: saved-artifact integrity

We checked the current twelve-camera demo and the two oblique scene studies.
The first audit found a stale **local** package manifest: the web GLB was present
but absent from the manifest written before it was added. We kept the
[failed receipt](ARGUS_ARTIFACT_AUDIT_BEFORE_20261024.json), regenerated the
manifest from the current package, and repeated the same audit. The
[second receipt](ARGUS_ARTIFACT_AUDIT_20261024.json) passed **8/8 artifact
checks**.

That run checked twelve photo/mask/control/candidate groups, 24 cloud heatmaps,
file hashes and dimensions, local metric arithmetic, two scene inputs, eight
regional material outputs, 883 fully owned donor rectangles, and eight material
ZIP archives. The skull depth control remains labeled `diagnostic_only`.

**This result concerns artifact integrity.** It does not qualify reconstruction
shape, lighting recovery, physical material accuracy, or automatic segmentation.
The fox material candidate still improved six of twelve full-resolution views
while its mean color error was slightly worse than the control. The separate
resampled Nebius image audit improved eight of twelve views under a different
mask and sampling contract. We do not combine those scores.

## Next runs

Each run records exact input identity, mask owner, candidate and baseline,
protected views, source/render overlays, maps, per-view numbers, elapsed time,
compute usage, a pass/fail/unresolved decision, and a link to the output even
when it fails. Criteria are frozen before fitting.

| Run | Test | What would count as useful evidence |
| --- | --- | --- |
| **Fox regression** | Re-render the current neutral and textured meshes through all twelve saved source cameras, especially views 05 and 10. | Source/render opacity overlays, spatial residuals, recess closeups, GLB re-import and tangent check. A gain on one view cannot hide a protected-view regression. |
| **Failed skull and scan118** | Apply the same remediation funnel to known hard controls. | Keep the old and revised meshes, camera comparison, source ownership, manifold/export checks and an explicit `did not pass` report when qualification fails. |
| **Flat real-photo materials** | Test selected paint, brick, wood, metal or grout zones through offset, quilt, adaptive quilt and optional mirror. | Donor provenance, zero foreign-material pixels in donor patches, 2×2 repeats, estimated normal/height, and lit orb/cube previews under two lights. |
| **New oblique scene** | Give a fresh, permission-cleared photo to a first-time operator; select one sub-area material and make a UV patch. | Timed markings, excluded objects, rectified UV, source/neutralized views, reusable repeat, OBJ/ZIP import and visible failures. Freeze the first result before tuning. |
| **Lighting holdout** | Fit capture light on a subset and predict held-out source cameras. | Saved light estimate, neutral-color map and held-out errors. The current fox light fit has **not** passed this gate. |
| **First-use route** | Follow the written photo-to-Blender procedure without a developer driving it. | Intervention minutes, unclear steps, asset import state and whether the report actually helps someone correct an error. |

## Features under development

Quick crop needs a recorded original-to-crop transform. Symmetry needs
undoable, source-supported corrections that preserve asymmetric real detail.
Object detection would propose masks for review; confidence alone cannot edit
a mesh. Full reconstruction on Nebius is a planned cloud route. The demonstrated
Nebius H100 stage audited saved images; the mesh and textures were made locally.

We will publish the next receipts with their failures and limits. A result can
still be useful as a prototype while its report says exactly what did not pass.

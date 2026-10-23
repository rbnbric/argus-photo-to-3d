### Inspiration

A 3D reconstruction can look convincing from one angle and fall apart when you turn it. A shifted crop, a filled-in recess, a surviving piece of background, or a shadow baked into the texture can spoil the asset. We built Argus so makers can trace those problems back to the source photos and improve the result.

The photographs contain more than an outline. They carry color, material, lighting, and clues about the three-dimensional form. We want to draw those clues out and turn static images into assets artists can actually use in films, games, and personal projects. The reporting belongs with the asset: an expert can inspect it directly, and a beginner can bring the same evidence to an LLM for help. Either way, the reasoning stays open to inspection.

### What it does

Argus is an experimental photo-to-3D workflow built alongside a Blender plugin. It takes one photo or a series of views toward a model and material prototype, then keeps the evidence beside the result: camera alignment, masks, depth, geometry, textures, and renders from the original camera angles.

Our current demo uses twelve photographs of a small stone fox from John Davies's photogrammetry set. You can rotate the textured model, compare it with each source photograph, slide a matched render over the image, and inspect a neutral mesh and spatial error maps. A showroom turns the same mesh through neutral shape, base color, and normal-detail states. Separate control image sets, including failures, still produce reviewable models and reports that say where the output falls short.

The main material studies use licensed photographs of peeling paint and weathered wood to show source selection, offset, quilting, adaptive quilting, and optional mirroring. An additional scene study applies the same procedure to eight material regions across a national park building and an office: selecting material pixels within a surface, unwrapping them, reducing captured light, and synthesizing reusable repeats. These are guided selections with inspectable masks and donor patches; they are not automatic recognition of every material.

The larger question connecting these pieces is whether a neutralized material, surface detail, and model can reproduce the photograph when we put reconstructed lighting back on it. We have an inspectable working candidate and a way to test that question; the current light fit has not passed its qualification gates.

### How we built it

We combined Python, Blender, computer vision, local GPU processing, and deterministic qualification reports. It is a buffet of techniques, but each has a job. Original photos keep their own masks and identities. We render each candidate through saved cameras, compare it with the corresponding photo, and retain the intermediate results. A good-looking orbit never gets to stand in for a source match.

We used **NVIDIA Nemotron 3 Super through Nebius Token Factory** for a live diagnostic review of measured results. It recommended a next material test and cited the evidence behind it; deterministic checks still decide whether a candidate passes. We also ran a **Nebius AI Cloud Serverless Job on an NVIDIA H100**. Its CUDA audit compared the twelve source views with saved neutralized-color control and material-candidate renders, producing 24 heatmaps and a per-view report. We downloaded and verified every output. The demonstrated mesh and textures were reconstructed locally; the cloud job ran a real diagnostic stage, not cloud mesh generation. That cloud path matters for people who simply do not have the hardware to run the local stages.

### Challenges we ran into

Camera and crop alignment proved crucial: a small offset can invent apparent geometry that was never on the object. Deep recesses were harder still, especially where a raised form sits beside a narrow valley: the paw clefts, under the chest, around the rear legs, and against the base. Then there is the dark patch that might be pigment, a hollow, or the original lighting. These problems interact, and no single modifier settles them all.

I had little interest in choosing the friendliest image set to hide those problems. Failed controls remain visible. A candidate can improve one angle and get worse across the full set. Argus treats each method as one layer of evidence, then brings the layers together into a model you can inspect and correct.

### Accomplishments that we're proud of

We produced a textured fox GLB with verified Blender tangent export, twelve source-bound camera comparisons, a three-state material showroom, and a 2:27 demo video. The fox is a usable review candidate with a report attached, including the awkward regions. The material candidate improved six of twelve views in the full-resolution local comparison, but its average color error was slightly worse than the neutral control. Argus says so.

We also produced reusable texture candidates from licensed real-world photos, with offset, quilt, adaptive quilt, and optional mirror methods. The scene extension now separates eight material regions, including the cabin’s wooden siding, and provides masked regional UVs, lighting comparisons, repeat textures, and material downloads.

Nemotron 3 Super returned a bounded, evidence-based recommendation through Token Factory. The Nebius H100 job completed its twelve-view diagnostic in 5.845 seconds of reported execution, including 3.114 seconds of CUDA audit processing. We verified all 24 heatmaps and the JSON report after download. That gives us proof of both Nebius integrations in the demonstrated workflow.

### What we learned

The difference between a render and its source photo is reconstruction data. It points to a misplaced contour, a missing recess, captured lighting, or the wrong material. We learned to use those differences to make a compact model more convincing from the actual cameras, then test whether the improvement survives the other views.

We also learned that a number means little without its measurement contract. The full-resolution local comparison and the smaller resampled Nebius audit used different masks and sampling. They cannot be merged into one pass/fail score. Keep the images, the method, and the uncertainty together, and the diagnostic becomes useful to the next artist or tool.

### What's next for Argus

We are finalizing the user experience and repeatable protocols: quick cropping, symmetry controls, object detection, and targeted corrections guided by the camera reports. The goal is to bring photogrammetry and material reconstruction together in one Blender workflow, where the artist can see what each layer contributes.

Our experiments began about a week before the first application draft. We want to give 3D professionals more capable Blender tools, particularly in the middle of the 3DCG market. People with enough local GPU capacity should be able to run the pipeline themselves. For this hackathon, **Nebius cloud GPU compute is a necessary part of the planned path for users without local capacity**. We have demonstrated its diagnostic stage; routing the full reconstruction through cloud GPU compute is the next build step. We intend to charge a modest fee for the convenience of that processing and the evidence that comes with it.

Thanks to the Blender, COLMAP, Nerfstudio, gsplat, Open3D, Manifold, and BiRefNet communities. Our documentation records which ideas we adopted, tested, or studied.

**Fox source credit:** Photographs by [John Davies](https://github.com/john-davies/Photogrammetry-examples/tree/master/Fox), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Argus used twelve resized and JPEG-recompressed photos from his set to build and present an experimental reconstruction. Davies does not identify the physical sculpture's maker in his [capture story](https://theretiredengineer.wordpress.com/2018/01/07/photogrammetry-using-a-turntable/).

**Material and scene source credits:** Paul Stevenson’s peeling paint, sagesolar’s weathered door, Grand Canyon National Park’s Community Building, and Robbie Sproule’s office photograph are CC BY 2.0 sources. [Source links and adaptation notes](https://github.com/rbnbric/argus-photo-to-3d/blob/main/CREDITS.md) accompany the demo and material downloads.


## Significant updates during the submission period

Argus existed before this hackathon. During this period we added the twelve-view source-bound fox comparison, tangent-verified textured asset, camera and concavity diagnostics, licensed-photo material extraction and repeat methods, guided regional scene materials, deterministic qualification reports, interactive demo and material showroom, live Nemotron 3 Super diagnostic review through Token Factory, and the verified H100 twelve-view image audit through Nebius AI Cloud. The local reconstruction and limited cloud diagnostic are described separately in the project story and evidence report.

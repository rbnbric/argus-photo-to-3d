# Argus · Nebius twelve-view diagnostic and cost check

Recorded 2026-10-22. This is an evidence report for the current fox candidate, not an asset acceptance certificate.

## What actually ran

Nebius AI Cloud Serverless Job `aijob-e00he632g06bw1kxtv` completed on an NVIDIA H100 80GB HBM3 in the EU North project. PyTorch `2.9.0+cu130` loaded twelve per-camera bundles: each original fox photograph, its own owner mask, and saved neutral-control and material-candidate renders. CUDA measured masked RGB error against each original and produced 24 spatial heatmaps plus a JSON report. The 25 outputs (831,290 bytes) were downloaded from the private object bucket and verified against the output hashes. The job's source manifest SHA-256 is `ff39dedacb5cd9f1dd606d7f9723fabc8c56f46bbb16d91cc535b30f9c8bb5df`; report SHA-256 is `db2521329dee3223394275c2eb4f641b9cb9aa1856135b521dfe9318947c18f5`. Its frozen local source report SHA-256 is `538724b63ea6e47de53ce27da432d91bac4a31d69920a5d8c70d133302dd0e59`.

The job ran from `19:09:44.149409247Z` to `19:09:49.994890703Z`: **5.845 seconds of provider-reported execution**. The CUDA audit took **3.114 seconds** inside it. Creation to finish took **162.751 seconds**, including provisioning and image pull. The cloud job did not reconstruct a new mesh or texture; its real image processing is a diagnostic stage of the asset pipeline.

The source and saved renders were resampled to 360 × 542 JPEG for transfer. The test region is each source photograph's owner mask, nearest-resampled and eroded by three pixels; it does not include an exact rendered-mesh hit intersection. Saved renders were already lossy. The numbers therefore use a different sampling and mask contract from the frozen local full-resolution comparison and cannot replace it. Both reports retain `diagnostic` status.

## Measured result

Mean RGB absolute error is on the 0–255 scale, averaged over each source-bound owner interior and then over the twelve views. Lower is better. Negative delta means the material candidate had less error than the neutral control under this diagnostic's contract.

| View | Owner pixels | Neutral MAE | Candidate MAE | Candidate − neutral |
| ---: | ---: | ---: | ---: | ---: |
| 01 | 26,782 | 17.50100 | 17.49789 | −0.00311 |
| 02 | 27,496 | 18.21612 | 18.22593 | +0.00981 |
| 03 | 24,785 | 19.20950 | 19.20530 | −0.00420 |
| 04 | 25,860 | 21.25436 | 21.22190 | −0.03246 |
| 05 | 27,321 | 14.87260 | 14.82915 | −0.04346 |
| 06 | 27,505 | 11.46922 | 11.44368 | −0.02555 |
| 07 | 25,387 | 13.15131 | 13.14648 | −0.00483 |
| 08 | 20,948 | 13.99252 | 13.99749 | +0.00496 |
| 09 | 17,303 | 14.29142 | 14.30064 | +0.00923 |
| 10 | 17,571 | 13.14513 | 13.16385 | +0.01873 |
| 11 | 21,195 | 13.96570 | 13.95098 | −0.01472 |
| 12 | 24,747 | 13.86856 | 13.86262 | −0.00594 |
| **View mean** | **286,900 total** | **15.41145** | **15.40383** | **−0.00762** |

The candidate was lower-error in eight views under this resampled contract. The change is about **0.05%** of the control mean, and the existing full-resolution local report found a slightly worse candidate in six views. This is a measurement-contract sensitivity, not evidence that the material passed. The heatmaps are useful for choosing local regions to inspect: `view-XX-change.png` shows red where the candidate increased error and blue where it decreased error; `view-XX-candidate-error.png` shows absolute candidate error. For example, view 05's mean improves by 0.04346/255 while its remaining high-error regions are still visible. No geometry or material was promoted by this run.

## Cost ledger

| Service | Measured usage | Published rate checked 2026-10-22 | Calculated list-price equivalent | Actual billed amount |
| --- | --- | --- | ---: | --- |
| Nebius Token Factory, NVIDIA Nemotron 3 Super | One diagnostic call; 779 input tokens, 911 output tokens; 10.98 s latency | $0.30 / million input; $0.90 / million output | **$0.0010536** | Unknown until Token Factory usage/billing is checked |
| Nebius AI Cloud, H100 on-demand job above | 5.845 s provider execution; 162.751 s creation-to-finish wall time | $4.50 / GPU-hour published instance rate | **$0.00731** if only execution seconds were billed; **$0.20344** if every creation-to-finish second were billed at that rate | Unknown until AI Cloud Billing → Usage is checked; these endpoints are illustrative, not a bill or a guaranteed bound |
| Nebius Object Storage | 601,249 bytes uploaded for the input; 831,290 bytes verified in downloaded output | Standard volume $0.0147 / GiB-month; standard egress $0.0150 / GiB | Too small to use as a meaningful per-job charge without the retention period and billed traffic definition | Unknown |

The H100 public instance rate may not exactly equal Serverless Job billing, and provisioning, disk, discounts, credits, or taxes can alter the charge. The two Nebius billing systems and credit balances should remain separate. The exact spend should be recorded from AI Cloud **Billing → Usage**, filtered by project `project-e00sjg87pr0007hrnbx3dp` and job/resource, and from the Token Factory usage page. A FOCUS CSV export gives invoice-oriented hourly detail; the usage record may appear after the job. This ledger covers the new diagnostic job and one recorded model call, not the earlier B300 smoke and H100 scalar replay. Published rates: [Nemotron pricing](https://nebius.com/services/token-factory/models/nvidia-nemotron-models-inference), [AI Cloud GPU and storage pricing](https://nebius.com/prices), [usage filtering](https://docs.nebius.com/signup-billing/usage/view), [FOCUS export](https://docs.nebius.com/signup-billing/usage/export).

The audit processed twelve views in 3.114 seconds of its own work, or about 3.85 views per processing second. The end-to-end provider wall time was much longer because this job waited for provisioning and image pull. Combining many views in one job is therefore the sensible cost experiment; the actual Billing record is needed before quoting a per-view price.

## Evidence locations and community-ready copy

Windows working copy: `local review bundle/nebius-fox-pixel-audit-v2-20261022`. Its `job.json` and `logs.txt` are provider exports; `download\report.json` and 24 PNGs are output evidence, with `download-receipt.json` in the working-copy root. The output was also written to the private bucket `argus-fox-audit-e00sjg87-20261022` under `fox-pixel-audit-v2/output/`. These local/private paths are not public judge links. The entrypoint and reusable worker are `ship_fox_cloud_pixel_prepare.py` and `ship_fox_cloud_pixel_audit.py` in this repository.

> We ran Argus's complete twelve-view fox photo/render audit as a Nebius H100 Serverless Job. CUDA processed the original photos with their own masks and generated 24 verified error heatmaps plus a per-view report. The material candidate improved eight views under this resampled diagnostic, but the average change was only 0.00762/255 and differs from our full-resolution local gate. We kept the asset in review. A separate live Nemotron 3 Super call reviewed the deterministic evidence, using 1,690 tokens; it did not approve geometry. The measured cloud job executed for 5.845 seconds. We publish measured usage and list-price calculations, while the exact billed amount remains pending in Nebius Billing.

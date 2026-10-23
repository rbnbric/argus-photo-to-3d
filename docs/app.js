(() => {
  "use strict";
  const data = window.ARGUS_DATA;
  if (!data || !data.cloud || !data.local) {
    document.body.insertAdjacentHTML("afterbegin", '<p class="data-error">The demonstration data is missing. Rebuild report-data.js from the verified reports.</p>');
    return;
  }
  const cloudViews = data.cloud.views;
  const localViews = data.local.views;
  if (cloudViews.length !== 12 || localViews.length !== 12) {
    throw new Error("Expected twelve camera records in both reports");
  }

  const byId = (id) => document.getElementById(id);
  const grid = byId("camera-grid");
  const slider = byId("comparison-slider");
  const overlay = byId("overlay-image");
  const divider = byId("comparison-divider");
  const heatmap = byId("heatmap-image");
  let selected = 1;
  let heatmapMode = "change";

  const two = (n) => String(n).padStart(2, "0");
  const fixed = (n, digits = 3) => Number(n).toFixed(digits);
  const setImage = (id, path, alt) => {
    const image = byId(id);
    image.src = path;
    image.alt = alt;
  };

  for (let view = 1; view <= 12; view += 1) {
    const cloud = cloudViews[view - 1];
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = two(view);
    button.dataset.view = String(view);
    button.title = `Camera ${two(view)}: ${cloud.candidate_minus_control_mae_255 < 0 ? "lower" : "higher"} error in the cloud audit`;
    button.setAttribute("aria-label", `Select camera ${two(view)}`);
    button.classList.toggle("better", cloud.candidate_minus_control_mae_255 < 0);
    button.addEventListener("click", () => selectView(view));
    grid.appendChild(button);
  }

  function updateSlider() {
    const amount = Number(slider.value);
    overlay.style.clipPath = `inset(0 ${100 - amount}% 0 0)`;
    divider.style.left = `${amount}%`;
    byId("slider-value").textContent = `${amount}%`;
  }

  function selectView(view) {
    selected = ((view - 1 + 12) % 12) + 1;
    const n = two(selected);
    const local = localViews[selected - 1];
    const cloud = cloudViews[selected - 1];
    if (local.view !== selected || cloud.view !== selected) throw new Error("Camera records changed order");
    byId("view-heading").textContent = `Camera ${n}`;
    setImage("original-image", `assets/fox/view-${n}-original.jpg`, `Original fox photograph, camera ${n}`);
    setImage("overlay-image", `assets/fox/view-${n}-candidate-on-photo.jpg`, `Material candidate composited only inside camera ${n}'s own source mask`);
    setImage("control-image", `assets/fox/view-${n}-neutral-control.jpg`, `Neutral control render for camera ${n}`);
    setImage("candidate-image", `assets/fox/view-${n}-material-candidate.jpg`, `Material candidate render for camera ${n}`);
    byId("local-control").textContent = fixed(local.neutral_control.rgb_mae_255);
    byId("local-candidate").textContent = fixed(local.material_candidate.rgb_mae_255);
    const delta = cloud.candidate_minus_control_mae_255;
    const display = byId("cloud-delta");
    display.textContent = `${delta > 0 ? "+" : ""}${fixed(delta, 5)}`;
    display.classList.toggle("good", delta < 0);
    display.classList.toggle("bad", delta > 0);
    for (const button of grid.querySelectorAll("button")) {
      button.setAttribute("aria-current", button.dataset.view === String(selected) ? "true" : "false");
    }
    showHeatmap();
    updateSlider();
  }

  function showHeatmap() {
    const n = two(selected);
    heatmap.src = `assets/cloud/view-${n}-${heatmapMode}.png`;
    heatmap.alt = heatmapMode === "change"
      ? `Nebius heatmap for camera ${n}: red means the material candidate increased error, blue means it decreased error`
      : `Nebius candidate absolute-error heatmap for camera ${n}: brighter red means greater RGB error`;
    byId("heatmap-legend").textContent = heatmapMode === "change"
      ? "Red: candidate increased error. Blue: candidate decreased error. Black: outside the owner-mask interior. Color saturates at a 20/255 error change."
      : "Brighter red: greater material-candidate RGB error. Black: outside the owner-mask interior. Color saturates at 80/255 error.";
  }

  slider.addEventListener("input", updateSlider);
  byId("prev-view").addEventListener("click", () => selectView(selected - 1));
  byId("next-view").addEventListener("click", () => selectView(selected + 1));
  for (const button of document.querySelectorAll("[data-jump]")) {
    button.addEventListener("click", () => selectView(Number(button.dataset.jump)));
  }
  for (const button of document.querySelectorAll("[data-heatmap]")) {
    button.addEventListener("click", () => {
      heatmapMode = button.dataset.heatmap;
      for (const choice of document.querySelectorAll("[data-heatmap]")) {
        const active = choice === button;
        choice.classList.toggle("active", active);
        choice.setAttribute("aria-pressed", active ? "true" : "false");
      }
      showHeatmap();
    });
  }
  selectView(3);

  const model = byId("fox-model");
  const rotate = byId("rotate-toggle");
  const download = byId("model-download");
  const turntable = byId("turntable-frame");
  let turntableIndex = 9;
  let turntableRunning = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!turntableRunning) rotate.textContent = "Play rotation";
  window.setInterval(() => {
    if (turntableRunning && !model.parentElement.classList.contains("model-ready")) {
      turntableIndex = (turntableIndex + 1) % 36;
      turntable.src = `assets/turntable/fox-turntable-${two(turntableIndex)}.webp`;
    }
  }, 120);
  if (download) download.hidden = true;
  model.addEventListener("load", () => {
    model.parentElement.classList.add("model-ready");
    byId("model-hint").textContent = "Drag to orbit · scroll to zoom";
    rotate.textContent = model.hasAttribute("auto-rotate") ? "Pause rotation" : "Play rotation";
    if (download) download.hidden = false;
  });
  model.addEventListener("error", () => model.parentElement.classList.remove("model-ready"));
  rotate.addEventListener("click", () => {
    if (model.parentElement.classList.contains("model-ready")) {
      const running = model.hasAttribute("auto-rotate");
      if (running) model.removeAttribute("auto-rotate");
      else model.setAttribute("auto-rotate", "");
      rotate.textContent = running ? "Play rotation" : "Pause rotation";
    } else {
      turntableRunning = !turntableRunning;
      rotate.textContent = turntableRunning ? "Pause rotation" : "Play rotation";
    }
  });
  if (location.protocol === "http:" || location.protocol === "https:") {
    fetch("assets/fox/model.glb", {method: "HEAD"})
      .then((response) => {
        if (response.ok) model.src = "assets/fox/model.glb";
      })
      .catch(() => {});
  }

  const showroom = byId("showroom-preview");
  const showroomToggle = byId("showroom-toggle");
  let showroomFrame = 0;
  let showroomLight = "warm";
  let showroomPlaying = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let showroomVisible = false;
  if (!showroomPlaying) showroomToggle.textContent = "Play rotation";
  const updateShowroom = () => {
    const frame = showroomFrame + (showroomLight === "cool" ? 48 : 0);
    showroom.src = `assets/showroom/showroom-${two(frame)}.webp`;
    showroom.alt = `Three synchronized fox material states under a ${showroomLight} display light, orbit frame ${showroomFrame + 1} of 48`;
  };
  new IntersectionObserver((entries) => {
    showroomVisible = entries.some((entry) => entry.isIntersecting);
  }, {threshold: 0.05}).observe(showroom);
  window.setInterval(() => {
    if (showroomPlaying && showroomVisible) {
      showroomFrame = (showroomFrame + 1) % 48;
      updateShowroom();
    }
  }, 150);
  for (const button of document.querySelectorAll("[data-showroom-light]")) {
    button.addEventListener("click", () => {
      showroomLight = button.dataset.showroomLight;
      for (const choice of document.querySelectorAll("[data-showroom-light]")) {
        const active = choice === button;
        choice.classList.toggle("active", active);
        choice.setAttribute("aria-pressed", active ? "true" : "false");
      }
      updateShowroom();
    });
  }
  showroomToggle.addEventListener("click", () => {
    showroomPlaying = !showroomPlaying;
    showroomToggle.textContent = showroomPlaying ? "Pause rotation" : "Play rotation";
  });
})();

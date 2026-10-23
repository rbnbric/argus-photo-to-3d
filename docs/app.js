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
    button.innerHTML = `<i class="camera-result" aria-hidden="true"></i><img src="assets/fox/view-${two(view)}-original.jpg" alt="" loading="lazy"><span>${two(view)}</span>`;
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
    if(grid.scrollWidth>grid.clientWidth){const active=grid.querySelector('[aria-current="true"]');grid.scrollLeft=active.offsetLeft-grid.offsetLeft-(grid.clientWidth-active.offsetWidth)/2;}
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

  let draggingPhoto=false;
  divider.addEventListener("pointerdown",e=>{draggingPhoto=true;divider.setPointerCapture(e.pointerId);e.preventDefault();});
  divider.addEventListener("pointermove",e=>{if(!draggingPhoto)return;const r=divider.parentElement.getBoundingClientRect();slider.value=Math.round(Math.max(0,Math.min(100,100*(e.clientX-r.left)/r.width)));updateSlider();});
  for(const event of ["pointerup","pointercancel"])divider.addEventListener(event,()=>{draggingPhoto=false;});
  divider.addEventListener("keydown",e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();slider.value=e.key==="Home"?0:e.key==="End"?100:Number(slider.value)+(e.key==="ArrowRight"?5:-5);updateSlider();});
  let showroomFrame=0,showroomLight="warm",showroomPlaying=false;
  function showRoom(){byId("showroom-preview").src=`assets/showroom/showroom-${two(showroomFrame)}.webp`;}
  // 96 saved frames: warm 0–47, cool 48–95; only animate while visible.
  for(const b of document.querySelectorAll("[data-showroom-light]"))b.addEventListener("click",()=>{showroomLight=b.dataset.showroomLight;showroomFrame=showroomFrame%48+(showroomLight==="cool"?48:0);document.querySelectorAll("[data-showroom-light]").forEach(x=>{x.classList.toggle("active",x===b);x.setAttribute("aria-pressed",String(x===b));});showRoom();});
  byId("showroom-toggle").addEventListener("click",()=>{showroomPlaying=!showroomPlaying;byId("showroom-toggle").textContent=showroomPlaying?"Pause rotation":"Play rotation";byId("showroom-toggle").setAttribute("aria-pressed",String(showroomPlaying));});
  setInterval(()=>{if(!showroomPlaying||document.hidden||byId("layers").hidden)return;showroomFrame=(showroomFrame+1)%48+(showroomLight==="cool"?48:0);showRoom();},180);

  selectView(1);
  function switchPanel(name) {
    name = ({documents:"proof", top:"compare"})[name] || name;
    if (!document.querySelector(`[data-tab="${name}"]`)) name = "compare";
    for (const panel of document.querySelectorAll("[data-panel]")) panel.hidden = panel.id !== name;
    for (const tab of document.querySelectorAll("[data-tab]")) {
      const active = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1;
    }
    history.replaceState(null, "", `#${name}`);
    document.querySelector(`[data-tab="${name}"]`).scrollIntoView({block:"nearest",inline:"nearest"});
    window.dispatchEvent(new CustomEvent("argus-panel", {detail:name}));
    window.scrollTo({top:0,behavior:"instant"});
  }
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => switchPanel(tab.dataset.tab));
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      switchPanel(tabs[next].dataset.tab); tabs[next].focus();
    });
  });
  for (let view=1;view<=12;view++) {
    const button=document.createElement("button");button.type="button";
    button.innerHTML=`<img src="assets/fox/view-${two(view)}-original.jpg" alt="Source photograph ${two(view)}" loading="lazy"><span>${two(view)}</span>`;
    button.setAttribute("aria-label",`Compare source camera ${two(view)}`);
    button.addEventListener("click",()=>{selectView(view);switchPanel("compare");});
    byId("source-filmstrip").appendChild(button);
  }
  window.addEventListener("hashchange",()=>switchPanel(location.hash.slice(1)));
  switchPanel(location.hash.slice(1) || "compare");



  document.querySelectorAll('[data-material-pane]').forEach(button=>button.addEventListener('click',()=>{
    const lit=button.dataset.materialPane==='lit';byId('material-lit').hidden=!lit;byId('material-methods').hidden=lit;
    document.querySelectorAll('[data-material-pane]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
  }));
  byId('material-light').addEventListener('input',()=>{const phase=Number(byId('material-light').value);byId('material-light-value').textContent=`${phase+1} / 12`;document.querySelectorAll('[data-lit]').forEach(img=>img.src=`assets/materials/${img.dataset.lit}-${two(phase)}.webp`);});
})();

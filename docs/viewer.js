import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const $=id=>document.getElementById(id);
const stage=$('viewer-stage'),canvas=$('review-canvas'),loading=$('viewer-loading');
const stateA=$('state-a'),stateB=$('state-b'),reveal=$('model-reveal');
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'}); }
catch(error){loading.textContent='3D is unavailable in this browser. Source cameras and reports are still available.';console.error('Argus WebGL initialization failed',error);throw error;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.8;
const scene=new THREE.Scene();scene.background=new THREE.Color('#14222f');
const camera=new THREE.PerspectiveCamera(35,1,.001,100);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.12;controls.autoRotateSpeed=.7;
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.5;room.dispose();pmrem.dispose();
const key=new THREE.DirectionalLight(0xfff0dd,2.1);key.position.set(2,3,3);scene.add(key);
const fill=new THREE.DirectionalLight(0xb5d9ec,.8);fill.position.set(-2,1,-2);scene.add(fill);
scene.add(new THREE.HemisphereLight(0xddeafa,0x242b35,1));
const targetA=new THREE.WebGLRenderTarget(1,1),targetB=new THREE.WebGLRenderTarget(1,1);
const uniforms={a:{value:targetA.texture},b:{value:targetB.texture},amount:{value:.5},mode:{value:0},resolution:{value:new THREE.Vector2(1,1)}};
const composite=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:true,
vertexShader:'varying vec2 uv0; void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
fragmentShader:`uniform sampler2D a;uniform sampler2D b;uniform float amount;uniform int mode;uniform vec2 resolution;varying vec2 uv0;
void main(){vec4 aa=texture2D(a,uv0),bb=texture2D(b,uv0);float m=step(amount,uv0.x);
if(mode==1){vec2 cell=floor(uv0*resolution/64.);float parity=mod(cell.x+cell.y,2.);float phase=fract(uv0.x*resolution.x/64.);m=parity<.5?step(amount,phase):1.-step(1.-amount,phase);if(amount<=0.)m=1.;if(amount>=1.)m=0.;}
if(mode==2)m=1.-amount;gl_FragColor=mix(aa,bb,m);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
const screenScene=new THREE.Scene();screenScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),composite));const screenCamera=new THREE.Camera();
const meshMaterials=new Map(),pointCache=new Map(),pointLoads=new Map();
let model,center=new THREE.Vector3(),extent=1,dirty=true,frameRequest=0,mode='wipe',ready=false,loadGeneration=0;
const isVisible=()=>!$('model').hidden && !document.hidden;
function schedule(){dirty=true;if(!frameRequest)frameRequest=requestAnimationFrame(tick);}
function showState(state){
 model.visible=!['raw','clean'].includes(state);
 for(const [name,points] of pointCache)points.visible=name===state;
 if(model.visible)model.traverse(obj=>{if(obj.isMesh){const variants=meshMaterials.get(obj);obj.material=variants[state] || variants.pbr;}});
}
function draw(){
 showState(stateA.value);renderer.setRenderTarget(targetA);renderer.render(scene,camera);
 showState(stateB.value);renderer.setRenderTarget(targetB);renderer.render(scene,camera);
 renderer.setRenderTarget(null);renderer.render(screenScene,screenCamera);
}
function tick(){frameRequest=0;if(!isVisible())return;const moved=controls.update();if(ready&&(dirty||moved)){draw();dirty=false;}if(controls.autoRotate||moved)schedule();}
controls.addEventListener('change',schedule);
function resize(){const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new THREE.Vector2());targetA.setSize(size.x,size.y);targetB.setSize(size.x,size.y);uniforms.resolution.value.set(width,height);schedule();}
new ResizeObserver(resize).observe(stage);window.addEventListener('argus-panel',resize);document.addEventListener('visibilitychange',schedule);
function home(view='quarter') {const theta=({front:Math.PI,quarter:Math.PI+.65,back:0})[view];controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(Math.sin(theta)*extent*2.35,extent*.35,Math.cos(theta)*extent*2.35));controls.minDistance=extent*.2;controls.maxDistance=extent*9;controls.update();schedule();}
function updateReveal(){const amount=Number(reveal.value)/100;uniforms.amount.value=amount;$('reveal-value').textContent=`${reveal.value}%`;$('reveal-handle').style.left=`${reveal.value}%`;schedule();}
reveal.addEventListener('input',updateReveal);
const handle=$('reveal-handle');let dragging=false;
handle.addEventListener('pointerdown',event=>{dragging=true;handle.setPointerCapture(event.pointerId);event.stopPropagation();});
handle.addEventListener('pointermove',event=>{if(!dragging)return;const r=stage.getBoundingClientRect();reveal.value=Math.round(100*THREE.MathUtils.clamp((event.clientX-r.left)/r.width,0,1));updateReveal();});
for(const name of ['pointerup','pointercancel'])handle.addEventListener(name,()=>{dragging=false;});
handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();reveal.value=event.key==='Home'?0:event.key==='End'?100:Number(reveal.value)+(event.key==='ArrowRight'?5:-5);updateReveal();});
for(const button of document.querySelectorAll('[data-reveal]'))button.addEventListener('click',()=>{mode=button.dataset.reveal;uniforms.mode.value={wipe:0,checker:1,blend:2}[mode];handle.hidden=mode!=='wipe';for(const b of document.querySelectorAll('[data-reveal]')){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));}schedule();});
async function loadPoints(name){
 if(pointCache.has(name))return pointCache.get(name);if(pointLoads.has(name))return pointLoads.get(name);
 const task=(async()=>{const response=await fetch(`assets/fox/${name}-points.bin`);if(!response.ok)throw new Error(`${name} point preview: HTTP ${response.status}`);const floats=new Float32Array(await response.arrayBuffer());if(floats.length%7)throw new Error('Invalid point preview layout');
 const n=floats.length/7,positions=new Float32Array(n*3),colors=new Float32Array(n*4);
 for(let i=0;i<n;i++){positions.set(floats.subarray(i*7,i*7+3),i*3);colors.set(floats.subarray(i*7+3,i*7+7),i*4);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,4));
 const material=new THREE.PointsMaterial({size:.008,vertexColors:true,transparent:true,depthWrite:false,opacity:1,alphaTest:.04});
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','float r=length(gl_PointCoord-vec2(.5))*2.;if(r>1.)discard;diffuseColor.a*=exp(-2.*r*r);\n#include <alphatest_fragment>');};
 const points=new THREE.Points(geometry,material);points.visible=false;points.frustumCulled=false;scene.add(points);pointCache.set(name,points);return points;})();pointLoads.set(name,task);try{return await task;}catch(error){pointLoads.delete(name);throw error;}
}
async function selectStates(){const generation=++loadGeneration;try{
 const wanted=[stateA.value,stateB.value].filter(v=>['raw','clean'].includes(v));
 if(wanted.some(v=>!pointCache.has(v))){loading.hidden=false;loading.textContent='Loading point preview…';}
 await Promise.all(wanted.map(loadPoints));if(generation!==loadGeneration)return;
 $('representation-note').textContent=wanted.length?'Splat point previews share the mesh coordinate frame. Gaussian covariance is omitted for this lightweight view.':'Presentation lighting. Material and captured-light fit remain in review.';
 loading.hidden=ready;schedule();
 }catch(error){loading.hidden=false;loading.textContent='Could not load this state. Choose a mesh state or reload to retry.';console.error('Argus state load failed',error);}}
for(const select of [stateA,stateB])select.addEventListener('change',()=>{document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('selected'));selectStates();});
$('swap-states').addEventListener('click',()=>{const a=stateA.value;stateA.value=stateB.value;stateB.value=a;selectStates();});
for(const b of document.querySelectorAll('[data-preset]'))b.addEventListener('click',()=>{const pair={material:['neutral','pbr'],cleanup:['raw','clean'],reconstruction:['raw','pbr']}[b.dataset.preset];stateA.value=pair[0];stateB.value=pair[1];document.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('selected',x===b));selectStates();});
$('display-light').addEventListener('change',()=>{const name=$('display-light').value;key.color.set(name==='warm'?0xffc68b:name==='cool'?0xb7d5ff:0xfff0dd);fill.color.set(name==='warm'?0xc1d9ff:name==='cool'?0xd1f5f0:0xb5d9ec);schedule();});
$('display-exposure').addEventListener('input',()=>{renderer.toneMappingExposure=Number($('display-exposure').value);$('exposure-value').textContent=renderer.toneMappingExposure.toFixed(2);schedule();});
$('rotate-toggle').addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;$('rotate-toggle').setAttribute('aria-pressed',String(controls.autoRotate));schedule();});
$('reset-view').addEventListener('click',()=>home());for(const b of document.querySelectorAll('[data-orbit]'))b.addEventListener('click',()=>home(b.dataset.orbit));
const draco=new DRACOLoader().setDecoderPath('vendor/three/draco/');
const loader=new GLTFLoader().setDRACOLoader(draco);
loader.load('assets/fox/model-web.glb',gltf=>{model=gltf.scene;scene.add(model);model.traverse(obj=>{if(obj.isMesh){const original=obj.material;const base=original.clone();base.normalMap=null;const neutral=original.clone();neutral.map=null;neutral.normalMap=null;neutral.color.set('#c5c0b5');neutral.roughness=.85;neutral.metalness=0;meshMaterials.set(obj,{pbr:original,base,neutral});}});
 const bounds=new THREE.Box3().setFromObject(model);bounds.getCenter(center);extent=Math.max(...bounds.getSize(new THREE.Vector3()).toArray());ready=true;loading.hidden=true;home();resize();selectStates();draco.dispose();
 // Expose read-only diagnostic values for browser QA and report reproducibility.
 window.argusViewer={get state(){return {ready,camera:camera.position.toArray(),target:controls.target.toArray(),a:stateA.value,b:stateB.value,mode,pointSets:[...pointCache.keys()],triangles:renderer.info.render.triangles};}};
},event=>{if(event.total)loading.textContent=`Loading model · ${Math.round(event.loaded/event.total*100)}%`;},error=>{loading.textContent='Model failed to load. Source cameras and reports remain available.';console.error('Argus model load failed',error);});
resize();updateReveal();

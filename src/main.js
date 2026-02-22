import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { crtVertexShader, crtFragmentShader } from './shader.js';

// Setup basic Three.js scene
const canvas = document.getElementById('crt-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// Default perspective camera
const perspectiveCamera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
perspectiveCamera.position.z = 4;

// Orthographic camera for Image mode
const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
orthoCamera.position.z = 1;

let currentCamera = perspectiveCamera;
let hasImage = false;

// Default 3D Objects
const group3D = new THREE.Group();
scene.add(group3D);

const geometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
const material = new THREE.MeshStandardMaterial({
  color: 0xff3366,
  roughness: 0.2,
  metalness: 0.8,
  wireframe: true
});
const torusKnot = new THREE.Mesh(geometry, material);
group3D.add(torusKnot);

const grid = new THREE.GridHelper(10, 10, 0x00f0ff, 0x00f0ff);
grid.position.y = -1.5;
group3D.add(grid);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
group3D.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 5, 5);
group3D.add(dirLight);

// 2D Image Object
const planeGeometry = new THREE.PlaneGeometry(2, 2);
const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const imagePlane = new THREE.Mesh(planeGeometry, planeMaterial);
imagePlane.visible = false;
scene.add(imagePlane);


// CRT Shader Setup
const uniforms = {
  tDiffuse: { value: null },
  resolution: { value: new THREE.Vector2() },
  time: { value: 0.0 },
};

const shaderParams = [
  'bloom_strength', 'bloom_threshold', 'bloom_softness', 'bloom_radius',
  'frame_rate', 'beam_radius', 'beam_softness', 'phosphor_decay', 'beam_deposit',
  'virtual_height', 'triad_pitch_x', 'triad_pitch_y', 'slot_pixel_pitch',
  'triad_row_shift', 'row_brick_shift', 'column_brick_shift', 'dot_radius',
  'slot_width', 'slot_height', 'slot_exponent', 'edge_softness', 'triad_phase',
];

const intParams = ['mask_type', 'scan_mode', 'scan_direction', 'beam_mode'];

shaderParams.forEach(id => { uniforms[id] = { value: 0.0 }; });
intParams.forEach(id => { uniforms[id] = { value: 0 }; });

const crtShader = {
  uniforms: uniforms,
  vertexShader: crtVertexShader,
  fragmentShader: crtFragmentShader
};

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, currentCamera);
composer.addPass(renderPass);

const crtPass = new ShaderPass(crtShader);
composer.addPass(crtPass);

function resize() {
  const container = canvas.parentElement;
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);

  if (hasImage) {
    const aspect = w / h;
    const img = planeMaterial.map ? planeMaterial.map.image : null;
    let imgAspect = 1;
    if (img) imgAspect = img.width / img.height;

    // Setup ortho frame for resolution aspect
    orthoCamera.left = -aspect;
    orthoCamera.right = aspect;
    orthoCamera.top = 1;
    orthoCamera.bottom = -1;
    orthoCamera.updateProjectionMatrix();

    // Scale plane to Cover
    // Base plane bounds in Ortho space without scale: -1 to 1 (2x2 square)
    // To match aspect, scaleX = imgAspect.
    // To cover the screen bounds (-aspect to aspect, -1 to 1):
    const scaleToCover = Math.max(aspect / imgAspect, 1 / 1);

    // Apply baseline aspect * cover scale
    imagePlane.scale.set(imgAspect * scaleToCover, 1 * scaleToCover, 1);

  } else {
    perspectiveCamera.aspect = w / h;
    perspectiveCamera.updateProjectionMatrix();
  }

  crtPass.uniforms.resolution.value.set(w, h);
}
window.addEventListener('resize', resize);
resize();


// --- UI Binding: Custom Sliders ---
const sliders = document.querySelectorAll('.custom-slider');
let activeSlider = null;

function updateSliderUI(container, val) {
  const min = parseFloat(container.getAttribute('data-min'));
  const max = parseFloat(container.getAttribute('data-max'));
  const step = container.getAttribute('data-step');
  const decimals = step.includes('.') ? step.split('.')[1].length : 0;

  // Calculate percentage
  let pct = (val - min) / (max - min);
  pct = Math.max(0, Math.min(1, pct));

  // Update DOM
  const fill = container.querySelector('.slider-fill');
  const text = container.querySelector('.slider-val-text');
  fill.style.width = `${pct * 100}%`;
  text.textContent = val.toFixed(decimals);
}

sliders.forEach(container => {
  const id = container.getAttribute('data-id');
  let val = parseFloat(container.getAttribute('data-val'));
  const color = container.getAttribute('data-color');

  // Build DOM elements inside
  container.innerHTML = `
    <div class="slider-fill" style="background-color: ${color};"></div>
    <span class="slider-label">${id.replace(/_/g, ' ')}</span>
    <span class="slider-val-text"></span>
  `;

  // Initial setup
  crtPass.uniforms[id].value = val;
  updateSliderUI(container, val);

  const moveHandler = (e) => {
    if (!activeSlider) return;
    const rect = activeSlider.getBoundingClientRect();
    let min = parseFloat(activeSlider.getAttribute('data-min'));
    let max = parseFloat(activeSlider.getAttribute('data-max'));

    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));

    let newVal = min + pct * (max - min);

    crtPass.uniforms[id].value = newVal;
    updateSliderUI(activeSlider, newVal);
  };

  container.addEventListener('mousedown', (e) => {
    activeSlider = container;
    moveHandler(e);
  });
});

window.addEventListener('mousemove', (e) => {
  if (activeSlider) {
    const id = activeSlider.getAttribute('data-id');
    const rect = activeSlider.getBoundingClientRect();
    let min = parseFloat(activeSlider.getAttribute('data-min'));
    let max = parseFloat(activeSlider.getAttribute('data-max'));
    let pct = (e.clientX - rect.left) / rect.width;
    pct = Math.max(0, Math.min(1, pct));
    let newVal = min + pct * (max - min);
    crtPass.uniforms[id].value = newVal;
    updateSliderUI(activeSlider, newVal);
  }
});
window.addEventListener('mouseup', () => { activeSlider = null; });

// --- UI Binding: Button Groups (Toggles) ---
const toggleGroups = document.querySelectorAll('.toggle-group');
toggleGroups.forEach(group => {
  const id = group.getAttribute('data-id');
  const btns = group.querySelectorAll('button');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Clear active from others
      btns.forEach(b => b.classList.remove('active'));
      // Set active
      btn.classList.add('active');
      // Update uniform
      crtPass.uniforms[id].value = parseInt(btn.getAttribute('data-val'));
    });
  });

  // Init uniform to the active one initially
  const activeBtn = group.querySelector('.active');
  if (activeBtn) crtPass.uniforms[id].value = parseInt(activeBtn.getAttribute('data-val'));
});


// --- Image Upload Handler ---
const uploadInput = document.getElementById('image-upload');
uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const loader = new THREE.TextureLoader();
  loader.load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;

    planeMaterial.map = texture;
    planeMaterial.needsUpdate = true;

    hasImage = true;
    document.getElementById('download-btn').classList.remove('hidden');

    // Switch Context
    group3D.visible = false;
    imagePlane.visible = true;

    // Switch camera
    currentCamera = orthoCamera;
    renderPass.camera = currentCamera;

    resize();
  });
});

// Download Handler
const downloadBtn = document.getElementById('download-btn');
downloadBtn.addEventListener('click', () => {
  composer.render();
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'crt-sim-export.png';
  link.href = dataURL;
  link.click();
});


// Animation Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (!hasImage) {
    torusKnot.rotation.x += 0.5 * delta;
    torusKnot.rotation.y += 0.8 * delta;
  }

  crtPass.uniforms.time.value = time;
  composer.render();
}

animate();

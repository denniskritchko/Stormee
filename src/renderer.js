const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');

// Scene setup
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 3;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Add point light for extra illumination
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(-3, 3, 3);
scene.add(pointLight);

// Load the GLTF model
let model = null;

// Track mouse position globally across entire screen
const mouse = new THREE.Vector2();
const target = new THREE.Vector3();

// Receive global cursor position from main process
const { ipcRenderer } = require('electron');

ipcRenderer.on('cursor-position', (event, data) => {
  // Data is already relative to window center, just scale it
  mouse.x = data.x * 2;
  mouse.y = -data.y * 2; // Inverted Y for Three.js
});

const loader = new GLTFLoader();
console.log('Starting to load GLB...');

loader.load(
  'assets/Demo_16_eye_update_2.glb',
  function(glb) {
    console.log('GLB loaded successfully!');
    console.log(glb);
    
    const object = glb.scene;
    
    // Calculate bounding box to properly scale and center the model
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    console.log('Model size:', size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim; // Scale to fit in view
    
    object.scale.set(scale, scale, scale);
    
    // Center the model
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center.multiplyScalar(scale));
    
    model = object;
    scene.add(object);
    console.log('Eye model added to scene');
  },
  function(xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function(error) {
    console.error('An error occurred loading GLB:', error);
  }
);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Make the eye follow the cursor across entire screen
  if (model) {
    // Create a 3D point from relative mouse position
    // The multiplier controls how far the eye can look in each direction
    target.set(mouse.x * 8, mouse.y * 8, 2);
    
    // Make the eye look at the target
    model.lookAt(target);
  }
  
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();


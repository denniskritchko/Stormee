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
let modelOriginalY = 0; // Store original Y position
let isAnimating = false;
let animationTime = 0;

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

// Listen for pop animation trigger
ipcRenderer.on('trigger-pop-animation', () => {
  if (model && !isAnimating) {
    isAnimating = true;
    animationTime = 0;
  }
});

const loader = new GLTFLoader();
console.log('Starting to load GLB...');

loader.load(
  'assets/stormeedraft.glb',
  function(glb) {
    console.log('GLB loaded successfully!');
    console.log(glb);
    
    const object = glb.scene;
    
    // Remove any wireframe/helper objects
    object.traverse((child) => {
      if (child.isMesh) {
        // Ensure materials are not in wireframe mode
        if (child.material) {
          child.material.wireframe = false;
        }
      }
      // Hide any helper objects (bones, skeletons, etc)
      if (child.type === 'Bone' || child.type === 'SkeletonHelper' || child.name.includes('Helper')) {
        child.visible = false;
      }
    });
    
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
    modelOriginalY = object.position.y; // Store original Y position
    scene.add(object);
    console.log('Model added to scene');
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
  
  // Make the model follow the cursor across entire screen
  if (model) {
    // Handle pop animation
    if (isAnimating) {
      animationTime += 1;
      
      const hopHeight = 0.8;
      
      // Quick hop sequence: up -> down -> done
      if (animationTime < 8) {
        // Jump up instantly
        model.position.y = modelOriginalY + hopHeight;
      } else if (animationTime < 16) {
        // Drop down instantly
        model.position.y = modelOriginalY;
      } else {
        // Animation complete
        model.position.y = modelOriginalY;
        isAnimating = false;
        animationTime = 0;
      }
    }
    
    // Create a 3D point from relative mouse position
    // The multiplier controls how far it can look in each direction
    target.set(mouse.x * 3, mouse.y * 3, 2);
    
    // Make the model look at the target
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


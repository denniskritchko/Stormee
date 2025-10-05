const THREE = require('three');

// Scene setup
const scene = new THREE.Scene();

// Camera setup
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a cube with gradient material
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshPhongMaterial({
  color: 0x00ff88,
  specular: 0x555555,
  shininess: 30
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Add point light
const pointLight = new THREE.PointLight(0xff0066, 1, 100);
pointLight.position.set(-5, 5, 5);
scene.add(pointLight);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Rotate the cube
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  
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


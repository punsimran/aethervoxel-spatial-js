import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

// --- 1. SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light = new THREE.PointLight(0x00f2ff, 1);
light.position.set(10, 10, 10);
scene.add(light);

// Grid & Floor (Invisible floor for raycasting)
const gridHelper = new THREE.GridHelper(20, 20, 0x00f2ff, 0x222222);
scene.add(gridHelper);
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floor = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ visible: false }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- 2. VOXEL SYSTEM ---
const gridSize = 1;
let voxels = [];
let lastPlaceTime = 0;

const cursorGeo = new THREE.BoxGeometry(gridSize, gridSize, gridSize);
const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, wireframe: true });
const cursor = new THREE.Mesh(cursorGeo, cursorMat);
scene.add(cursor);

// State
let handNDC = new THREE.Vector2(); // Normalized Device Coordinates (-1 to 1)
let smoothedNDC = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let camAngle = Math.PI / 4;
let camRadius = 15;
let camHeight = 8;

// --- 3. HAND TRACKING ---
const videoElement = document.getElementById('input_video');
const indicator = document.getElementById('pinch-indicator');

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.8, // Increased for stability
    minTrackingConfidence: 0.8
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        const thumb = hand[4];
        const index = hand[8];
        const middle = hand[12];
        const wrist = hand[0];

        // 1. Convert Hand to Screen Coordinates (-1 to 1)
        // We mirror X because webcams are mirrored
        handNDC.x = -(index.x - 0.5) * 2; 
        handNDC.y = -(index.y - 0.5) * 2;

        // 2. ZOOM (Based on distance between thumb and pinky base)
        const handSize = Math.hypot(hand[17].x - hand[2].x, hand[17].y - hand[2].y);
        camRadius = THREE.MathUtils.lerp(camRadius, 30 - (handSize * 100), 0.1);
        camRadius = THREE.MathUtils.clamp(camRadius, 5, 25);

        // 3. FIST GESTURE (Distance from all tips to wrist)
        const isFist = [8, 12, 16, 20].every(i => Math.hypot(hand[i].x - wrist.x, hand[i].y - wrist.y) < 0.15);
        if (isFist) {
            indicator.innerText = "FIST: CLEARING ALL";
            voxels.forEach(v => scene.remove(v));
            voxels = [];
            return;
        }

        // 4. ROTATION (Middle finger pinch)
        const middlePinch = Math.hypot(thumb.x - middle.x, thumb.y - middle.y);
        if (middlePinch < 0.05) {
            indicator.innerText = "NAVIGATING";
            camAngle += handNDC.x * 0.05;
            camHeight = THREE.MathUtils.clamp(camHeight + handNDC.y * 0.2, 2, 15);
        } else {
            // 5. PLACING (Index finger pinch)
            const indexPinch = Math.hypot(thumb.x - index.x, thumb.y - index.y);
            if (indexPinch < 0.05) {
                indicator.innerText = "BUILDING";
                if (Date.now() - lastPlaceTime > 500) {
                    placeBlock();
                    lastPlaceTime = Date.now();
                }
            } else {
                indicator.innerText = "IDLE (MOVE HAND)";
            }
        }
    }
});

function placeBlock() {
    // Check if block already exists here
    const pos = cursor.position.clone();
    if (voxels.some(v => v.position.distanceTo(pos) < 0.1)) return;

    const block = new THREE.Mesh(
        new THREE.BoxGeometry(gridSize, gridSize, gridSize),
        new THREE.MeshStandardMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.8 })
    );
    block.position.copy(pos);
    
    // Wireframe edge
    const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(block.geometry),
        new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    block.add(edge);
    
    scene.add(block);
    voxels.push(block);
}

const mediapipeCam = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width: 640, height: 480
});
mediapipeCam.start();

// --- 4. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Smooth the hand movement
    smoothedNDC.lerp(handNDC, 0.15);

    // Update Camera
    camera.position.x = camRadius * Math.sin(camAngle);
    camera.position.z = camRadius * Math.cos(camAngle);
    camera.position.y = camHeight;
    camera.lookAt(0, 0, 0);

    // RAYCASTING: Find where the hand is pointing in the 3D world
    raycaster.setFromCamera(smoothedNDC, camera);
    const intersects = raycaster.intersectObjects([floor, ...voxels]);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const normal = hit.face.normal; // Which side did we hit?
        
        // If hitting floor, stay at y=0.5. If hitting block, snap to its side
        if (hit.object === floor) {
            cursor.position.set(
                Math.round(hit.point.x),
                0.5,
                Math.round(hit.point.z)
            );
        } else {
            // Snap to the face of the block we hit
            cursor.position.copy(hit.object.position).add(normal);
        }
    }

    renderer.render(scene, camera);
}
animate();
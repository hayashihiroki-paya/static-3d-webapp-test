import * as THREE from "three";

const isMobile = window.innerWidth < 900 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const canvas = document.getElementById("canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 5);
scene.add(light);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 80),
  new THREE.MeshStandardMaterial({ color: 0x555555 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x4f8cf7 })
);
player.position.set(0, 0.5, -35);
scene.add(player);

let velocityY = 0;
const MOVE_SPEED = 0.12;
const JUMP_POWER = 0.22;
const GRAVITY = -0.012;

const obstacles = [];
function addObstacle(x,y,z){
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.5,1.5,1.5),
    new THREE.MeshStandardMaterial({ color: 0xff4444 })
  );
  box.position.set(x,y,z);
  scene.add(box);
  obstacles.push(box);
}
addObstacle(-3,0.75,-25);
addObstacle(4,0.75,-15);
addObstacle(-2,0.75,-5);
addObstacle(3,0.75,5);
addObstacle(0,0.75,15);

const goal = new THREE.Mesh(
  new THREE.BoxGeometry(2,2,2),
  new THREE.MeshStandardMaterial({ color: 0x44ff44 })
);
goal.position.set(0,1,30);
scene.add(goal);

const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function isColliding(a,b){
  const boxA = new THREE.Box3().setFromObject(a);
  const boxB = new THREE.Box3().setFromObject(b);
  return boxA.intersectsBox(boxB);
}

let cleared = false;
function showClear(){
  if(cleared) return;
  cleared = true;
  const div = document.createElement("div");
  div.textContent = "CLEAR!";
  Object.assign(div.style, {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    fontSize: "64px",
    color: "#00ff00",
    fontWeight: "bold",
    textShadow: "0 0 10px #00ff00",
    zIndex: 10000
  });
  document.body.appendChild(div);
}

function resetGame(){
  player.position.set(0,0.5,-35);
  velocityY = 0;
  cleared = false;
}
window.addEventListener("keydown", e => { if(e.key === "r") resetGame(); });

const mobileControls = document.getElementById("mobile-controls");
if(isMobile) mobileControls.style.display = "flex"; else mobileControls.style.display = "none";

const jumpBtn = document.getElementById("jump-btn");
let jumpPressed = false;
if(jumpBtn){
  jumpBtn.addEventListener("touchstart", e => { e.preventDefault(); jumpPressed = true; }, { passive:false });
  jumpBtn.addEventListener("touchend", e => { e.preventDefault(); jumpPressed = false; }, { passive:false });
  jumpBtn.addEventListener("touchcancel", e => { e.preventDefault(); jumpPressed = false; }, { passive:false });
  jumpBtn.addEventListener("mousedown", () => jumpPressed = true);
  window.addEventListener("mouseup", () => jumpPressed = false);
}

const stickArea = document.getElementById("stick-area");
const stickKnob = document.getElementById("stick-knob");
const stickBase = document.getElementById("stick-base");

const joystick = { x: 0, z: 0 };
let activePointerId = null;
let stickCenter = { x:0, y:0 };
const MAX_RADIUS = 40;

function updateStickCenter(){
  const rect = stickBase.getBoundingClientRect();
  stickCenter.x = rect.left + rect.width/2;
  stickCenter.y = rect.top + rect.height/2;
}
updateStickCenter();
window.addEventListener("resize", updateStickCenter);

function updateStickFromPoint(clientX, clientY){
  const dx = clientX - stickCenter.x;
  const dy = clientY - stickCenter.y;

  let nx = dx / MAX_RADIUS;
  let nz = -dy / MAX_RADIUS;

  const len = Math.hypot(nx, nz);
  if(len > 1){ nx /= len; nz /= len; }

  joystick.x = -nx;   // ←←← 左右反転を修正（ここが重要）
  joystick.z = nz;

  const knobX = Math.max(-MAX_RADIUS, Math.min(MAX_RADIUS, dx));
  const knobY = Math.max(-MAX_RADIUS, Math.min(MAX_RADIUS, dy));
  stickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
}

function resetKnob(){
  stickKnob.style.transform = `translate(-50%,-50%)`;
}

if(window.PointerEvent){
  stickArea.addEventListener("pointerdown", e => {
    activePointerId = e.pointerId;
    updateStickFromPoint(e.clientX, e.clientY);
  }, { passive:false });

  window.addEventListener("pointermove", e => {
    if(e.pointerId === activePointerId){
      updateStickFromPoint(e.clientX, e.clientY);
    }
  }, { passive:false });

  window.addEventListener("pointerup", e => {
    if(e.pointerId === activePointerId){
      activePointerId = null;
      joystick.x = 0;
      joystick.z = 0;
      resetKnob();
    }
  }, { passive:false });
}

const CAMERA_Y_OFFSET = 10;
let lastGroundCameraY = player.position.y + CAMERA_Y_OFFSET;

function animate(){
  requestAnimationFrame(animate);

  const moveForward = keys["w"] || keys["ArrowUp"] || joystick.z > 0.15;
  const moveBackward = keys["s"] || keys["ArrowDown"] || joystick.z < -0.15;
  const moveLeft = keys["a"] || keys["ArrowLeft"] || joystick.x < -0.15;
  const moveRight = keys["d"] || keys["ArrowRight"] || joystick.x > 0.15;
  const jumpKey = keys[" "] || keys["Space"] || jumpPressed;

  player.position.x += joystick.x * MOVE_SPEED;
  player.position.z += joystick.z * MOVE_SPEED;

  if(moveForward && Math.abs(joystick.z) <= 0.15) player.position.z += MOVE_SPEED;
  if(moveBackward && Math.abs(joystick.z) <= 0.15) player.position.z -= MOVE_SPEED;
  if(moveLeft && Math.abs(joystick.x) <= 0.15) player.position.x -= MOVE_SPEED;
  if(moveRight && Math.abs(joystick.x) <= 0.15) player.position.x += MOVE_SPEED;

  const onGround = player.position.y <= 0.51;
  if(jumpKey && onGround){
    velocityY = JUMP_POWER;
  }

  velocityY += GRAVITY;
  player.position.y += velocityY;

  if(player.position.y < 0.5){
    player.position.y = 0.5;
    velocityY = 0;
  }

  for(const obs of obstacles){
    if(isColliding(player, obs)){
      resetGame();
      break;
    }
  }

  goal.rotation.y += 0.02;
  if(isColliding(player, goal)) showClear();

  if(onGround){
    lastGroundCameraY = player.position.y + CAMERA_Y_OFFSET;
  }

  camera.position.x = player.position.x;
  camera.position.y = lastGroundCameraY;
  camera.position.z = player.position.z - 15;
  camera.lookAt(player.position.x, player.position.y + 2, player.position.z + 10);

  renderer.render(scene, camera);
}
animate();
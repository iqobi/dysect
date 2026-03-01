import * as THREE from 'three';

const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.3;
const MOVE_SPEED = 3.0;
const MOUSE_SENSITIVITY = 0.002;
const HEAD_BOB_SPEED = 8;
const HEAD_BOB_AMOUNT = 0.03;
const GRAVITY = 15;

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, 3);
    this.velocity = new THREE.Vector3();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.direction = new THREE.Vector3();

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    this.isLocked = false;
    this.headBobTime = 0;
    this.footstepTime = 0;
    this.isMoving = false;

    // Flashlight
    this.flashlight = new THREE.SpotLight(0xffffee, 1.0, 12, Math.PI / 6, 0.4, 1.5);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = 0.1;
    this.flashlight.shadow.camera.far = 12;
    this.flashlightOn = true;
    this.flashlightTarget = new THREE.Object3D();

    this.camera.add(this.flashlight);
    this.camera.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.flashlightTarget.position.set(0, 0, -1);
    this.flashlight.position.set(0.2, -0.1, 0);

    this.setupControls();
  }

  setupControls() {
    // Pointer lock
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      const blocker = document.getElementById('blocker');
      const hud = document.getElementById('hud');
      const crosshair = document.getElementById('crosshair');
      const vacuumBar = document.getElementById('hud-vacuum');
      const vacuumLabel = document.getElementById('hud-vacuum-label');

      if (this.isLocked) {
        blocker.style.display = 'none';
        hud.style.display = 'block';
        crosshair.style.display = 'block';
        vacuumBar.style.display = 'block';
        vacuumLabel.style.display = 'block';
      } else {
        blocker.style.display = 'flex';
        hud.style.display = 'none';
        crosshair.style.display = 'none';
        vacuumBar.style.display = 'none';
        vacuumLabel.style.display = 'none';
      }
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= e.movementX * MOUSE_SENSITIVITY;
      this.euler.x -= e.movementY * MOUSE_SENSITIVITY;
      this.euler.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
        case 'KeyF': this.toggleFlashlight(); break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
        case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
      }
    });
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 1.0 : 0;
  }

  update(delta, colliders) {
    if (!this.isLocked) return;

    // Calculate movement direction
    this.direction.set(0, 0, 0);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    if (this.moveForward) this.direction.add(forward);
    if (this.moveBackward) this.direction.sub(forward);
    if (this.moveLeft) this.direction.sub(right);
    if (this.moveRight) this.direction.add(right);

    this.isMoving = this.direction.lengthSq() > 0;

    if (this.isMoving) {
      this.direction.normalize();
    }

    // Apply movement
    const moveStep = this.direction.clone().multiplyScalar(MOVE_SPEED * delta);
    const newPos = this.position.clone().add(moveStep);

    // Collision detection (simple AABB)
    let canMove = true;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(newPos.x - PLAYER_RADIUS, 0, newPos.z - PLAYER_RADIUS),
      new THREE.Vector3(newPos.x + PLAYER_RADIUS, PLAYER_HEIGHT, newPos.z + PLAYER_RADIUS)
    );

    for (const collider of colliders) {
      const box = new THREE.Box3().setFromObject(collider);
      if (playerBox.intersectsBox(box)) {
        canMove = false;
        // Try sliding along walls
        const slideX = this.position.clone();
        slideX.x = newPos.x;
        const slideBoxX = new THREE.Box3(
          new THREE.Vector3(slideX.x - PLAYER_RADIUS, 0, slideX.z - PLAYER_RADIUS),
          new THREE.Vector3(slideX.x + PLAYER_RADIUS, PLAYER_HEIGHT, slideX.z + PLAYER_RADIUS)
        );
        let canSlideX = true;
        for (const c of colliders) {
          if (slideBoxX.intersectsBox(new THREE.Box3().setFromObject(c))) {
            canSlideX = false;
            break;
          }
        }
        if (canSlideX) {
          this.position.x = slideX.x;
        }

        const slideZ = this.position.clone();
        slideZ.z = newPos.z;
        const slideBoxZ = new THREE.Box3(
          new THREE.Vector3(slideZ.x - PLAYER_RADIUS, 0, slideZ.z - PLAYER_RADIUS),
          new THREE.Vector3(slideZ.x + PLAYER_RADIUS, PLAYER_HEIGHT, slideZ.z + PLAYER_RADIUS)
        );
        let canSlideZ = true;
        for (const c of colliders) {
          if (slideBoxZ.intersectsBox(new THREE.Box3().setFromObject(c))) {
            canSlideZ = false;
            break;
          }
        }
        if (canSlideZ) {
          this.position.z = slideZ.z;
        }
        break;
      }
    }

    if (canMove) {
      this.position.copy(newPos);
    }

    // Keep on floor
    this.position.y = PLAYER_HEIGHT;

    // Head bob
    if (this.isMoving) {
      this.headBobTime += delta * HEAD_BOB_SPEED;
      this.position.y += Math.sin(this.headBobTime) * HEAD_BOB_AMOUNT;
    } else {
      this.headBobTime = 0;
    }

    // Clamp to apartment bounds
    this.position.x = Math.max(-5.6, Math.min(5.6, this.position.x));
    this.position.z = Math.max(-4.6, Math.min(4.6, this.position.z));

    // Update camera
    this.camera.position.copy(this.position);
  }

  getPosition() {
    return this.position.clone();
  }

  getForward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
  }

  getLookTarget() {
    return this.position.clone().add(this.getForward().multiplyScalar(10));
  }
}

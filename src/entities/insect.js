import * as THREE from 'three';

// === INSECT TYPES ===
export const INSECT_TYPES = {
  COCKROACH: {
    name: 'Cockroach',
    color: 0x3a2010,
    size: { w: 0.06, h: 0.015, d: 0.1 },
    speed: 2.5,
    behaviors: ['crawl', 'hide', 'play_dead', 'scatter_on_light'],
    canLayEggs: true,
    eggInterval: 20, // seconds
    scareFactor: 0.8,
    legCount: 6,
    sound: 'skitter',
  },
  SPIDER: {
    name: 'Spider',
    color: 0x1a1a1a,
    size: { w: 0.05, h: 0.02, d: 0.05 },
    speed: 1.5,
    behaviors: ['crawl', 'hide', 'wall_climb', 'ambush'],
    canLayEggs: true,
    eggInterval: 25,
    scareFactor: 1.0,
    legCount: 8,
    sound: 'click',
  },
  CENTIPEDE: {
    name: 'Centipede',
    color: 0x553300,
    size: { w: 0.02, h: 0.01, d: 0.15 },
    speed: 3.0,
    behaviors: ['crawl', 'hide', 'fast_escape'],
    canLayEggs: false,
    eggInterval: 0,
    scareFactor: 0.9,
    legCount: 20,
    sound: 'rustle',
  },
  MOTH: {
    name: 'Moth',
    color: 0x998877,
    size: { w: 0.08, h: 0.01, d: 0.04 },
    speed: 2.0,
    behaviors: ['fly', 'attracted_to_light'],
    canLayEggs: false,
    eggInterval: 0,
    scareFactor: 0.3,
    legCount: 6,
    sound: 'flutter',
  },
  FLY: {
    name: 'Fly',
    color: 0x222233,
    size: { w: 0.03, h: 0.01, d: 0.03 },
    speed: 4.0,
    behaviors: ['fly', 'erratic', 'attracted_to_light'],
    canLayEggs: true,
    eggInterval: 15,
    scareFactor: 0.2,
    legCount: 6,
    sound: 'buzz',
  },
  CRICKET: {
    name: 'Cricket',
    color: 0x2a3a1a,
    size: { w: 0.04, h: 0.02, d: 0.06 },
    speed: 1.8,
    behaviors: ['crawl', 'jump', 'hide'],
    canLayEggs: false,
    eggInterval: 0,
    scareFactor: 0.4,
    legCount: 6,
    sound: 'chirp',
  },
  SILVERFISH: {
    name: 'Silverfish',
    color: 0x888899,
    size: { w: 0.02, h: 0.005, d: 0.08 },
    speed: 3.5,
    behaviors: ['crawl', 'hide', 'fast_escape', 'scatter_on_light'],
    canLayEggs: false,
    eggInterval: 0,
    scareFactor: 0.5,
    legCount: 6,
    sound: 'skitter',
  },
};

// === BEHAVIOR STATES ===
const STATE = {
  IDLE: 'idle',
  CRAWLING: 'crawling',
  FLYING: 'flying',
  HIDING: 'hiding',
  PLAYING_DEAD: 'playing_dead',
  FLEEING: 'fleeing',
  ATTRACTED: 'attracted',
  JUMPING: 'jumping',
  LAYING_EGGS: 'laying_eggs',
  DEAD_FOR_REAL: 'dead_for_real',
  WALL_CLIMBING: 'wall_climbing',
};

export class Insect {
  constructor(type, position, scene, options = {}) {
    this.type = type;
    this.config = INSECT_TYPES[type];
    this.scene = scene;
    this.state = STATE.IDLE;
    this.alive = true;
    this.beingVacuumed = false;
    this.vacuumProgress = 0;

    // Position & movement
    this.position = position.clone();
    this.targetPosition = null;
    this.velocity = new THREE.Vector3();
    this.flyHeight = type === 'MOTH' || type === 'FLY' ? 1.0 + Math.random() * 1.2 : 0;

    // Behavior timers
    this.stateTimer = 0;
    this.stateDuration = 1 + Math.random() * 3;
    this.eggTimer = 0;
    this.playDeadTimer = 0;
    this.playDeadDuration = 0;
    this.isPlayingDeadFake = false;
    this.alertLevel = 0; // 0 = calm, 1 = fully alert
    this.jumpVelocity = 0;
    this.hasBeenSpotted = false;

    // Hiding
    this.currentHidingSpot = null;
    this.isInDrawer = false;

    // Egg laying
    this.canLayEggs = this.config.canLayEggs;
    this.eggCooldown = this.config.eggInterval * (0.8 + Math.random() * 0.4);

    // Build 3D model
    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    // Leg animation phase
    this.legPhase = Math.random() * Math.PI * 2;
  }

  createMesh() {
    const group = new THREE.Group();
    const { w, h, d } = this.config.size;

    // Body
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.config.color,
      roughness: 0.6,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(w * 0.4, 6, 4);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.z = -d / 2 - w * 0.2;
    head.position.y = h * 0.3;
    group.add(head);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({
      color: this.config.color, roughness: 0.8,
    });
    this.legs = [];
    const legPairs = Math.min(this.config.legCount / 2, 10);
    for (let i = 0; i < legPairs; i++) {
      for (const side of [-1, 1]) {
        const legGeo = new THREE.BoxGeometry(w * 0.8, 0.003, 0.003);
        const leg = new THREE.Mesh(legGeo, legMat);
        const zOff = -d / 2 + (d / (legPairs + 1)) * (i + 1);
        leg.position.set(side * w * 0.5, -h * 0.3, zOff);
        leg.rotation.z = side * 0.3;
        this.legs.push(leg);
        group.add(leg);
      }
    }

    // Wings (for flying types)
    if (this.config.behaviors.includes('fly')) {
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
      });
      this.wings = [];
      for (const side of [-1, 1]) {
        const wingGeo = new THREE.PlaneGeometry(w * 1.5, d * 0.6);
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(side * w * 0.5, h * 0.5, 0);
        wing.rotation.z = side * 0.2;
        this.wings.push(wing);
        group.add(wing);
      }
    }

    // Antennae (for crawlers)
    if (!this.config.behaviors.includes('fly') || this.type === 'CRICKET') {
      const antMat = new THREE.MeshStandardMaterial({ color: this.config.color });
      for (const side of [-1, 1]) {
        const antGeo = new THREE.BoxGeometry(0.003, 0.003, w * 1.5);
        const ant = new THREE.Mesh(antGeo, antMat);
        ant.position.set(side * w * 0.2, h * 0.3, -d / 2 - w * 0.5);
        ant.rotation.y = side * 0.3;
        ant.rotation.x = -0.3;
        group.add(ant);
      }
    }

    // Eyes (tiny red dots for creepiness)
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0x330000, emissiveIntensity: 0.5,
    });
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(w * 0.12, 4, 4);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * w * 0.15, h * 0.4, -d / 2 - w * 0.35);
      group.add(eye);
    }

    group.scale.set(1, 1, 1);
    return group;
  }

  update(delta, playerPos, lightSources, hidingSpots, apartment) {
    if (!this.alive) return;

    // Update egg timer
    if (this.canLayEggs) {
      this.eggTimer += delta;
    }

    // Alert level based on player proximity
    const distToPlayer = this.position.distanceTo(playerPos);
    if (distToPlayer < 3) {
      this.alertLevel = Math.min(1, this.alertLevel + delta * 2);
    } else {
      this.alertLevel = Math.max(0, this.alertLevel - delta * 0.5);
    }

    // State machine
    this.stateTimer += delta;

    switch (this.state) {
      case STATE.IDLE:
        this.updateIdle(delta, playerPos, lightSources, hidingSpots);
        break;
      case STATE.CRAWLING:
        this.updateCrawling(delta, playerPos);
        break;
      case STATE.FLYING:
        this.updateFlying(delta, playerPos, lightSources);
        break;
      case STATE.HIDING:
        this.updateHiding(delta, playerPos);
        break;
      case STATE.PLAYING_DEAD:
        this.updatePlayingDead(delta, playerPos);
        break;
      case STATE.FLEEING:
        this.updateFleeing(delta, playerPos);
        break;
      case STATE.ATTRACTED:
        this.updateAttracted(delta, lightSources);
        break;
      case STATE.JUMPING:
        this.updateJumping(delta);
        break;
      case STATE.LAYING_EGGS:
        this.updateLayingEggs(delta);
        break;
      case STATE.WALL_CLIMBING:
        this.updateWallClimbing(delta, playerPos);
        break;
    }

    // Vacuum suction effect
    if (this.beingVacuumed) {
      this.vacuumProgress += delta * 1.5;
      // Spin and shrink
      this.mesh.rotation.y += delta * 20;
      this.mesh.rotation.x += delta * 15;
      const s = Math.max(0, 1 - this.vacuumProgress);
      this.mesh.scale.set(s, s, s);
    }

    // Animate legs
    this.animateLegs(delta);

    // Animate wings
    if (this.wings && (this.state === STATE.FLYING || this.state === STATE.ATTRACTED)) {
      for (let i = 0; i < this.wings.length; i++) {
        this.wings[i].rotation.z = (i === 0 ? -1 : 1) * (0.2 + Math.sin(Date.now() * 0.05) * 0.5);
      }
    }

    // Update mesh position
    this.mesh.position.copy(this.position);
  }

  // === STATE UPDATES ===

  updateIdle(delta, playerPos, lightSources, hidingSpots) {
    if (this.stateTimer > this.stateDuration) {
      this.chooseNextState(playerPos, lightSources, hidingSpots);
    }

    // Subtle idle animation - antennae twitching
    this.mesh.rotation.y += Math.sin(Date.now() * 0.003) * 0.001;
  }

  updateCrawling(delta, playerPos) {
    if (!this.targetPosition) {
      this.pickRandomTarget();
    }

    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.1 || this.stateTimer > this.stateDuration) {
      this.setState(STATE.IDLE);
      return;
    }

    dir.normalize();
    const speed = this.config.speed * (this.alertLevel > 0.5 ? 1.5 : 0.6);
    this.position.add(dir.multiplyScalar(speed * delta));

    // Face movement direction
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

    // Clamp to apartment
    this.clampToApartment();
  }

  updateFlying(delta, playerPos, lightSources) {
    if (!this.targetPosition) {
      this.pickRandomFlyTarget();
    }

    const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position);
    const dist = dir.length();

    if (dist < 0.2 || this.stateTimer > this.stateDuration) {
      // Check if should be attracted to light
      if (this.config.behaviors.includes('attracted_to_light') && Math.random() < 0.4) {
        this.setState(STATE.ATTRACTED);
        return;
      }
      this.pickRandomFlyTarget();
      this.stateTimer = 0;
      this.stateDuration = 1 + Math.random() * 3;
    }

    dir.normalize();
    let speed = this.config.speed;

    // Erratic movement for flies
    if (this.config.behaviors.includes('erratic')) {
      dir.x += (Math.random() - 0.5) * 2;
      dir.y += (Math.random() - 0.5) * 0.5;
      dir.z += (Math.random() - 0.5) * 2;
      dir.normalize();
      speed *= 1.5;
    }

    this.position.add(dir.multiplyScalar(speed * delta));

    // Keep at fly height
    this.position.y = Math.max(0.5, Math.min(2.5, this.position.y));

    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.z = dir.x * 0.3;

    this.clampToApartment();
  }

  updateHiding(delta, playerPos) {
    // Stay hidden, but peek out if player is far
    const distToPlayer = playerPos.distanceTo(this.position);

    if (distToPlayer > 5 && this.stateTimer > 5) {
      // Come out of hiding
      this.setState(STATE.CRAWLING);
      this.pickRandomTarget();
    }
  }

  updatePlayingDead(delta, playerPos) {
    this.playDeadTimer += delta;

    // Lie on back
    this.mesh.rotation.x = Math.PI;
    this.mesh.rotation.z = 0.1 * Math.sin(Date.now() * 0.001); // Subtle twitch

    if (this.playDeadTimer > this.playDeadDuration) {
      if (this.isPlayingDeadFake) {
        // SURPRISE! Spring to life and run
        this.setState(STATE.FLEEING);
        this.mesh.rotation.x = 0;
        this.isPlayingDeadFake = false;
      } else {
        // Actually stay dead-looking a bit longer
        this.setState(STATE.IDLE);
        this.mesh.rotation.x = 0;
      }
    }
  }

  updateFleeing(delta, playerPos) {
    // Run away from player
    const dir = new THREE.Vector3().subVectors(this.position, playerPos);
    dir.y = 0;
    dir.normalize();

    // Add some randomness to escape route
    dir.x += (Math.random() - 0.5) * 0.5;
    dir.z += (Math.random() - 0.5) * 0.5;
    dir.normalize();

    const speed = this.config.speed * 2.0; // Double speed when fleeing
    this.position.add(dir.multiplyScalar(speed * delta));
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

    this.clampToApartment();

    if (this.stateTimer > 3) {
      this.setState(STATE.HIDING);
    }
  }

  updateAttracted(delta, lightSources) {
    // Fly towards nearest light source
    let nearestLight = null;
    let nearestDist = Infinity;

    for (const ls of lightSources) {
      const d = this.position.distanceTo(ls.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestLight = ls;
      }
    }

    if (nearestLight && nearestDist > 0.3) {
      const dir = new THREE.Vector3().subVectors(nearestLight.position, this.position);
      dir.normalize();

      // Circle around the light (moths!)
      const perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);
      dir.add(perpendicular.multiplyScalar(0.5));
      dir.normalize();

      this.position.add(dir.multiplyScalar(this.config.speed * 0.8 * delta));

      // Bobbing
      this.position.y += Math.sin(Date.now() * 0.005) * 0.005;
    }

    if (this.stateTimer > 5 + Math.random() * 5) {
      this.setState(STATE.FLYING);
    }

    this.clampToApartment();
  }

  updateJumping(delta) {
    this.jumpVelocity -= 8 * delta; // gravity
    this.position.y += this.jumpVelocity * delta;

    // Horizontal movement during jump
    if (this.targetPosition) {
      const dir = new THREE.Vector3().subVectors(this.targetPosition, this.position);
      dir.y = 0;
      dir.normalize();
      this.position.add(dir.multiplyScalar(this.config.speed * 1.5 * delta));
    }

    if (this.position.y <= 0.01) {
      this.position.y = 0.01;
      this.setState(STATE.IDLE);
    }

    this.clampToApartment();
  }

  updateLayingEggs(delta) {
    // Stay still while laying
    this.mesh.rotation.z = Math.sin(Date.now() * 0.01) * 0.05;

    if (this.stateTimer > 2) {
      this.eggTimer = 0;
      this.setState(STATE.CRAWLING);
    }
  }

  updateWallClimbing(delta, playerPos) {
    // Move along wall
    if (!this.wallDirection) {
      this.wallDirection = new THREE.Vector3(0, 1, 0);
      if (Math.random() > 0.5) this.wallDirection.y = -1;
    }

    this.position.add(this.wallDirection.clone().multiplyScalar(this.config.speed * 0.5 * delta));

    // Rotate to show climbing
    this.mesh.rotation.x = this.wallDirection.y > 0 ? -Math.PI / 2 : Math.PI / 2;

    // Clamp height
    if (this.position.y > 2.5 || this.position.y < 0.1) {
      this.wallDirection.y *= -1;
    }

    if (this.stateTimer > 4) {
      this.position.y = 0.01;
      this.mesh.rotation.x = 0;
      this.setState(STATE.CRAWLING);
    }
  }

  // === STATE MANAGEMENT ===

  chooseNextState(playerPos, lightSources, hidingSpots) {
    const behaviors = this.config.behaviors;
    const distToPlayer = playerPos.distanceTo(this.position);

    // Check if should lay eggs
    if (this.canLayEggs && this.eggTimer >= this.eggCooldown) {
      this.setState(STATE.LAYING_EGGS);
      return;
    }

    // Player is close - flee or play dead
    if (distToPlayer < 2.5 && this.alertLevel > 0.3) {
      if (behaviors.includes('play_dead') && Math.random() < 0.3) {
        this.startPlayingDead();
        return;
      }
      if (behaviors.includes('jump') && Math.random() < 0.4) {
        this.startJump();
        return;
      }
      if (behaviors.includes('fast_escape') || Math.random() < 0.6) {
        this.setState(STATE.FLEEING);
        return;
      }
    }

    // Normal behavior selection
    const roll = Math.random();

    if (behaviors.includes('fly')) {
      if (behaviors.includes('attracted_to_light') && roll < 0.3) {
        this.setState(STATE.ATTRACTED);
      } else {
        this.setState(STATE.FLYING);
      }
    } else if (behaviors.includes('wall_climb') && roll < 0.15) {
      this.setState(STATE.WALL_CLIMBING);
      this.wallDirection = null;
      // Move to nearest wall
      const wallPositions = [
        new THREE.Vector3(-5.85, this.position.y, this.position.z),
        new THREE.Vector3(5.85, this.position.y, this.position.z),
      ];
      const nearest = wallPositions.sort((a, b) =>
        a.distanceTo(this.position) - b.distanceTo(this.position)
      )[0];
      this.position.x = nearest.x;
    } else if (behaviors.includes('hide') && roll < 0.3 && hidingSpots.length > 0) {
      const spot = hidingSpots[Math.floor(Math.random() * hidingSpots.length)];
      this.targetPosition = spot.position.clone();
      this.targetPosition.y = 0.01;
      this.currentHidingSpot = spot;
      this.setState(STATE.CRAWLING);
      this.stateDuration = 4;
    } else {
      this.setState(STATE.CRAWLING);
      this.pickRandomTarget();
    }
  }

  setState(newState) {
    this.state = newState;
    this.stateTimer = 0;
    this.stateDuration = 1 + Math.random() * 4;
  }

  startPlayingDead() {
    this.setState(STATE.PLAYING_DEAD);
    this.playDeadTimer = 0;

    // 60% chance of faking it
    this.isPlayingDeadFake = Math.random() < 0.6;
    this.playDeadDuration = this.isPlayingDeadFake
      ? 2 + Math.random() * 4 // Fake: spring back after 2-6 sec
      : 8 + Math.random() * 5; // Real: stay dead-looking 8-13 sec
  }

  startJump() {
    this.setState(STATE.JUMPING);
    this.jumpVelocity = 3 + Math.random() * 2;
    this.pickRandomTarget();
  }

  // === HELPERS ===

  pickRandomTarget() {
    const range = 3;
    this.targetPosition = new THREE.Vector3(
      this.position.x + (Math.random() - 0.5) * range,
      0.01,
      this.position.z + (Math.random() - 0.5) * range
    );
    this.targetPosition.x = Math.max(-5.5, Math.min(5.5, this.targetPosition.x));
    this.targetPosition.z = Math.max(-4.5, Math.min(4.5, this.targetPosition.z));
  }

  pickRandomFlyTarget() {
    this.targetPosition = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      0.8 + Math.random() * 1.5,
      (Math.random() - 0.5) * 8
    );
  }

  clampToApartment() {
    this.position.x = Math.max(-5.8, Math.min(5.8, this.position.x));
    this.position.z = Math.max(-4.8, Math.min(4.8, this.position.z));
    if (!this.config.behaviors.includes('fly') && this.state !== STATE.JUMPING && this.state !== STATE.WALL_CLIMBING) {
      this.position.y = Math.max(0.005, Math.min(0.01, this.position.y));
    }
  }

  animateLegs(delta) {
    if (!this.legs || this.state === STATE.PLAYING_DEAD) return;

    const isMoving = this.state === STATE.CRAWLING || this.state === STATE.FLEEING || this.state === STATE.WALL_CLIMBING;
    if (isMoving) {
      this.legPhase += delta * 20;
    }

    for (let i = 0; i < this.legs.length; i++) {
      const leg = this.legs[i];
      if (isMoving) {
        const offset = (i % 2 === 0) ? 0 : Math.PI;
        leg.rotation.z = (i < this.legs.length / 2 ? -1 : 1) * (0.3 + Math.sin(this.legPhase + offset + i * 0.5) * 0.3);
      }
    }
  }

  // === VACUUM INTERACTION ===

  startVacuum() {
    this.beingVacuumed = true;
    this.vacuumProgress = 0;
  }

  stopVacuum() {
    if (!this.beingVacuumed) return;
    this.beingVacuumed = false;
    // Partially vacuumed insects flee in panic
    if (this.vacuumProgress < 1 && this.alive) {
      this.mesh.scale.set(1, 1, 1);
      this.setState(STATE.FLEEING);
    }
  }

  isFullyVacuumed() {
    return this.vacuumProgress >= 1;
  }

  shouldLayEggs() {
    return this.canLayEggs && this.eggTimer >= this.eggCooldown && this.state === STATE.LAYING_EGGS;
  }

  kill() {
    this.alive = false;
    this.scene.remove(this.mesh);
  }

  getPosition() {
    return this.position;
  }

  getState() {
    return this.state;
  }
}

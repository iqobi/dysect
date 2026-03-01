import * as THREE from 'three';

const VACUUM_RANGE = 3.0;
const VACUUM_ANGLE = Math.PI / 6; // 30 degree cone
const VACUUM_PULL_STRENGTH = 4.0;
const VACUUM_MAX_POWER = 100;
const VACUUM_DRAIN_RATE = 8; // power per second while vacuuming
const VACUUM_RECHARGE_RATE = 15; // power per second while not vacuuming

export class VacuumSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.isVacuuming = false;
    this.power = VACUUM_MAX_POWER;

    // Visual: vacuum nozzle (simple geometry attached to camera)
    this.nozzle = this.createNozzle();
    this.camera.add(this.nozzle);

    // Particle system for suction effect
    this.particles = this.createParticles();
    this.scene.add(this.particles);
    this.particlePositions = [];
    this.particleVelocities = [];
    this.particleLifetimes = [];

    const particleCount = 100;
    for (let i = 0; i < particleCount; i++) {
      this.particlePositions.push(new THREE.Vector3());
      this.particleVelocities.push(new THREE.Vector3());
      this.particleLifetimes.push(0);
    }

    // Input
    this.setupInput();

    // Currently targeted entities
    this.targetedInsects = new Set();
    this.targetedEggs = new Set();

    // Callbacks
    this.onInsectVacuumed = null;
    this.onEggVacuumed = null;
  }

  createNozzle() {
    const group = new THREE.Group();

    // Tube
    const tubeGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.4, 8);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x444444, roughness: 0.3, metalness: 0.7,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0.25, -0.2, -0.5);
    group.add(tube);

    // Nozzle opening
    const nozzleGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.05, 8);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x333333, roughness: 0.4, metalness: 0.6,
    });
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0.25, -0.2, -0.72);
    group.add(nozzle);

    // Power indicator light on the nozzle
    const lightGeo = new THREE.SphereGeometry(0.008, 6, 4);
    this.powerIndicator = new THREE.Mesh(lightGeo, new THREE.MeshStandardMaterial({
      color: 0x44aa99,
      emissive: 0x44aa99,
      emissiveIntensity: 0.5,
    }));
    this.powerIndicator.position.set(0.25, -0.17, -0.55);
    group.add(this.powerIndicator);

    return group;
  }

  createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(100 * 3);
    const colors = new Float32Array(100 * 3);
    const sizes = new Float32Array(100);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }

  setupInput() {
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.pointerLockElement) {
        this.isVacuuming = true;
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isVacuuming = false;
        // Release all targets
        for (const insect of this.targetedInsects) {
          insect.stopVacuum();
        }
        this.targetedInsects.clear();
        for (const egg of this.targetedEggs) {
          egg.stopVacuum();
        }
        this.targetedEggs.clear();
      }
    });
  }

  update(delta, insects, eggs, playerPos, playerForward) {
    // Power management
    if (this.isVacuuming && this.power > 0) {
      this.power = Math.max(0, this.power - VACUUM_DRAIN_RATE * delta);
    } else if (!this.isVacuuming) {
      this.power = Math.min(VACUUM_MAX_POWER, this.power + VACUUM_RECHARGE_RATE * delta);
    }

    // Auto-stop if out of power
    if (this.power <= 0) {
      this.isVacuuming = false;
      for (const insect of this.targetedInsects) {
        insect.stopVacuum();
      }
      this.targetedInsects.clear();
    }

    // Update power indicator
    const powerRatio = this.power / VACUUM_MAX_POWER;
    this.powerIndicator.material.emissiveIntensity = powerRatio * 0.5;
    if (powerRatio < 0.2) {
      this.powerIndicator.material.color.setHex(0xff3333);
      this.powerIndicator.material.emissive.setHex(0xff3333);
    } else {
      this.powerIndicator.material.color.setHex(0x44aa99);
      this.powerIndicator.material.emissive.setHex(0x44aa99);
    }

    // Update HUD
    const fillEl = document.getElementById('hud-vacuum-fill');
    if (fillEl) {
      fillEl.style.width = `${powerRatio * 100}%`;
      if (powerRatio < 0.2) {
        fillEl.style.background = 'linear-gradient(90deg, #a33, #c44)';
      } else {
        fillEl.style.background = 'linear-gradient(90deg, #4a9, #6cb)';
      }
    }

    // Nozzle shake when vacuuming
    if (this.isVacuuming && this.power > 0) {
      this.nozzle.position.x = 0.25 + (Math.random() - 0.5) * 0.003;
      this.nozzle.position.y = -0.2 + (Math.random() - 0.5) * 0.003;
    }

    if (!this.isVacuuming || this.power <= 0) {
      this.updateParticles(delta, playerPos, playerForward, false);
      return { vacuumedInsects: [], vacuumedEggs: [] };
    }

    // Find insects and eggs in vacuum cone
    const vacuumedInsects = [];
    const vacuumedEggs = [];

    for (const insect of insects) {
      if (!insect.alive) continue;

      const toInsect = new THREE.Vector3().subVectors(insect.getPosition(), playerPos);
      const dist = toInsect.length();
      toInsect.normalize();

      const angle = Math.acos(Math.max(-1, Math.min(1, playerForward.dot(toInsect))));

      if (dist < VACUUM_RANGE && angle < VACUUM_ANGLE) {
        if (!insect.beingVacuumed) {
          insect.startVacuum();
          this.targetedInsects.add(insect);
        }

        // Pull insect towards player
        const pullDir = new THREE.Vector3().subVectors(playerPos, insect.getPosition()).normalize();
        const pullStrength = VACUUM_PULL_STRENGTH * (1 - dist / VACUUM_RANGE);
        insect.position.add(pullDir.multiplyScalar(pullStrength * delta));

        if (insect.isFullyVacuumed()) {
          vacuumedInsects.push(insect);
          this.targetedInsects.delete(insect);
        }
      } else if (this.targetedInsects.has(insect)) {
        insect.stopVacuum();
        this.targetedInsects.delete(insect);
      }
    }

    // Same for eggs
    for (const egg of eggs) {
      if (!egg.alive || egg.hatched) continue;

      const toEgg = new THREE.Vector3().subVectors(egg.position, playerPos);
      const dist = toEgg.length();
      toEgg.normalize();

      const angle = Math.acos(Math.max(-1, Math.min(1, playerForward.dot(toEgg))));

      if (dist < VACUUM_RANGE && angle < VACUUM_ANGLE) {
        if (!egg.beingVacuumed) {
          egg.startVacuum();
          this.targetedEggs.add(egg);
        }

        if (egg.isFullyVacuumed()) {
          vacuumedEggs.push(egg);
          this.targetedEggs.delete(egg);
        }
      } else if (this.targetedEggs.has(egg)) {
        egg.stopVacuum();
        this.targetedEggs.delete(egg);
      }
    }

    // Update particles
    this.updateParticles(delta, playerPos, playerForward, true);

    return { vacuumedInsects, vacuumedEggs };
  }

  updateParticles(delta, playerPos, playerForward, active) {
    const positions = this.particles.geometry.attributes.position.array;
    const colors = this.particles.geometry.attributes.color.array;
    const sizes = this.particles.geometry.attributes.size.array;

    for (let i = 0; i < this.particlePositions.length; i++) {
      if (active && this.particleLifetimes[i] <= 0) {
        // Spawn new particle at vacuum range
        const spread = VACUUM_ANGLE * 0.8;
        const angle1 = (Math.random() - 0.5) * spread;
        const angle2 = (Math.random() - 0.5) * spread;

        const dir = playerForward.clone();
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle1);
        dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), angle2);

        const dist = 1 + Math.random() * (VACUUM_RANGE - 1);
        this.particlePositions[i].copy(playerPos).add(dir.multiplyScalar(dist));
        this.particleVelocities[i].copy(
          new THREE.Vector3().subVectors(playerPos, this.particlePositions[i]).normalize().multiplyScalar(3 + Math.random() * 2)
        );
        this.particleLifetimes[i] = 0.3 + Math.random() * 0.5;
      }

      // Update particle
      this.particleLifetimes[i] -= delta;
      if (this.particleLifetimes[i] > 0) {
        this.particlePositions[i].add(this.particleVelocities[i].clone().multiplyScalar(delta));

        positions[i * 3] = this.particlePositions[i].x;
        positions[i * 3 + 1] = this.particlePositions[i].y;
        positions[i * 3 + 2] = this.particlePositions[i].z;

        const life = this.particleLifetimes[i];
        colors[i * 3] = 0.3;
        colors[i * 3 + 1] = 0.6 * life;
        colors[i * 3 + 2] = 0.5 * life;
        sizes[i] = 0.015 * life;
      } else {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -100;
        positions[i * 3 + 2] = 0;
        sizes[i] = 0;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.geometry.attributes.size.needsUpdate = true;
  }

  getPower() {
    return this.power;
  }

  getMaxPower() {
    return VACUUM_MAX_POWER;
  }

  isActive() {
    return this.isVacuuming && this.power > 0;
  }
}

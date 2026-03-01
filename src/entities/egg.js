import * as THREE from 'three';

const EGG_HATCH_TIME = 12; // seconds before eggs hatch

export class EggCluster {
  constructor(position, parentType, scene) {
    this.position = position.clone();
    this.position.y = 0.005;
    this.parentType = parentType;
    this.scene = scene;
    this.alive = true;
    this.hatchTimer = 0;
    this.hatchTime = EGG_HATCH_TIME * (0.8 + Math.random() * 0.4);
    this.beingVacuumed = false;
    this.vacuumProgress = 0;
    this.hatched = false;
    this.pulsating = false;

    // Number of eggs (= number of insects that will spawn)
    this.eggCount = 2 + Math.floor(Math.random() * 3); // 2-4 insects

    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  createMesh() {
    const group = new THREE.Group();

    // Small cluster of egg spheres
    const eggMat = new THREE.MeshStandardMaterial({
      color: 0xddddaa,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < this.eggCount + 2; i++) {
      const size = 0.008 + Math.random() * 0.006;
      const eggGeo = new THREE.SphereGeometry(size, 6, 4);
      const egg = new THREE.Mesh(eggGeo, eggMat.clone());
      egg.position.set(
        (Math.random() - 0.5) * 0.03,
        size,
        (Math.random() - 0.5) * 0.03
      );
      egg.castShadow = true;
      group.add(egg);
    }

    // Web / sac around eggs (for spiders)
    if (this.parentType === 'SPIDER') {
      const sacGeo = new THREE.SphereGeometry(0.025, 8, 6);
      const sacMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        transparent: true,
        opacity: 0.15,
        roughness: 1.0,
      });
      const sac = new THREE.Mesh(sacGeo, sacMat);
      sac.position.y = 0.01;
      group.add(sac);
    }

    return group;
  }

  update(delta) {
    if (!this.alive || this.hatched) return;

    this.hatchTimer += delta;

    // Pulsate when close to hatching (last 3 seconds)
    const timeLeft = this.hatchTime - this.hatchTimer;
    if (timeLeft < 3 && timeLeft > 0) {
      this.pulsating = true;
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.15;
      this.mesh.scale.set(pulse, pulse, pulse);

      // Eggs get darker as they're about to hatch
      this.mesh.children.forEach(child => {
        if (child.material && child.material.color) {
          const t = 1 - (timeLeft / 3);
          child.material.color.setRGB(
            0.87 * (1 - t * 0.3),
            0.87 * (1 - t * 0.3),
            0.67 * (1 - t * 0.3)
          );
        }
      });
    }

    // Vacuum effect
    if (this.beingVacuumed) {
      this.vacuumProgress += delta * 2;
      this.mesh.rotation.y += delta * 15;
      const s = Math.max(0, 1 - this.vacuumProgress);
      this.mesh.scale.set(s, s, s);
    }

    return this.hatchTimer >= this.hatchTime;
  }

  isReadyToHatch() {
    return this.hatchTimer >= this.hatchTime && !this.hatched && this.alive;
  }

  markHatched() {
    this.hatched = true;
    this.scene.remove(this.mesh);
  }

  startVacuum() {
    this.beingVacuumed = true;
    this.vacuumProgress = 0;
  }

  stopVacuum() {
    this.beingVacuumed = false;
    if (this.vacuumProgress < 1) {
      this.mesh.scale.set(1, 1, 1);
    }
  }

  isFullyVacuumed() {
    return this.vacuumProgress >= 1;
  }

  destroy() {
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}

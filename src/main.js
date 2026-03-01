import * as THREE from 'three';
import { Apartment } from './systems/apartment.js';
import { Player } from './systems/player.js';
import { Insect, INSECT_TYPES } from './entities/insect.js';
import { EggCluster } from './entities/egg.js';
import { VacuumSystem } from './systems/vacuum.js';
import { Atmosphere } from './systems/atmosphere.js';
import { getLevelConfig, getLevelInsectCount, getTotalLevels } from './systems/levels.js';

class Game {
  constructor() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    document.body.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 50);
    this.scene.add(this.camera);

    // Clock
    this.clock = new THREE.Clock();

    // Game state
    this.currentLevel = 0;
    this.score = 0;
    this.insects = [];
    this.eggs = [];
    this.insectsVacuumed = 0;
    this.totalInsectsForLevel = 0;
    this.gameStarted = false;
    this.levelTransitioning = false;
    this.insectSoundTimer = 0;

    // Initialize systems
    this.apartment = new Apartment(this.scene);
    this.player = new Player(this.camera, document.body);
    this.vacuum = new VacuumSystem(this.scene, this.camera);
    this.atmosphere = new Atmosphere(this.scene, this.camera);

    // Register flicker lights
    for (const ls of this.apartment.getLightSources()) {
      if (ls.flicker) {
        this.atmosphere.registerFlickerLight(ls);
      }
    }

    // Interact (E key) for drawers
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.player.isLocked) {
        this.tryInteract();
      }
    });

    // Start game on first click
    document.getElementById('blocker').addEventListener('click', () => {
      if (!this.gameStarted) {
        this.gameStarted = true;
        this.atmosphere.initAudio();
        this.startLevel(0);
      }
    });

    // Handle resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start game loop
    this.animate();
  }

  startLevel(levelIndex) {
    this.currentLevel = levelIndex;
    this.insectsVacuumed = 0;
    this.levelTransitioning = false;

    // Clear existing insects and eggs
    for (const insect of this.insects) insect.kill();
    for (const egg of this.eggs) egg.destroy();
    this.insects = [];
    this.eggs = [];

    const config = getLevelConfig(levelIndex);
    this.totalInsectsForLevel = getLevelInsectCount(levelIndex);

    // Show level title
    this.showMessage(`LEVEL ${levelIndex + 1}: ${config.name}`, 3000);
    setTimeout(() => {
      this.showMessage(config.subtitle, 2000);
    }, 3500);

    // Spawn insects
    setTimeout(() => {
      this.spawnLevelInsects(config);
    }, 2000);
  }

  spawnLevelInsects(config) {
    const hidingSpots = this.apartment.getHidingSpots();

    for (const entry of config.insects) {
      for (let i = 0; i < entry.count; i++) {
        const position = this.getSpawnPosition(entry.type, hidingSpots);
        const insect = new Insect(entry.type, position, this.scene);

        // Apply egg speed multiplier
        if (insect.canLayEggs) {
          insect.eggCooldown /= config.eggSpeedMultiplier;
        }

        this.insects.push(insect);
      }
    }

    this.updateHUD();
  }

  getSpawnPosition(type, hidingSpots) {
    const typeDef = INSECT_TYPES[type];

    // Flying insects spawn in the air
    if (typeDef.behaviors.includes('fly')) {
      return new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        0.8 + Math.random() * 1.5,
        (Math.random() - 0.5) * 8
      );
    }

    // Some crawlers start near hiding spots
    if (typeDef.behaviors.includes('hide') && hidingSpots.length > 0 && Math.random() < 0.6) {
      const spot = hidingSpots[Math.floor(Math.random() * hidingSpots.length)];
      return new THREE.Vector3(
        spot.position.x + (Math.random() - 0.5) * spot.radius,
        0.01,
        spot.position.z + (Math.random() - 0.5) * spot.radius
      );
    }

    // Random floor position, away from player
    let pos;
    const playerPos = this.player.getPosition();
    do {
      pos = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        0.01,
        (Math.random() - 0.5) * 8
      );
    } while (pos.distanceTo(playerPos) < 3);

    return pos;
  }

  tryInteract() {
    const playerPos = this.player.getPosition();
    const playerForward = this.player.getForward();
    const interactRange = 2.0;

    for (const drawer of this.apartment.getDrawerInteractables()) {
      const dist = playerPos.distanceTo(drawer.position);
      if (dist > interactRange) continue;

      const toDrawer = new THREE.Vector3().subVectors(drawer.position, playerPos).normalize();
      const dot = playerForward.dot(toDrawer);
      if (dot < 0.5) continue;

      // Toggle drawer
      drawer.isOpen = !drawer.isOpen;

      if (drawer.isOpen) {
        this.showMessage(`Opened ${drawer.type}...`, 1500);

        // Chance to reveal hidden insects
        const hiddenInsects = this.insects.filter(insect => {
          return insect.alive &&
            insect.state === 'hiding' &&
            insect.getPosition().distanceTo(drawer.position) < 1;
        });

        if (hiddenInsects.length > 0) {
          // Insects scatter!
          for (const insect of hiddenInsects) {
            insect.setState && insect.setState('fleeing');
          }
          this.atmosphere.playScareString(0.5);
          this.showMessage('Something skittered out!', 1500);
        }
      } else {
        this.showMessage(`Closed ${drawer.type}`, 1000);
      }
      break;
    }
  }

  update(delta) {
    if (!this.gameStarted || !this.player.isLocked) return;

    // Clamp delta to avoid physics explosions
    delta = Math.min(delta, 0.1);

    // Update player
    this.player.update(delta, this.apartment.getColliders());

    const playerPos = this.player.getPosition();
    const playerForward = this.player.getForward();
    const lightSources = this.apartment.getLightSources();
    const hidingSpots = this.apartment.getHidingSpots();

    // Update insects
    for (const insect of this.insects) {
      if (!insect.alive) continue;
      insect.update(delta, playerPos, lightSources, hidingSpots, this.apartment);

      // Check if insect should lay eggs
      if (insect.shouldLayEggs()) {
        const egg = new EggCluster(insect.getPosition(), insect.type, this.scene);
        this.eggs.push(egg);
        insect.eggTimer = 0;
        this.atmosphere.playEggWarning();
        this.showMessage('Eggs laid! Vacuum them before they hatch!', 2000);
        this.updateHUD();
      }
    }

    // Update eggs
    for (const egg of this.eggs) {
      if (!egg.alive || egg.hatched) continue;
      const shouldHatch = egg.update(delta);

      if (egg.isReadyToHatch()) {
        // Hatch: spawn new insects!
        for (let i = 0; i < egg.eggCount; i++) {
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            0.01,
            (Math.random() - 0.5) * 0.3
          );
          const pos = egg.position.clone().add(offset);
          const newInsect = new Insect(egg.parentType, pos, this.scene);
          this.insects.push(newInsect);
          this.totalInsectsForLevel++;
        }
        egg.markHatched();
        this.atmosphere.playScareString(0.7);
        this.showMessage('Eggs hatched! More insects!', 2000);
        this.updateHUD();
      }
    }

    // Update vacuum
    const { vacuumedInsects, vacuumedEggs } = this.vacuum.update(
      delta, this.insects, this.eggs, playerPos, playerForward
    );

    // Handle vacuumed insects
    for (const insect of vacuumedInsects) {
      insect.kill();
      this.insectsVacuumed++;
      this.score += Math.round(100 * INSECT_TYPES[insect.type].scareFactor);
      this.atmosphere.playSuckSound();
      this.updateHUD();
    }

    // Handle vacuumed eggs
    for (const egg of vacuumedEggs) {
      egg.destroy();
      this.score += 50;
      this.atmosphere.playSuckSound();
      this.updateHUD();
    }

    // Check level completion
    const aliveInsects = this.insects.filter(i => i.alive).length;
    const aliveEggs = this.eggs.filter(e => e.alive && !e.hatched).length;

    if (aliveInsects === 0 && aliveEggs === 0 && !this.levelTransitioning && this.insects.length > 0) {
      this.levelTransitioning = true;
      this.atmosphere.playLevelComplete();

      if (this.currentLevel + 1 < getTotalLevels()) {
        this.showMessage('LEVEL COMPLETE!', 3000);
        setTimeout(() => {
          this.startLevel(this.currentLevel + 1);
        }, 4000);
      } else {
        this.showMessage('YOU CLEARED THE APARTMENT! SCORE: ' + this.score, 5000);
      }
    }

    // Insect ambient sounds
    this.insectSoundTimer += delta;
    if (this.insectSoundTimer > 1.5 + Math.random() * 2) {
      this.insectSoundTimer = 0;
      // Pick a random alive insect and play its sound
      const aliveList = this.insects.filter(i => i.alive);
      if (aliveList.length > 0) {
        const insect = aliveList[Math.floor(Math.random() * aliveList.length)];
        this.atmosphere.playInsectSound(
          insect.config.sound,
          insect.getPosition(),
          playerPos
        );
      }
    }

    // Scare detection: insect very close and jumping towards player
    for (const insect of this.insects) {
      if (!insect.alive) continue;
      const dist = insect.getPosition().distanceTo(playerPos);
      if (dist < 0.8 && !insect.hasBeenSpotted) {
        insect.hasBeenSpotted = true;
        this.atmosphere.playScareString(insect.config.scareFactor);
      }
      if (dist > 2) {
        insect.hasBeenSpotted = false;
      }
    }

    // Update atmosphere
    this.atmosphere.update(delta, this.player.isMoving, this.vacuum.isActive());
  }

  updateHUD() {
    const aliveInsects = this.insects.filter(i => i.alive).length;
    const aliveEggs = this.eggs.filter(e => e.alive && !e.hatched).length;

    document.getElementById('hud-score').textContent = this.score;
    let text = `INSECTS REMAINING: ${aliveInsects}`;
    if (aliveEggs > 0) {
      text += ` | EGGS: ${aliveEggs}`;
    }
    document.getElementById('hud-insects').textContent = text;
  }

  showMessage(text, duration = 2000) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(() => {
      el.style.opacity = '0';
    }, duration);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

// Start
const game = new Game();

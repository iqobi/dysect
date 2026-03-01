import * as THREE from 'three';
import {
  createWoodTexture, createTileTexture, createWallpaperTexture,
  createCarpetTexture, createCeilingTexture
} from '../utils/textures.js';

const WALL_HEIGHT = 2.8;
const WALL_THICKNESS = 0.12;

export class Apartment {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];       // For player collision
    this.furnitureColliders = [];
    this.lightSources = [];    // Insects attracted to light
    this.hidingSpots = [];     // Where insects can hide
    this.drawerInteractables = []; // Drawers player can open

    this.textures = {
      wood: createWoodTexture(),
      tile: createTileTexture(),
      wallpaper: createWallpaperTexture(),
      carpet: createCarpetTexture(),
      ceiling: createCeilingTexture(),
    };

    this.materials = {
      wall: new THREE.MeshStandardMaterial({
        map: this.textures.wallpaper,
        roughness: 0.9,
        metalness: 0.0,
      }),
      floor: new THREE.MeshStandardMaterial({
        map: this.textures.carpet,
        roughness: 1.0,
        metalness: 0.0,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        map: this.textures.ceiling,
        roughness: 0.8,
        metalness: 0.0,
        side: THREE.BackSide,
      }),
      wood: new THREE.MeshStandardMaterial({
        map: this.textures.wood,
        roughness: 0.7,
        metalness: 0.05,
      }),
      tile: new THREE.MeshStandardMaterial({
        map: this.textures.tile,
        roughness: 0.6,
        metalness: 0.1,
      }),
      darkWood: new THREE.MeshStandardMaterial({
        color: 0x1a0f08,
        roughness: 0.8,
        metalness: 0.05,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.3,
        metalness: 0.8,
      }),
      fabric: new THREE.MeshStandardMaterial({
        color: 0x2a1f2a,
        roughness: 1.0,
        metalness: 0.0,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x88aacc,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.3,
      }),
      porcelain: new THREE.MeshStandardMaterial({
        color: 0xeeeedd,
        roughness: 0.2,
        metalness: 0.1,
      }),
      counter: new THREE.MeshStandardMaterial({
        color: 0x3a3530,
        roughness: 0.4,
        metalness: 0.1,
      }),
    };

    this.build();
  }

  build() {
    this.buildShell();
    this.buildLivingRoom();
    this.buildKitchen();
    this.buildBedroom();
    this.buildBathroom();
    this.buildHallway();
  }

  // --- GEOMETRY HELPERS ---
  addWall(x, y, z, width, height, depth, material) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, material || this.materials.wall);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.colliders.push(mesh);
    return mesh;
  }

  addBox(x, y, z, w, h, d, material, options = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (options.rotation) {
      mesh.rotation.y = options.rotation;
    }
    this.scene.add(mesh);
    if (options.collider !== false) {
      this.furnitureColliders.push(mesh);
    }
    if (options.hidingSpot) {
      this.hidingSpots.push({
        position: new THREE.Vector3(x, y, z),
        radius: options.hidingRadius || 0.5,
        type: options.hidingType || 'under',
      });
    }
    return mesh;
  }

  // --- APARTMENT SHELL ---
  buildShell() {
    // Layout: ~10m x 8m apartment
    // Living room: 5x5 (left)
    // Kitchen: 5x3 (right-front)
    // Bedroom: 5x4 (right-back)
    // Bathroom: 2x2.5 (center-back)
    // Hallway connecting everything

    // Floor
    const floorGeo = new THREE.PlaneGeometry(12, 10);
    const floor = new THREE.Mesh(floorGeo, this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.textures.carpet.repeat.set(6, 5);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(12, 10);
    const ceil = new THREE.Mesh(ceilGeo, this.materials.ceiling);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, WALL_HEIGHT, 0);
    ceil.receiveShadow = true;
    this.scene.add(ceil);
    this.textures.ceiling.repeat.set(6, 5);

    // Outer walls
    const T = WALL_THICKNESS;
    const H = WALL_HEIGHT;

    // North wall (back)
    this.addWall(0, H / 2, -5, 12, H, T);
    // South wall (front)
    this.addWall(0, H / 2, 5, 12, H, T);
    // West wall (left)
    this.addWall(-6, H / 2, 0, T, H, 10);
    // East wall (right)
    this.addWall(6, H / 2, 0, T, H, 10);

    // --- Interior walls ---

    // Wall between living room and kitchen/hallway (partial, with doorway)
    this.addWall(0.5, H / 2, 1.5, T, H, 3.0); // lower section
    this.addWall(0.5, H / 2, -2.5, T, H, 2.0); // upper section
    // Doorway gap from z=-1.5 to z=0 (living room to hallway)

    // Wall between kitchen and bedroom
    this.addWall(3, H / 2, -1, 6, H, T);
    // Doorway in this wall at x=1.5 (gap from x=1 to x=2)

    // Actually, let me re-do with doorways properly
    // Kitchen/bedroom divider: two segments with gap
    this.addWall(4.5, H / 2, -1, 3, H, T); // right segment
    this.addWall(1.2, H / 2, -1, 1.4, H, T); // left segment (near hallway)
    // Gap from x=1.9 to x=3.0 for doorway

    // Bathroom walls
    this.addWall(-0.5, H / 2, -2.5, T, H, 3.0); // bathroom west wall (partial)
    // Bathroom north wall is the outer north wall
    // Bathroom south wall segment
    this.addWall(0.0, H / 2, -1, 1.0, H, T);

    // Above doorways - headers
    this.addWall(0.5, H - 0.3, -0.75, T, 0.6, 1.5); // living room door header
    this.addWall(2.45, H - 0.3, -1, 1.1, 0.6, T); // bedroom door header
  }

  // --- LIVING ROOM (left side, z: -2 to 3, x: -6 to 0.5) ---
  buildLivingRoom() {
    const M = this.materials;

    // Old couch
    this.addBox(-4, 0.25, 3.5, 2.5, 0.5, 0.9, M.fabric, { hidingSpot: true, hidingRadius: 1.2, hidingType: 'under' });
    // Couch back
    this.addBox(-4, 0.65, 3.95, 2.5, 0.5, 0.15, M.fabric, { collider: false });
    // Couch arms
    this.addBox(-5.15, 0.45, 3.5, 0.2, 0.4, 0.9, M.fabric, { collider: false });
    this.addBox(-2.85, 0.45, 3.5, 0.2, 0.4, 0.9, M.fabric, { collider: false });

    // Coffee table
    this.addBox(-4, 0.2, 2.0, 1.0, 0.05, 0.6, M.wood);
    // Table legs
    for (const [dx, dz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) {
      this.addBox(-4 + dx, 0.1, 2.0 + dz, 0.04, 0.2, 0.04, M.darkWood, { collider: false });
    }

    // TV stand
    this.addBox(-4, 0.3, 0.0, 1.5, 0.6, 0.4, M.darkWood, { hidingSpot: true, hidingRadius: 0.8, hidingType: 'behind' });
    // TV (flat screen)
    this.addBox(-4, 0.9, 0.05, 1.2, 0.7, 0.05, new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.1, metalness: 0.5,
    }), { collider: false });

    // Bookshelf against west wall
    this.addBox(-5.6, 0.9, 1.0, 0.6, 1.8, 0.8, M.darkWood, { hidingSpot: true, hidingRadius: 0.6, hidingType: 'behind' });
    // Shelf dividers
    for (let sy = 0.4; sy <= 1.5; sy += 0.35) {
      this.addBox(-5.6, sy, 1.0, 0.55, 0.03, 0.75, M.wood, { collider: false });
    }

    // Standing lamp (near couch)
    const lampPole = this.addBox(-2.5, 0.7, 3.8, 0.04, 1.4, 0.04, M.metal, { collider: false });
    this.addBox(-2.5, 1.45, 3.8, 0.3, 0.2, 0.3, M.fabric, { collider: false });

    // Lamp light
    const livingLamp = new THREE.PointLight(0xffddaa, 0.4, 6);
    livingLamp.position.set(-2.5, 1.5, 3.8);
    livingLamp.castShadow = true;
    livingLamp.shadow.mapSize.set(512, 512);
    this.scene.add(livingLamp);
    this.lightSources.push({ light: livingLamp, position: livingLamp.position.clone(), type: 'lamp' });

    // Rug on the floor
    const rugGeo = new THREE.PlaneGeometry(2.5, 1.8);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x4a2020, roughness: 1.0, metalness: 0,
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-4, 0.005, 2.0);
    this.scene.add(rug);

    // Window (west wall, just a frame with dim light behind)
    this.addBox(-5.92, 1.6, 2.0, 0.05, 1.2, 1.0, M.glass, { collider: false });
    // Window frame
    this.addBox(-5.9, 1.6, 1.45, 0.08, 1.3, 0.06, M.wood, { collider: false });
    this.addBox(-5.9, 1.6, 2.55, 0.08, 1.3, 0.06, M.wood, { collider: false });
    this.addBox(-5.9, 2.25, 2.0, 0.08, 0.06, 1.1, M.wood, { collider: false });
    this.addBox(-5.9, 0.95, 2.0, 0.08, 0.06, 1.1, M.wood, { collider: false });

    // Moonlight through window
    const moonLight = new THREE.SpotLight(0x4466aa, 0.3, 8, Math.PI / 4, 0.5);
    moonLight.position.set(-6.5, 2.5, 2.0);
    moonLight.target.position.set(-3, 0, 2.0);
    this.scene.add(moonLight);
    this.scene.add(moonLight.target);
    this.lightSources.push({ light: moonLight, position: moonLight.position.clone(), type: 'window' });

    // Side table with drawer
    const drawerUnit = this.addBox(-1.5, 0.3, 4.0, 0.5, 0.6, 0.4, M.darkWood, {
      hidingSpot: true, hidingRadius: 0.4, hidingType: 'inside',
    });
    this.drawerInteractables.push({
      mesh: drawerUnit,
      position: new THREE.Vector3(-1.5, 0.3, 4.0),
      isOpen: false,
      type: 'drawer',
    });
  }

  // --- KITCHEN (right-front, x: 0.5 to 6, z: 1 to 5) ---
  buildKitchen() {
    const M = this.materials;

    // Kitchen floor (tile)
    const kitchenFloor = new THREE.PlaneGeometry(5.5, 4);
    const kf = new THREE.Mesh(kitchenFloor, M.tile);
    kf.rotation.x = -Math.PI / 2;
    kf.position.set(3.25, 0.002, 3);
    kf.receiveShadow = true;
    this.scene.add(kf);
    this.textures.tile.repeat.set(4, 3);

    // Counter along east wall
    this.addBox(5.3, 0.45, 3.0, 1.2, 0.9, 3.5, M.counter, { hidingSpot: true, hidingRadius: 0.8, hidingType: 'under' });
    // Counter top
    this.addBox(5.3, 0.92, 3.0, 1.3, 0.04, 3.7, M.counter, { collider: false });

    // Upper cabinets
    for (let z = 1.5; z <= 4.5; z += 1.0) {
      this.addBox(5.5, 2.0, z, 0.5, 0.6, 0.8, M.darkWood, { collider: false });
      this.drawerInteractables.push({
        mesh: null,
        position: new THREE.Vector3(5.5, 2.0, z),
        isOpen: false,
        type: 'cabinet',
      });
    }

    // Fridge (northeast corner)
    this.addBox(5.1, 0.9, 1.3, 0.7, 1.8, 0.7, new THREE.MeshStandardMaterial({
      color: 0xcccccc, roughness: 0.3, metalness: 0.6,
    }), { hidingSpot: true, hidingRadius: 0.5, hidingType: 'behind' });

    // Kitchen table
    this.addBox(2.5, 0.38, 3.0, 1.0, 0.04, 0.8, M.wood);
    for (const [dx, dz] of [[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]]) {
      this.addBox(2.5 + dx, 0.19, 3.0 + dz, 0.04, 0.38, 0.04, M.wood, { collider: false });
    }

    // Chairs
    for (const dz of [-0.7, 0.7]) {
      this.addBox(2.5, 0.22, 3.0 + dz, 0.4, 0.04, 0.4, M.darkWood, { collider: false });
      this.addBox(2.5, 0.5, 3.0 + dz + (dz > 0 ? 0.18 : -0.18), 0.4, 0.5, 0.04, M.darkWood, { collider: false });
    }

    // Sink area (part of counter)
    this.addBox(5.3, 0.85, 3.5, 0.6, 0.1, 0.4, M.metal, { collider: false });

    // Stove
    this.addBox(5.3, 0.9, 2.0, 0.6, 0.05, 0.6, new THREE.MeshStandardMaterial({
      color: 0x222222, roughness: 0.2, metalness: 0.8,
    }), { collider: false });

    // Kitchen ceiling light (fluorescent)
    const kitchenLight = new THREE.PointLight(0xeeeeff, 0.3, 6);
    kitchenLight.position.set(3.5, 2.6, 3.0);
    kitchenLight.castShadow = true;
    this.scene.add(kitchenLight);
    this.lightSources.push({ light: kitchenLight, position: kitchenLight.position.clone(), type: 'ceiling' });

    // Light fixture
    this.addBox(3.5, 2.65, 3.0, 0.8, 0.05, 0.15, M.metal, { collider: false });

    // Trash can (insects love it)
    const trashGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.4, 8);
    const trash = new THREE.Mesh(trashGeo, new THREE.MeshStandardMaterial({
      color: 0x333333, roughness: 0.5, metalness: 0.3,
    }));
    trash.position.set(4.5, 0.2, 4.5);
    trash.castShadow = true;
    this.scene.add(trash);
    this.hidingSpots.push({
      position: new THREE.Vector3(4.5, 0.2, 4.5),
      radius: 0.3,
      type: 'trashcan',
    });
  }

  // --- BEDROOM (right-back, x: 0.5 to 6, z: -5 to -1) ---
  buildBedroom() {
    const M = this.materials;

    // Bed
    // Frame
    this.addBox(4.0, 0.2, -3.0, 2.0, 0.4, 2.2, M.darkWood, { hidingSpot: true, hidingRadius: 1.5, hidingType: 'under' });
    // Mattress
    this.addBox(4.0, 0.45, -3.0, 1.8, 0.15, 2.0, new THREE.MeshStandardMaterial({
      color: 0x555566, roughness: 1.0,
    }), { collider: false });
    // Pillows
    this.addBox(4.0, 0.58, -4.0, 0.6, 0.1, 0.35, new THREE.MeshStandardMaterial({
      color: 0x666677, roughness: 1.0,
    }), { collider: false });
    // Headboard
    this.addBox(4.0, 0.7, -4.15, 2.0, 0.7, 0.08, M.darkWood, { collider: false });

    // Nightstand
    const nightstand = this.addBox(2.7, 0.25, -3.8, 0.4, 0.5, 0.35, M.darkWood, {
      hidingSpot: true, hidingRadius: 0.3, hidingType: 'inside',
    });
    this.drawerInteractables.push({
      mesh: nightstand,
      position: new THREE.Vector3(2.7, 0.25, -3.8),
      isOpen: false,
      type: 'drawer',
    });

    // Nightstand lamp
    this.addBox(2.7, 0.6, -3.8, 0.08, 0.2, 0.08, M.metal, { collider: false });
    this.addBox(2.7, 0.75, -3.8, 0.2, 0.12, 0.2, M.fabric, { collider: false });

    const bedroomLamp = new THREE.PointLight(0xffcc88, 0.2, 4);
    bedroomLamp.position.set(2.7, 0.8, -3.8);
    bedroomLamp.castShadow = true;
    this.scene.add(bedroomLamp);
    this.lightSources.push({ light: bedroomLamp, position: bedroomLamp.position.clone(), type: 'lamp' });

    // Wardrobe / closet
    this.addBox(5.4, 1.0, -1.7, 1.0, 2.0, 1.2, M.darkWood, {
      hidingSpot: true, hidingRadius: 0.8, hidingType: 'inside',
    });
    this.drawerInteractables.push({
      mesh: null,
      position: new THREE.Vector3(5.4, 1.0, -1.7),
      isOpen: false,
      type: 'wardrobe',
    });

    // Desk
    this.addBox(1.5, 0.38, -2.0, 1.2, 0.04, 0.6, M.wood);
    for (const [dx, dz] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) {
      this.addBox(1.5 + dx, 0.19, -2.0 + dz, 0.04, 0.38, 0.04, M.wood, { collider: false });
    }

    // Desk lamp (light source for insects!)
    this.addBox(1.2, 0.5, -2.0, 0.06, 0.2, 0.06, M.metal, { collider: false });
    const deskLamp = new THREE.PointLight(0xffffdd, 0.5, 3);
    deskLamp.position.set(1.2, 0.65, -2.0);
    deskLamp.castShadow = true;
    this.scene.add(deskLamp);
    this.lightSources.push({ light: deskLamp, position: deskLamp.position.clone(), type: 'desk_lamp' });

    // Bedroom window
    this.addBox(5.92, 1.6, -3.0, 0.05, 1.2, 1.0, M.glass, { collider: false });
    this.addBox(5.9, 1.6, -3.55, 0.08, 1.3, 0.06, M.wood, { collider: false });
    this.addBox(5.9, 1.6, -2.45, 0.08, 1.3, 0.06, M.wood, { collider: false });
    this.addBox(5.9, 2.25, -3.0, 0.08, 0.06, 1.1, M.wood, { collider: false });
    this.addBox(5.9, 0.95, -3.0, 0.08, 0.06, 1.1, M.wood, { collider: false });

    // Moon through bedroom window
    const moonLight2 = new THREE.SpotLight(0x4466aa, 0.2, 6, Math.PI / 5, 0.5);
    moonLight2.position.set(7, 2.5, -3.0);
    moonLight2.target.position.set(3, 0, -3.0);
    this.scene.add(moonLight2);
    this.scene.add(moonLight2.target);
  }

  // --- BATHROOM (center-back, x: -0.5 to -3, z: -5 to -2.5) ---
  buildBathroom() {
    const M = this.materials;

    // Bathroom walls
    this.addWall(-1.75, WALL_HEIGHT / 2, -2.5, 2.5, WALL_HEIGHT, WALL_THICKNESS);
    // West bathroom wall (segment, with door gap)
    this.addWall(-3, WALL_HEIGHT / 2, -3.5, WALL_THICKNESS, WALL_HEIGHT, 2.0);
    // Door header
    this.addWall(-0.5, WALL_HEIGHT - 0.3, -3.3, WALL_THICKNESS, 0.6, 0.8);

    // Bathroom tile floor
    const bathFloor = new THREE.PlaneGeometry(2.5, 2.5);
    const bf = new THREE.Mesh(bathFloor, M.tile);
    bf.rotation.x = -Math.PI / 2;
    bf.position.set(-1.75, 0.003, -3.75);
    bf.receiveShadow = true;
    this.scene.add(bf);

    // Bathtub
    this.addBox(-2.5, 0.3, -4.2, 1.6, 0.6, 0.7, M.porcelain, {
      hidingSpot: true, hidingRadius: 0.8, hidingType: 'inside',
    });

    // Toilet
    this.addBox(-0.8, 0.2, -4.5, 0.4, 0.4, 0.5, M.porcelain);
    this.addBox(-0.8, 0.5, -4.7, 0.35, 0.35, 0.08, M.porcelain, { collider: false });

    // Sink
    this.addBox(-1.75, 0.4, -2.7, 0.5, 0.1, 0.35, M.porcelain);
    this.addBox(-1.75, 0.2, -2.6, 0.06, 0.4, 0.06, M.metal, { collider: false });

    // Mirror
    this.addBox(-1.75, 1.4, -2.55, 0.5, 0.6, 0.03, new THREE.MeshStandardMaterial({
      color: 0x888899, roughness: 0.05, metalness: 0.9,
    }), { collider: false });

    // Bathroom light (harsh)
    const bathLight = new THREE.PointLight(0xffffff, 0.3, 4);
    bathLight.position.set(-1.75, 2.5, -3.75);
    bathLight.castShadow = true;
    this.scene.add(bathLight);
    this.lightSources.push({ light: bathLight, position: bathLight.position.clone(), type: 'ceiling' });

    // Bathroom mat
    const matGeo = new THREE.PlaneGeometry(0.6, 0.4);
    const matMat = new THREE.MeshStandardMaterial({ color: 0x334433, roughness: 1.0 });
    const mat = new THREE.Mesh(matGeo, matMat);
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(-1.5, 0.005, -3.8);
    this.scene.add(mat);

    this.hidingSpots.push({
      position: new THREE.Vector3(-2.5, 0, -4.2),
      radius: 0.6,
      type: 'bathtub',
    });
  }

  // --- HALLWAY (connecting area) ---
  buildHallway() {
    const M = this.materials;

    // Hall light (dim, flickering — set up in atmosphere)
    const hallLight = new THREE.PointLight(0xffddaa, 0.15, 5);
    hallLight.position.set(0, 2.5, -0.5);
    hallLight.castShadow = true;
    this.scene.add(hallLight);
    this.lightSources.push({
      light: hallLight,
      position: hallLight.position.clone(),
      type: 'ceiling',
      flicker: true,
    });

    // Hall light fixture
    this.addBox(0, 2.6, -0.5, 0.15, 0.08, 0.15, M.glass, { collider: false });

    // Shoe rack
    this.addBox(-3, 0.15, 4.5, 0.8, 0.3, 0.3, M.darkWood, {
      hidingSpot: true, hidingRadius: 0.5, hidingType: 'inside',
    });

    // Coat rack
    this.addBox(-5.5, 1.0, 4.5, 0.04, 2.0, 0.04, M.metal, { collider: false });

    // Front door (south wall)
    this.addBox(-3, WALL_HEIGHT / 2, 4.94, 0.9, WALL_HEIGHT, 0.05, M.darkWood);
    // Door handle
    this.addBox(-2.6, 1.0, 4.88, 0.08, 0.04, 0.04, M.metal, { collider: false });

    // Baseboards throughout (subtle detail)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a1f15, roughness: 0.8 });
    // North wall baseboard
    this.addBox(0, 0.04, -4.94, 11.8, 0.08, 0.02, baseMat, { collider: false });
    // South wall baseboard
    this.addBox(0, 0.04, 4.94, 11.8, 0.08, 0.02, baseMat, { collider: false });
    // West wall baseboard
    this.addBox(-5.94, 0.04, 0, 0.02, 0.08, 9.8, baseMat, { collider: false });
    // East wall baseboard
    this.addBox(5.94, 0.04, 0, 0.02, 0.08, 9.8, baseMat, { collider: false });
  }

  getColliders() {
    return [...this.colliders, ...this.furnitureColliders];
  }

  getHidingSpots() {
    return this.hidingSpots;
  }

  getLightSources() {
    return this.lightSources;
  }

  getDrawerInteractables() {
    return this.drawerInteractables;
  }
}

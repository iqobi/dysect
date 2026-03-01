import * as THREE from 'three';

// Procedural texture generators — no external assets needed
export function createNoiseTexture(width, height, baseColor, variation) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = (Math.random() - 0.5) * variation;
      ctx.fillStyle = `rgb(${clamp(r + v)},${clamp(g + v)},${clamp(b + v)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base wood color
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, 256, 256);

  // Wood grain lines
  for (let i = 0; i < 60; i++) {
    const y = Math.random() * 256;
    const alpha = 0.05 + Math.random() * 0.15;
    ctx.strokeStyle = `rgba(${20 + Math.random() * 30}, ${15 + Math.random() * 20}, ${5 + Math.random() * 15}, ${alpha})`;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < 256; x += 10) {
      ctx.lineTo(x, y + Math.sin(x * 0.02) * 3 + (Math.random() - 0.5) * 2);
    }
    ctx.stroke();
  }

  // Knots
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 3 + Math.random() * 8;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(20,12,5,0.6)');
    grad.addColorStop(1, 'rgba(20,12,5,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const tileSize = 64;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const brightness = 160 + Math.random() * 30;
      ctx.fillStyle = `rgb(${brightness}, ${brightness - 5}, ${brightness - 10})`;
      ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
    }
  }

  // Grout lines
  ctx.fillStyle = '#2a2520';
  for (let i = 0; i <= 4; i++) {
    ctx.fillRect(0, i * tileSize, 256, 2);
    ctx.fillRect(i * tileSize, 0, 2, 256);
  }

  // Grime
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = `rgba(30,20,10,${Math.random() * 0.15})`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createWallpaperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Faded greenish wallpaper
  ctx.fillStyle = '#3a3d2e';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle pattern
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = `rgba(60,65,50,${0.2 + Math.random() * 0.1})`;
        const cx = x * 32 + 16;
        const cy = y * 32 + 16;
        ctx.beginPath();
        ctx.arc(cx, cy, 8 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Peeling / damage spots
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 5 + Math.random() * 15;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(50,45,35,0.4)');
    grad.addColorStop(1, 'rgba(50,45,35,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createCarpetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2a1f1a';
  ctx.fillRect(0, 0, 256, 256);

  // Carpet fibers
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const len = 2 + Math.random() * 4;
    const angle = Math.random() * Math.PI;
    ctx.strokeStyle = `rgba(${35 + Math.random() * 20}, ${25 + Math.random() * 15}, ${18 + Math.random() * 10}, 0.3)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Stain
  const sx = 100 + Math.random() * 56;
  const sy = 100 + Math.random() * 56;
  const sr = 15 + Math.random() * 20;
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
  grad.addColorStop(0, 'rgba(20,12,8,0.3)');
  grad.addColorStop(1, 'rgba(20,12,8,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createCeilingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d5d0c5';
  ctx.fillRect(0, 0, 128, 128);

  // Popcorn ceiling texture
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const r = 0.5 + Math.random() * 1.5;
    const b = 190 + Math.random() * 30;
    ctx.fillStyle = `rgb(${b},${b - 5},${b - 10})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Water stain
  if (Math.random() > 0.5) {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 40);
    grad.addColorStop(0, 'rgba(160,140,100,0.15)');
    grad.addColorStop(1, 'rgba(160,140,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

import * as THREE from 'three';

export class Atmosphere {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.audioCtx = null;
    this.audioInitialized = false;
    this.sounds = {};
    this.flickerLights = [];
    this.time = 0;

    // Fog for creepy atmosphere
    this.scene.fog = new THREE.FogExp2(0x0a0808, 0.08);
    this.scene.background = new THREE.Color(0x050404);

    // Ambient light (very dim)
    this.ambientLight = new THREE.AmbientLight(0x1a1520, 0.15);
    this.scene.add(this.ambientLight);

    // Subtle vignette/darkness overlay handled by CSS

    this.setupPostProcessing();
  }

  setupPostProcessing() {
    // We'll do a simple CSS-based vignette instead of post-processing
    // to keep performance high
    const vignette = document.createElement('div');
    vignette.id = 'vignette';
    vignette.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 40;
      background: radial-gradient(ellipse at center,
        transparent 50%,
        rgba(0,0,0,0.3) 75%,
        rgba(0,0,0,0.7) 100%
      );
    `;
    document.body.appendChild(vignette);

    // Subtle grain overlay
    const grain = document.createElement('div');
    grain.id = 'grain';
    grain.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 41;
      opacity: 0.05; mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    `;
    document.body.appendChild(grain);
  }

  initAudio() {
    if (this.audioInitialized) return;

    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.audioInitialized = true;
      this.createSounds();
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  createSounds() {
    if (!this.audioCtx) return;

    // === AMBIENT DRONE (relaxing but eerie) ===
    this.createAmbientDrone();

    // === VACUUM SOUND ===
    this.vacuumOsc = null;
    this.vacuumGain = this.audioCtx.createGain();
    this.vacuumGain.gain.value = 0;
    this.vacuumGain.connect(this.audioCtx.destination);

    // === FOOTSTEP SYSTEM ===
    this.lastFootstepTime = 0;

    // === SATISFYING VACUUM FEEDBACK ===
    this.suckGain = this.audioCtx.createGain();
    this.suckGain.gain.value = 0;
    this.suckGain.connect(this.audioCtx.destination);
  }

  createAmbientDrone() {
    const ctx = this.audioCtx;

    // Low drone
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55; // Low A
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.03;

    // Sub bass wobble
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(drone.frequency);

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 2;

    drone.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(ctx.destination);

    drone.start();
    lfo.start();

    // Higher harmonic for eeriness
    const harmonic = ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.value = 165;
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.008;
    harmonic.connect(harmonicGain);
    harmonicGain.connect(ctx.destination);
    harmonic.start();

    // Wind noise
    this.createWindNoise();

    this.sounds.drone = { drone, droneGain, harmonic, harmonicGain };
  }

  createWindNoise() {
    const ctx = this.audioCtx;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.value = 0.008;

    // LFO for wind gusts
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.005;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    lfo.start();
  }

  // === VACUUM SOUNDS ===
  startVacuumSound() {
    if (!this.audioCtx) return;

    if (!this.vacuumOsc) {
      this.vacuumOsc = this.audioCtx.createOscillator();
      this.vacuumOsc.type = 'sawtooth';
      this.vacuumOsc.frequency.value = 80;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.Q.value = 3;

      // White noise component
      const bufferSize = this.audioCtx.sampleRate;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      this.vacuumNoise = this.audioCtx.createBufferSource();
      this.vacuumNoise.buffer = buffer;
      this.vacuumNoise.loop = true;

      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 500;
      noiseFilter.Q.value = 1;

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.value = 0.08;

      this.vacuumOsc.connect(filter);
      filter.connect(this.vacuumGain);

      this.vacuumNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.vacuumGain);

      this.vacuumOsc.start();
      this.vacuumNoise.start();
    }

    this.vacuumGain.gain.linearRampToValueAtTime(0.08, this.audioCtx.currentTime + 0.2);
  }

  stopVacuumSound() {
    if (!this.audioCtx || !this.vacuumGain) return;
    this.vacuumGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.3);
  }

  // === SATISFYING SUCK SOUND (when insect is captured) ===
  playSuckSound() {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Descending tone (satisfying slurp)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // Pop at the end
    const pop = ctx.createOscillator();
    pop.type = 'sine';
    pop.frequency.value = 200;
    const popGain = ctx.createGain();
    popGain.gain.setValueAtTime(0, now + 0.25);
    popGain.gain.linearRampToValueAtTime(0.1, now + 0.28);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    pop.connect(popGain);
    popGain.connect(ctx.destination);
    pop.start(now + 0.25);
    pop.stop(now + 0.4);
  }

  // === FOOTSTEP SOUND ===
  playFootstep() {
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    if (now - this.lastFootstepTime < 0.4) return;
    this.lastFootstepTime = now;

    const ctx = this.audioCtx;

    // Low thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60 + Math.random() * 20, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // === INSECT SOUND ===
  playInsectSound(type, position, playerPos) {
    if (!this.audioCtx) return;

    const dist = position.distanceTo(playerPos);
    if (dist > 6) return;

    const volume = Math.max(0, 0.04 * (1 - dist / 6));
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    gain.connect(ctx.destination);

    switch (type) {
      case 'skitter': {
        // Rapid clicking
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.value = 2000 + Math.random() * 3000;
          const g = ctx.createGain();
          g.gain.setValueAtTime(volume * 0.3, now + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.03);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.03);
        }
        break;
      }
      case 'buzz': {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 180 + Math.random() * 40;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 300;
        osc.connect(filter);
        filter.connect(gain);
        osc.start(now);
        osc.stop(now + 0.2 + Math.random() * 0.3);
        break;
      }
      case 'chirp': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(4000, now);
        osc.frequency.setValueAtTime(4500, now + 0.05);
        osc.frequency.setValueAtTime(4000, now + 0.1);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'flutter': {
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.1) * 0.3;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        noise.connect(filter);
        filter.connect(gain);
        noise.start(now);
        break;
      }
    }
  }

  // === SCARE STING (when insect jumps at you) ===
  playScareString(intensity) {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const vol = 0.05 + intensity * 0.1;

    // Dissonant chord
    for (const freq of [180, 213, 320, 480]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  }

  // === LEVEL COMPLETE JINGLE ===
  playLevelComplete() {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Pleasant ascending arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.1, now + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.5);
    });
  }

  // === EGG HATCH WARNING ===
  playEggWarning() {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Wet, organic crackling
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 100;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 5;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // === LIGHT FLICKERING ===
  registerFlickerLight(lightSource) {
    this.flickerLights.push(lightSource);
  }

  update(delta, playerMoving, vacuumActive) {
    this.time += delta;

    // Flicker lights
    for (const ls of this.flickerLights) {
      if (ls.flicker) {
        const baseIntensity = ls.light.intensity;
        // Random flicker
        if (Math.random() < 0.02) {
          ls.light.intensity = baseIntensity * (0.2 + Math.random() * 0.3);
        } else {
          ls.light.intensity += (0.15 - ls.light.intensity) * delta * 2;
        }
      }
    }

    // Ambient intensity shifts over time (breathing effect)
    this.ambientLight.intensity = 0.12 + Math.sin(this.time * 0.3) * 0.03;

    // Vacuum sound management
    if (vacuumActive) {
      this.startVacuumSound();
    } else {
      this.stopVacuumSound();
    }

    // Footsteps
    if (playerMoving) {
      this.playFootstep();
    }

    // Grain animation
    const grain = document.getElementById('grain');
    if (grain) {
      grain.style.transform = `translate(${Math.random() * 10}px, ${Math.random() * 10}px)`;
    }
  }
}

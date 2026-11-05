import * as THREE from 'three';

type Synth = (t: number, noise: () => number) => number;

/** Todo el sonido se sintetiza al arrancar: no hay archivos de audio. */
export class Sound {
  readonly listener = new THREE.AudioListener();
  private readonly buffers = new Map<string, AudioBuffer>();
  private started = false;
  private breathAt = 0;

  constructor(
    private readonly camera: THREE.Camera,
    private readonly scene: THREE.Scene,
  ) {}

  /** Debe llamarse dentro de un gesto del usuario (clic o tecla). */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.camera.add(this.listener);
    const ctx = this.listener.context;
    void ctx.resume();

    this.make('knock', 0.5, (t, n) => {
      const thump = Math.sin(2 * Math.PI * 92 * t) * Math.exp(-t * 20);
      const ring = Math.sin(2 * Math.PI * 412 * t) * Math.exp(-t * 13) * 0.28 + Math.sin(2 * Math.PI * 1130 * t) * Math.exp(-t * 32) * 0.12;
      return 0.9 * thump + ring + n() * Math.exp(-t * 110) * 0.6;
    });
    this.make('door', 1.4, (t, n) => {
      const env = Math.min(1, t * 6) * Math.exp(-t * 1.6);
      return (n() * 0.35 + Math.sin(2 * Math.PI * (55 - t * 12) * t) * 0.7) * env;
    }, 0.06);
    this.make('beep', 0.16, (t) => Math.sin(2 * Math.PI * 880 * t) * Math.min(1, (0.16 - t) * 40) * 0.5);
    this.make('chime', 0.9, (t) => {
      const a = Math.sin(2 * Math.PI * 523 * t) * Math.exp(-t * 5);
      const b = t > 0.14 ? Math.sin(2 * Math.PI * 784 * (t - 0.14)) * Math.exp(-(t - 0.14) * 5) : 0;
      return (a + b) * 0.25;
    });
    this.make('pickup', 0.18, (t, n) => (Math.sin(2 * Math.PI * 300 * t) * 0.5 + n() * 0.2) * Math.exp(-t * 30));
    this.make('place', 0.35, (t) => (Math.sin(2 * Math.PI * 140 * t) + Math.sin(2 * Math.PI * 660 * t) * 0.3) * Math.exp(-t * 14) * 0.7);
    this.make('whoosh', 0.35, (t, n) => n() * Math.sin(Math.PI * (t / 0.35)) * 0.5, 0.25);
    this.make('success', 1.1, (t) => {
      let s = 0;
      [523, 659, 784].forEach((f, i) => {
        const t0 = i * 0.12;
        if (t > t0) s += Math.sin(2 * Math.PI * f * (t - t0)) * Math.exp(-(t - t0) * 3.5);
      });
      return s * 0.22;
    });
    this.make('fail', 1.2, (t) => (Math.sin(2 * Math.PI * (180 - t * 60) * t) * 0.5 + Math.sin(2 * Math.PI * 90 * t) * 0.4) * Math.exp(-t * 2.2) * 0.6);
    this.make('sealed', 2.2, (t, n) => {
      const swell = Math.min(1, t / 1.2) * Math.exp(-Math.max(0, t - 1.2) * 4);
      return n() * swell * 0.5 + Math.sin(2 * Math.PI * 48 * t) * Math.exp(-t * 1.5) * 0.6;
    }, 0.4);
    this.make('breath', 1.3, (t, n) => n() * Math.sin(Math.PI * (t / 1.3)) ** 2 * 0.35, 0.08);
    this.make('sizzle', 0.25, (t, n) => n() * Math.exp(-t * 10) * 0.3, 0.9);

    // Zumbido constante de la estructura.
    const hum = ctx.createGain();
    hum.gain.value = 0.035;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    for (const f of [49, 49.6, 98.3]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = f;
      osc.connect(lp);
      osc.start();
    }
    lp.connect(hum);
    hum.connect(this.listener.getInput());
  }

  /** Genera un buffer. `lowpass` (0..1) suaviza el ruido: valores bajos lo hacen más grave. */
  private make(name: string, seconds: number, synth: Synth, lowpass = 1): void {
    const ctx = this.listener.context;
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buf.getChannelData(0);
    let last = 0;
    const noise = () => {
      last += (Math.random() * 2 - 1 - last) * lowpass;
      return last;
    };
    for (let i = 0; i < data.length; i++) data[i] = synth(i / rate, noise);
    this.buffers.set(name, buf);
  }

  play(name: string, volume = 1): void {
    const buf = this.buffers.get(name);
    if (!buf) return;
    const a = new THREE.Audio(this.listener);
    a.setBuffer(buf);
    a.setVolume(volume);
    a.play();
  }

  playAt(name: string, pos: THREE.Vector3, volume = 1): void {
    const buf = this.buffers.get(name);
    if (!buf) return;
    const holder = new THREE.Object3D();
    holder.position.copy(pos);
    const a = new THREE.PositionalAudio(this.listener);
    a.setBuffer(buf);
    a.setRefDistance(2.5);
    a.setRolloffFactor(0.8);
    a.setDistanceModel('inverse');
    a.setVolume(volume);
    a.panner.panningModel = 'HRTF';
    holder.add(a);
    this.scene.add(holder);
    const ended = a.onEnded.bind(a);
    a.onEnded = () => {
      ended();
      holder.removeFromParent();
      a.disconnect();
    };
    a.play();
  }

  /** Respiración agitada cuando queda poco aire. */
  updateBreath(now: number, air: number, alive: boolean): void {
    if (!alive || air > 30) return;
    const period = air < 12 ? 1.1 : 1.8;
    if (now - this.breathAt < period) return;
    this.breathAt = now;
    this.play('breath', air < 12 ? 0.9 : 0.55);
  }
}

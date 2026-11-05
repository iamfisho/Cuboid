import * as THREE from 'three';

export const FONT = "'Inter', 'Segoe UI', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";

/** Concreto con ruido y juntas de panel. Una repetición equivale a 3 m. */
export function concreteTexture(base: string, seams = true): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 90; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 20 + rnd() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + rnd() * 0.06;
    const dark = rnd() > 0.5;
    grad.addColorStop(0, dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.6})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 22;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  if (seams) {
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, 0, size, 3);
    g.fillRect(0, 0, 3, size);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, size / 2, size, 2);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    for (const [x, y] of [
      [40, 40],
      [size - 40, 40],
      [40, size - 40],
      [size - 40, size - 40],
    ]) {
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Caja cuyas UV dependen de su tamaño, para que la textura no se estire. */
export function worldBoxGeometry(w: number, h: number, d: number, metersPerRepeat = 3): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada una).
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let face = 0; face < 6; face++) {
    const [su, sv] = dims[face];
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      uv.setXY(i, (uv.getX(i) * su) / metersPerRepeat, (uv.getY(i) * sv) / metersPerRepeat);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export class CanvasPanel {
  readonly canvas: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.g = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  commit(): void {
    this.texture.needsUpdate = true;
  }
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Ajusta texto a un ancho dado, partiéndolo en líneas. */
export function wrapText(g: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Textura con un texto centrado, para numerales grabados y etiquetas. */
export function labelTexture(text: string, opts: { color?: string; bg?: string; size?: number; w?: number; h?: number } = {}) {
  const panel = new CanvasPanel(opts.w ?? 256, opts.h ?? 256);
  const { g } = panel;
  g.fillStyle = opts.bg ?? 'rgba(0,0,0,0)';
  g.clearRect(0, 0, panel.width, panel.height);
  if (opts.bg) g.fillRect(0, 0, panel.width, panel.height);
  g.fillStyle = opts.color ?? '#e8edf2';
  g.font = `700 ${opts.size ?? 140}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, panel.width / 2, panel.height / 2 + 4);
  panel.commit();
  return panel.texture;
}

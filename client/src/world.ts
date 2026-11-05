import * as THREE from 'three';
import {
  CELL,
  CELL_CENTERS,
  CELL_NUMERALS,
  CUBE_EDGES,
  CUBE_VERTICES,
  DIRS,
  DOOR_H,
  HALF,
  PLAYER_CELLS,
  TRIAL_TYPES,
  WALL,
  cellPoint,
  ceilingBox,
  doorCenter,
  doorSlab,
  staticPieces,
  type Box,
  type TrialType,
} from '@cuboid/shared';
import { concreteTexture, labelTexture, worldBoxGeometry } from './textures';

function boxMesh(b: Box, mat: THREE.Material): THREE.Mesh {
  const w = b.max.x - b.min.x;
  const h = b.max.y - b.min.y;
  const d = b.max.z - b.min.z;
  const mesh = new THREE.Mesh(worldBoxGeometry(w, h, d), mat);
  mesh.position.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);
  return mesh;
}

/** La estructura: celdas, puertas, techos móviles y el lenguaje de luces del cubo. */
export class CubeWorld {
  readonly group = new THREE.Group();
  /** Superficies que se pueden golpear. */
  readonly knockable: THREE.Object3D[] = [];
  readonly doors: THREE.Mesh[] = [];
  readonly ceilings: THREE.Mesh[] = [];
  readonly floors: THREE.Mesh[] = [];
  readonly doorOpen = [0, 0, 0, 0];
  readonly ceilingHeight = CELL_CENTERS.map(() => CELL);

  private readonly edgeMeshes: THREE.Mesh[][] = [];
  private readonly vertexMeshes: THREE.Mesh[][] = [];
  private readonly lights: THREE.PointLight[] = [];
  private readonly edgeOn: THREE.MeshStandardMaterial;
  private readonly edgeOff: THREE.MeshStandardMaterial;
  private readonly vertexOn: THREE.MeshStandardMaterial;
  private readonly lightColor = new THREE.Color(0xffffff);
  private lightLevel = 0.55;
  private targetLevel = 0.55;
  private flicker = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    const wallTex = concreteTexture('#6c7078');
    const floorTex = concreteTexture('#4f535a');
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0xa4aab4, roughness: 0.94, metalness: 0.04 });
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, color: 0x9298a2, roughness: 0.9, metalness: 0.08 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.42, metalness: 0.75 });
    const ceilMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0x7c828c, roughness: 0.95 });

    this.edgeOn = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 2.4 });
    this.edgeOff = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.6, metalness: 0.5 });
    this.vertexOn = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 4.5 });

    for (const piece of staticPieces()) {
      const mesh = boxMesh(piece.box, piece.kind === 'floor' || piece.kind === 'threshold' ? floorMat : wallMat);
      this.group.add(mesh);
      if (piece.kind === 'wall' || piece.kind === 'lintel') this.knockable.push(mesh);
      if (piece.kind === 'floor') this.floors[piece.cell] = mesh;
    }

    for (const i of PLAYER_CELLS) {
      const mesh = boxMesh(doorSlab(i, 0), doorMat);
      this.doors.push(mesh);
      this.knockable.push(mesh);
      this.group.add(mesh);
      this.addDoorFrame(i);
    }

    for (let cell = 0; cell < CELL_CENTERS.length; cell++) {
      const mesh = boxMesh(ceilingBox(cell, CELL), ceilMat);
      this.ceilings.push(mesh);
      this.group.add(mesh);
      this.addCellLights(cell);
    }

    for (const cell of PLAYER_CELLS) this.addNumerals(cell);

    const hemi = new THREE.HemisphereLight(0x8fa3bf, 0x0b0c10, 0.22);
    scene.add(hemi);
  }

  private addDoorFrame(i: number): void {
    const c = doorCenter(i);
    const d = DIRS[i];
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x9fb0c8, emissiveIntensity: 0.6 });
    const along = d.x === 0 ? 'x' : 'z';
    const t = WALL + 0.02;
    const parts: [number, number, number, number, number, number][] = [
      // [centro a lo largo, y, ancho, alto] para los dos postes y el dintel
      [-0.84, DOOR_H / 2, 0.05, DOOR_H, 0, 0],
      [0.84, DOOR_H / 2, 0.05, DOOR_H, 0, 0],
      [0, DOOR_H + 0.03, 1.73, 0.05, 0, 0],
    ];
    for (const [a, y, w, h] of parts) {
      const geo = along === 'x' ? new THREE.BoxGeometry(w, h, t) : new THREE.BoxGeometry(t, h, w);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(c.x + (along === 'x' ? a : 0), y, c.z + (along === 'z' ? a : 0));
      this.group.add(m);
    }
  }

  private addCellLights(cell: number): void {
    const c = CELL_CENTERS[cell];
    const inset = 0.05;
    const corner = (v: readonly [number, number, number]) =>
      new THREE.Vector3(
        c.x + v[0] * (HALF - inset),
        v[1] < 0 ? inset : CELL - inset,
        c.z + v[2] * (HALF - inset),
      );
    const edges: THREE.Mesh[] = [];
    for (const [a, b] of CUBE_EDGES) {
      const pa = corner(CUBE_VERTICES[a]);
      const pb = corner(CUBE_VERTICES[b]);
      const len = pa.distanceTo(pb);
      const geo = new THREE.BoxGeometry(0.07, 0.07, len - 0.2);
      const mesh = new THREE.Mesh(geo, this.edgeOff);
      mesh.position.copy(pa).add(pb).multiplyScalar(0.5);
      mesh.lookAt(pb);
      this.group.add(mesh);
      edges.push(mesh);
    }
    this.edgeMeshes.push(edges);
    const verts: THREE.Mesh[] = [];
    const vgeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    for (const v of CUBE_VERTICES) {
      const mesh = new THREE.Mesh(vgeo, this.edgeOff);
      mesh.position.copy(corner(v));
      this.group.add(mesh);
      verts.push(mesh);
    }
    this.vertexMeshes.push(verts);

    const light = new THREE.PointLight(0xffffff, 10, 16, 1.7);
    light.position.set(c.x, CELL - 0.9, c.z);
    this.group.add(light);
    this.lights.push(light);
  }

  /** Numerales grabados: dentro de cada celda y sobre su puerta, del lado del centro. */
  private addNumerals(cell: number): void {
    const text = CELL_NUMERALS[cell];
    const tex = labelTexture(text, { color: '#cfd6df', size: 170, w: 512, h: 256 });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, toneMapped: false });
    const d = DIRS[cell];
    const r = { x: -d.z, z: d.x };
    // Pared izquierda (mirando al fondo).
    const left = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), mat);
    const pL = cellPoint(cell, 0.6, -(HALF - 0.02));
    left.position.set(pL.x, 3.6, pL.z);
    left.lookAt(pL.x + r.x, 3.6, pL.z + r.z);
    this.group.add(left);
    // Sobre la puerta, visto desde la celda central.
    const dc = doorCenter(cell);
    const above = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), mat);
    const off = WALL / 2 + 0.02;
    above.position.set(dc.x - d.x * off, DOOR_H + 0.75, dc.z - d.z * off);
    above.lookAt(dc.x - d.x * 5, DOOR_H + 0.75, dc.z - d.z * 5);
    this.group.add(above);
  }

  /** Enciende el lenguaje del cubo: color = tipo, aristas = dificultad, vértices = jugadores. */
  setLights(type: TrialType | null, edges: number, vertices: number): void {
    const color = type ? TRIAL_TYPES[type].color : 0xdfe6ee;
    this.edgeOn.emissive.setHex(color);
    this.vertexOn.emissive.setHex(color);
    this.lightColor.setHex(type ? color : 0xc9d4e2);
    // Los colores claros (amarillo, verde) iluminan mucho más que los oscuros: se compensa por luminancia.
    const c = new THREE.Color(color);
    const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    this.targetLevel = type ? Math.min(1.4, Math.max(0.6, 0.45 / lum)) : 0.55;
    for (const cellEdges of this.edgeMeshes) cellEdges.forEach((m, k) => (m.material = k < edges ? this.edgeOn : this.edgeOff));
    for (const cellVerts of this.vertexMeshes) cellVerts.forEach((m, k) => (m.material = k < vertices ? this.vertexOn : this.edgeOff));
  }

  /** Breve parpadeo de todas las luces (reconfiguración, eliminaciones). */
  pulse(): void {
    this.flicker = 0.6;
  }

  update(dt: number, doors: readonly number[], ceilings: readonly number[], tilt: readonly { x: number; z: number }[]): void {
    const k = 1 - Math.exp(-dt * 10);
    for (const i of PLAYER_CELLS) {
      this.doorOpen[i] += ((doors[i] ?? 0) - this.doorOpen[i]) * k;
      this.doors[i].position.y = DOOR_H / 2 + this.doorOpen[i] * DOOR_H;
      const t = tilt[i] ?? { x: 0, z: 0 };
      const f = this.floors[i];
      f.rotation.x += (t.z * 0.02 - f.rotation.x) * k;
      f.rotation.z += (-t.x * 0.02 - f.rotation.z) * k;
    }
    for (let c = 0; c < this.ceilings.length; c++) {
      this.ceilingHeight[c] += ((ceilings[c] ?? CELL) - this.ceilingHeight[c]) * k;
      this.ceilings[c].position.y = this.ceilingHeight[c] + WALL / 2;
    }
    this.lightLevel += (this.targetLevel - this.lightLevel) * (1 - Math.exp(-dt * 3));
    this.flicker = Math.max(0, this.flicker - dt);
    const flick = this.flicker > 0 ? (Math.sin(this.flicker * 70) > 0 ? 0.25 : 1) : 1;
    for (const light of this.lights) {
      light.color.copy(this.lightColor);
      light.intensity = 16 * this.lightLevel * flick;
    }
  }
}

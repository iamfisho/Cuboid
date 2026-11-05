import { CELL_NUMERALS, type ResultEntry, type Snapshot } from '@cuboid/shared';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

/** Capa HTML: pantalla de título, subtítulos del Anfitrión, pistas de interacción y resultados. */
export class UI {
  readonly title = $<HTMLElement>('#title');
  readonly form = $<HTMLFormElement>('#joinForm');
  readonly nameInput = $<HTMLInputElement>('#name');
  readonly again = $<HTMLButtonElement>('#again');
  private readonly joinError = $<HTMLElement>('#joinError');
  private readonly results = $<HTMLElement>('#results');
  private readonly lobby = $<HTMLElement>('#lobby');
  private readonly subtitles = $<HTMLElement>('#subtitles');
  private readonly subLine = $<HTMLElement>('#subtitles .line');
  private readonly card = $<HTMLElement>('#card');
  private readonly hint = $<HTMLElement>('#hint');
  private readonly vignette = $<HTMLElement>('#vignette');
  private readonly flashEl = $<HTMLElement>('#flash');
  private readonly dead = $<HTMLElement>('#dead');
  private readonly lockHint = $<HTMLElement>('#lockHint');
  private readonly debug = $<HTMLElement>('#debug');

  private queue: string[] = [];
  private lineUntil = 0;
  private cardUntil = 0;
  private flashLevel = 0;
  private hintHtml = '';
  private lobbyKey = '';

  constructor() {
    try {
      this.nameInput.value = localStorage.getItem('cuboid:name') ?? '';
    } catch {
      /* almacenamiento no disponible */
    }
    if (matchMedia('(pointer: coarse)').matches) {
      $<HTMLElement>('#touchNote').textContent = 'Este prototipo requiere teclado y mouse.';
    }
  }

  rememberName(name: string): void {
    try {
      localStorage.setItem('cuboid:name', name);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  setJoining(joining: boolean): void {
    this.form.querySelector('button')!.disabled = joining;
    this.nameInput.disabled = joining;
  }

  error(msg: string): void {
    this.joinError.textContent = msg;
  }

  hideTitle(): void {
    this.title.hidden = true;
  }

  host(lines: string[]): void {
    this.queue.push(...lines);
  }

  showCard(sym: string, over: string, name: string, meta: string, color: string): void {
    this.card.querySelector<HTMLElement>('.sym')!.textContent = sym;
    this.card.querySelector<HTMLElement>('.sym')!.style.color = color;
    this.card.querySelector<HTMLElement>('.over')!.textContent = over;
    this.card.querySelector<HTMLElement>('.name')!.textContent = name;
    this.card.querySelector<HTMLElement>('.meta')!.textContent = meta;
    this.card.classList.add('show');
    this.cardUntil = performance.now() + 3600;
  }

  setHint(html: string): void {
    if (html === this.hintHtml) return;
    this.hintHtml = html;
    this.hint.innerHTML = html;
  }

  setLobby(s: Snapshot | null): void {
    if (!s || s.phase !== 'lobby') {
      this.lobby.hidden = true;
      this.lobbyKey = '';
      return;
    }
    const key = JSON.stringify(s.roster) + s.me.id;
    this.lobby.hidden = false;
    if (key === this.lobbyKey) return;
    this.lobbyKey = key;
    const ul = this.lobby.querySelector('ul')!;
    ul.replaceChildren(
      ...[...s.roster]
        .sort((a, b) => a.cell - b.cell)
        .map((r) => {
          const li = document.createElement('li');
          if (r.id === s.me.id) li.className = 'me';
          const cell = document.createElement('span');
          cell.className = 'cell';
          cell.textContent = CELL_NUMERALS[r.cell];
          const who = document.createElement('span');
          who.className = 'who';
          who.textContent = r.id === s.me.id ? `${r.name} (tú)` : r.name;
          const st = document.createElement('span');
          st.className = r.ready ? 'st ok' : 'st';
          st.textContent = r.ready ? 'listo' : 'esperando';
          li.append(cell, who, st);
          return li;
        }),
    );
    this.lobby.querySelector<HTMLElement>('.note')!.textContent = s.me.ready
      ? 'Esperando a que todos estén listos. Enter para cancelar.'
      : 'Presiona Enter cuando estés listo.';
  }

  setAir(air: number, alive: boolean): void {
    const v = alive ? Math.max(0, Math.min(1, (40 - air) / 40)) : 0;
    this.vignette.style.opacity = String(v * 0.95);
  }

  flash(level = 1): void {
    this.flashLevel = Math.max(this.flashLevel, level);
  }

  showDead(dead: boolean): void {
    this.dead.hidden = !dead;
  }

  showLockHint(show: boolean): void {
    this.lockHint.hidden = !show;
  }

  showResults(results: ResultEntry[], meId: string): void {
    const tbody = this.results.querySelector('tbody')!;
    tbody.replaceChildren(
      ...[...results]
        .sort((a, b) => a.cell - b.cell)
        .map((r) => {
          const tr = document.createElement('tr');
          const c = document.createElement('td');
          c.textContent = CELL_NUMERALS[r.cell];
          const n = document.createElement('td');
          n.textContent = r.id === meId ? `${r.name} (tú)` : r.name;
          const o = document.createElement('td');
          o.className = r.escaped ? 'out' : 'out dead';
          o.textContent = r.escaped ? `Salió · ${r.air} s de aire` : r.detail || 'Sellado';
          tr.append(c, n, o);
          return tr;
        }),
    );
    this.results.hidden = false;
  }

  setDebug(text: string | null): void {
    this.debug.hidden = text === null;
    if (text !== null) this.debug.textContent = text;
  }

  get debugVisible(): boolean {
    return !this.debug.hidden;
  }

  update(now: number, dt: number): void {
    if (now > this.lineUntil) {
      const next = this.queue.shift();
      if (next) {
        this.subLine.textContent = next;
        this.subtitles.classList.add('show');
        this.lineUntil = now + Math.max(2300, next.length * 62);
      } else {
        this.subtitles.classList.remove('show');
      }
    }
    if (now > this.cardUntil) this.card.classList.remove('show');
    this.flashLevel = Math.max(0, this.flashLevel - dt * 0.8);
    this.flashEl.style.opacity = String(this.flashLevel);
  }
}

/**
 * JSChip — A lightweight, customizable chip/tag library.
 * Plain JavaScript, zero dependencies.
 *
 * Usage:
 *   const chips = new JSChip('#container', { closable: true, draggable: true });
 *   const chip  = chips.create({ label: 'Hello', level: 'info' });
 *
 * Events:  chip:create | chip:remove | chip:click | chip:dragstart | chip:dragend | chip:drop
 */

const JSChip = (() => {

  // ── Constants ──────────────────────────────────────────────────────────────

  const LEVELS = ['default', 'info', 'warning', 'error', 'success', 'disabled'];

  // ── Utilities ──────────────────────────────────────────────────────────────

  let _uid = 0;
  const uid = () => `jsc-${++_uid}-${Math.random().toString(36).slice(2, 6)}`;

  // ── Chip ──────────────────────────────────────────────────────────────────

  class Chip {
    /**
     * @param {object} options
     * @param {string}  [options.id]        — explicit id (auto-generated if omitted)
     * @param {string}  [options.label]     — chip text
     * @param {string}  [options.level]     — 'default' | 'info' | 'warning' | 'error' | 'success' | 'disabled'
     * @param {boolean} [options.closable]  — show close button (default: true)
     * @param {boolean} [options.draggable] — enable drag-and-drop (default: true)
     * @param {string}  [options.icon]      — optional icon/emoji prefix
     * @param {string}  [options.className] — extra CSS classes
     * @param {object}  [options.data]      — arbitrary user data stored on the chip
     * @param {JSChipManager} manager
     */
    constructor(options = {}, manager) {
      this._manager  = manager;
      this.id        = options.id || uid();
      this.label     = options.label ?? 'Chip';
      this.level     = LEVELS.includes(options.level) ? options.level : 'default';
      this.closable  = options.closable !== false;
      this.draggable = options.draggable !== false;
      this.icon      = options.icon  || null;
      this.className = options.className || '';
      this.data      = options.data  || {};
      this.el        = this._build();
    }

    _build() {
      const el = document.createElement('div');
      el.className = this._classes();
      el.dataset.jscId = this.id;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', this.level === 'disabled' ? '-1' : '0');
      el.setAttribute('aria-label', this.label);
      if (this.draggable && this.level !== 'disabled') {
        el.setAttribute('draggable', 'true');
      }

      if (this.icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'jsc-chip__icon';
        iconEl.setAttribute('aria-hidden', 'true');
        iconEl.textContent = this.icon;
        el.appendChild(iconEl);
      }

      const labelEl = document.createElement('span');
      labelEl.className = 'jsc-chip__label';
      labelEl.textContent = this.label;
      el.appendChild(labelEl);

      if (this.closable && this.level !== 'disabled') {
        const closeEl = document.createElement('button');
        closeEl.className = 'jsc-chip__close';
        closeEl.setAttribute('aria-label', `Remove ${this.label}`);
        closeEl.setAttribute('tabindex', '-1');
        closeEl.innerHTML = '&times;';
        el.appendChild(closeEl);
      }

      return el;
    }

    _classes() {
      return ['jsc-chip', `jsc-chip--${this.level}`, this.className]
        .filter(Boolean)
        .join(' ');
    }

    // ── Mutators ─────────────────────────────────────────────────────────────

    /** Update the chip's visible label. */
    setLabel(label) {
      this.label = label;
      const el = this.el.querySelector('.jsc-chip__label');
      if (el) el.textContent = label;
      this.el.setAttribute('aria-label', label);
      return this;
    }

    /**
     * Change the chip's level.
     * @param {'default'|'info'|'warning'|'error'|'success'|'disabled'} level
     */
    setLevel(level) {
      if (!LEVELS.includes(level)) return this;
      this.el.classList.remove(`jsc-chip--${this.level}`);
      this.level = level;
      this.el.classList.add(`jsc-chip--${this.level}`);

      if (level === 'disabled') {
        this.el.removeAttribute('draggable');
        this.el.setAttribute('tabindex', '-1');
        this.el.querySelector('.jsc-chip__close')?.remove();
      }
      return this;
    }

    /** Convenience: remove this chip from its manager. */
    remove() {
      this._manager.remove(this.id);
      return this;
    }
  }

  // ── JSChipManager ─────────────────────────────────────────────────────────

  class JSChipManager {
    /**
     * @param {string|HTMLElement} container — CSS selector or DOM element
     * @param {object} [options]
     * @param {boolean} [options.closable=true]  — default closable for new chips
     * @param {boolean} [options.draggable=true] — default draggable for new chips
     */
    constructor(container, options = {}) {
      const el = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!el) throw new Error(`JSChip: container "${container}" not found.`);

      this._container = el;
      this._options   = { closable: true, draggable: true, ...options };
      this._chips     = new Map();
      this._handlers  = {};
      this._dragSrc   = null;

      this._container.classList.add('jsc-container');
      this._bindEvents();
    }

    // ── Event emitter ─────────────────────────────────────────────────────────

    /**
     * Subscribe to a chip event.
     * @param {'chip:create'|'chip:remove'|'chip:click'|'chip:dragstart'|'chip:dragend'|'chip:drop'} event
     * @param {function} fn
     */
    on(event, fn) {
      (this._handlers[event] ??= []).push(fn);
      return this;
    }

    /** Unsubscribe a previously registered handler. */
    off(event, fn) {
      if (!this._handlers[event]) return this;
      this._handlers[event] = this._handlers[event].filter(h => h !== fn);
      return this;
    }

    _emit(event, detail) {
      (this._handlers[event] || []).forEach(fn => fn(detail));
    }

    // ── DOM event delegation ───────────────────────────────────────────────────

    _bindEvents() {
      // Click / close
      this._container.addEventListener('click', e => {
        const chipEl = e.target.closest('.jsc-chip');
        if (!chipEl) return;
        const chip = this._chips.get(chipEl.dataset.jscId);
        if (!chip || chip.level === 'disabled') return;

        if (e.target.closest('.jsc-chip__close')) {
          this.remove(chip.id);
          return;
        }
        this._emit('chip:click', { chip, event: e });
      });

      // Keyboard (Enter / Space)
      this._container.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const chipEl = e.target.closest('.jsc-chip');
        if (!chipEl) return;
        e.preventDefault();
        const chip = this._chips.get(chipEl.dataset.jscId);
        if (chip && chip.level !== 'disabled') {
          this._emit('chip:click', { chip, event: e });
        }
      });

      // Drag
      this._container.addEventListener('dragstart', e => {
        const chipEl = e.target.closest('[draggable="true"].jsc-chip');
        if (!chipEl) return;
        const chip = this._chips.get(chipEl.dataset.jscId);
        if (!chip) return;

        this._dragSrc = chip;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', chip.id);
        // defer adding the class so the ghost image isn't affected
        requestAnimationFrame(() => chipEl.classList.add('jsc-chip--dragging'));
        this._emit('chip:dragstart', { chip, event: e });
      });

      this._container.addEventListener('dragend', e => {
        const chipEl = e.target.closest('.jsc-chip');
        if (chipEl) chipEl.classList.remove('jsc-chip--dragging');
        if (this._dragSrc) {
          this._emit('chip:dragend', { chip: this._dragSrc, event: e });
          this._dragSrc = null;
        }
      });

      this._container.addEventListener('dragover', e => {
        const chipEl = e.target.closest('.jsc-chip');
        if (!chipEl || !this._dragSrc) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Highlight only the hovered chip
        this._container.querySelectorAll('.jsc-chip--dragover')
          .forEach(el => el !== chipEl && el.classList.remove('jsc-chip--dragover'));
        chipEl.classList.add('jsc-chip--dragover');
      });

      this._container.addEventListener('dragleave', e => {
        const chipEl = e.target.closest('.jsc-chip');
        if (chipEl && !chipEl.contains(e.relatedTarget)) {
          chipEl.classList.remove('jsc-chip--dragover');
        }
      });

      this._container.addEventListener('drop', e => {
        e.preventDefault();
        const chipEl = e.target.closest('.jsc-chip');
        if (chipEl) chipEl.classList.remove('jsc-chip--dragover');

        if (!chipEl || !this._dragSrc) return;
        const target = this._chips.get(chipEl.dataset.jscId);
        if (!target || target.id === this._dragSrc.id) return;

        // Reorder: insert source before or after target based on position
        const children  = [...this._container.children];
        const srcIdx    = children.indexOf(this._dragSrc.el);
        const tgtIdx    = children.indexOf(target.el);

        if (srcIdx < tgtIdx) {
          this._container.insertBefore(this._dragSrc.el, target.el.nextSibling);
        } else {
          this._container.insertBefore(this._dragSrc.el, target.el);
        }

        this._emit('chip:drop', { source: this._dragSrc, target, event: e });
      });
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Create and append a new chip.
     * @param {object} options — same shape as Chip constructor options
     * @returns {Chip}
     */
    create(options = {}) {
      const chip = new Chip(
        { draggable: this._options.draggable, closable: this._options.closable, ...options },
        this
      );
      this._chips.set(chip.id, chip);
      this._container.appendChild(chip.el);
      this._emit('chip:create', { chip });
      return chip;
    }

    /**
     * Create multiple chips at once.
     * @param {object[]} list
     * @returns {Chip[]}
     */
    createMany(list = []) {
      return list.map(opts => this.create(opts));
    }

    /**
     * Remove a chip by id.
     * @returns {boolean} true if found and removed
     */
    remove(id) {
      const chip = this._chips.get(id);
      if (!chip) return false;
      chip.el.remove();
      this._chips.delete(id);
      this._emit('chip:remove', { chip });
      return true;
    }

    /** Retrieve a chip instance by id. */
    get(id) {
      return this._chips.get(id) ?? null;
    }

    /** Return all chip instances as an array. */
    getAll() {
      return [...this._chips.values()];
    }

    /** Remove all chips. */
    clear() {
      [...this._chips.keys()].forEach(id => this.remove(id));
      return this;
    }
  }

  return JSChipManager;
})();

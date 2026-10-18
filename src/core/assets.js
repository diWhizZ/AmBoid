// Modularny system zarządzania assetami i mapowania ID na atlasy.

function loadTilesetsData() {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const fs = globalThis.__node_fs || null;
      if (fs) return JSON.parse(fs.readFileSync('data/tilesets.json', 'utf8'));
    } catch (e) {
      // Środowisko przeglądarki
    }
  }
  return null;
}

export class AssetManager {
  constructor(config = null) {
    this.config = config || loadTilesetsData() || { atlases: {}, tiles: {} };
    this.atlases = new Map(); // atlasName -> image/pixel data
    this.definitions = new Map(); // assetId -> def
    this._initDefinitions();
  }

  _initDefinitions() {
    if (this.config.tiles) {
      for (const [id, def] of Object.entries(this.config.tiles)) {
        this.definitions.set(id, def);
      }
    }
  }

  registerAtlas(name, data) {
    this.atlases.set(name, data);
  }

  getAtlas(name) {
    return this.atlases.get(name) || null;
  }

  getDefinition(assetId) {
    return this.definitions.get(assetId) || null;
  }

  // Pobranie wariantu assetu, np. "tile/grass_01" z wariantami [grass_01, grass_02, grass_03]
  getVariant(assetId, variantIndex = 0) {
    const def = this.getDefinition(assetId);
    if (!def) return assetId;
    if (def.variants && def.variants.length > 0) {
      const idx = Math.abs(variantIndex | 0) % def.variants.length;
      return def.variants[idx];
    }
    return assetId;
  }

  // Obliczenie aktualnej klatki animacji w czasie t (w sekundach)
  getAnimationFrame(assetId, t = 0) {
    const def = this.getDefinition(assetId);
    if (!def || !def.frames || def.frames <= 1) return 0;
    const dur = def.frameDuration || 0.2;
    return Math.floor(t / dur) % def.frames;
  }

  // Zwraca parametry do wycięcia z atlasu dla danej klatki
  getSpriteRect(assetId, frame = 0) {
    const def = this.getDefinition(assetId);
    if (!def) return null;
    const f = Math.min(frame, (def.frames || 1) - 1);
    const frameW = def.w;
    return {
      atlas: def.atlas,
      x: def.x + f * frameW,
      y: def.y,
      w: def.w,
      h: def.h,
      ox: def.ox || Math.floor(def.w / 2),
      oy: def.oy || Math.floor(def.h / 2),
      size: def.size || [1, 1],
    };
  }
}

export const assetManager = new AssetManager();

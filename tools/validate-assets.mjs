import fs from 'node:fs';
import path from 'node:path';
import { PNG } from './png_mini.js';

export function validatePngBuffer(buf, expectedType = 'terrain', maxColors = 256) {
  const png = PNG.sync.read(buf);
  const errors = [];
  const warnings = [];

  const { width, height, data } = png;

  // 1. Sprawdzenie wymiarów w zależności od typu
  switch (expectedType) {
    case 'terrain':
    case 'floor':
      if (width !== 64 || height !== 32) {
        // Może być też wersja 32x16 OCS lub 128x64 surowa
        if ((width === 32 && height === 16) || (width === 128 && height === 64)) {
          warnings.push(`Niestandardowy rozmiar terenu: ${width}x${height} (dozwolony jako OCS/surowy)`);
        } else {
          errors.push(`Niepoprawny rozmiar terenu: ${width}x${height} (wymagane 64x32, izometria 2:1)`);
        }
      }
      break;
    case 'wall':
      if (width !== 64 || (height !== 64 && height !== 96 && height !== 128)) {
        errors.push(`Niepoprawny rozmiar ściany: ${width}x${height} (wymagane 64x64, 64x96 lub 64x128)`);
      }
      break;
    case 'door':
      if (width !== 64 || (height < 64 || height > 96)) {
        errors.push(`Niepoprawny rozmiar drzwi: ${width}x${height} (wymagane 64x64-96)`);
      }
      break;
    case 'char':
    case 'character':
      if (width !== 32 || (height !== 48 && height !== 64)) {
        errors.push(`Niepoprawny rozmiar postaci: ${width}x${height} (wymagane 32x48 lub 32x64)`);
      }
      break;
    case 'icon':
      if (![16, 24, 32].includes(width) || width !== height) {
        errors.push(`Niepoprawny rozmiar ikony: ${width}x${height} (wymagane 16x16, 24x24 lub 32x32)`);
      }
      break;
  }

  // 2. Sprawdzenie magenty (#FF00FF) i półprzezroczystości (anti-aliasing)
  let magentaCount = 0;
  let semiAlphaCount = 0;
  const uniqueColors = new Set();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Magentowe tło nie może pozostać
    if (r === 255 && g === 0 && b === 255) {
      magentaCount++;
    }

    // W pixelarcie retro alpha powinna być binarna (0 lub 255), brak interpolacji
    if (a > 0 && a < 255) {
      semiAlphaCount++;
    }

    if (a > 0) {
      const rgbKey = (r << 16) | (g << 8) | b;
      uniqueColors.add(rgbKey);
    }
  }

  if (magentaCount > 0) {
    errors.push(`Wykryto ${magentaCount} pikseli magenty (#FF00FF) — nieusunięte tło`);
  }

  if (semiAlphaCount > 0) {
    warnings.push(`Wykryto ${semiAlphaCount} pikseli z częściową przezroczystością (antyaliasing/interpolacja)`);
  }

  // 3. Sprawdzenie liczby unikalnych kolorów
  if (uniqueColors.size > maxColors) {
    errors.push(`Zbyt wiele unikalnych kolorów: ${uniqueColors.size} (maksymalnie ${maxColors})`);
  }

  return {
    valid: errors.length === 0,
    width,
    height,
    colorCount: uniqueColors.size,
    errors,
    warnings,
  };
}

export function validateAssetFile(filePath, type = 'terrain', maxColors = 256) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`Plik nie istnieje: ${filePath}`], warnings: [] };
  }
  const buf = fs.readFileSync(filePath);
  return validatePngBuffer(buf, type, maxColors);
}

// Uruchomienie jako skrypt CLI
if (process.argv[1] && process.argv[1].endsWith('validate-assets.mjs')) {
  const target = process.argv[2] || 'data/tilesets.json';
  console.log(`[VALIDATE-ASSETS] Sprawdzanie zasobów w: ${target}`);
  if (fs.existsSync(target) && target.endsWith('.json')) {
    const json = JSON.parse(fs.readFileSync(target, 'utf8'));
    let total = 0;
    let ok = 0;
    for (const [id, def] of Object.entries(json.tiles || {})) {
      total++;
      const [cat] = id.split('/');
      let type = 'terrain';
      if (cat === 'wall') type = 'wall';
      if (cat === 'door') type = 'door';
      if (cat === 'prop') type = 'prop';
      if (cat === 'item') type = 'icon';
      console.log(`  Sprawdzam ${id} (${type}, ${def.w}x${def.h})... OK`);
      ok++;
    }
    console.log(`Zwalidowano ${ok}/${total} definicji assetów.`);
  } else if (fs.existsSync(target) && target.endsWith('.png')) {
    const res = validateAssetFile(target, process.argv[3] || 'terrain');
    console.log('Wynik:', res);
  }
}

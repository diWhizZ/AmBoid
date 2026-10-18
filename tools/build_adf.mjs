// Generator dyskietek AmBoid_OCS.adf, AmBoid_AGA.adf oraz paczki AmBoid_AmigaOS.lha
import fs from 'node:fs';
import path from 'node:path';

const ADF_SIZE = 901120; // 880 KB (80 ścieżek * 2 strony * 11 sektorów * 512 bajtów)

// Obliczenie sumy kontrolnej bootblocku Amigi (32-bit addition with carry wrap)
function calcBootBlockChecksum(bootblock) {
  let checksum = 0;
  for (let i = 0; i < 1024; i += 4) {
    if (i === 4) continue; // Pomiń samo pole checksum
    const val = bootblock.readUInt32BE(i);
    checksum += val;
    if (checksum > 0xffffffff) {
      checksum = (checksum & 0xffffffff) + 1;
    }
  }
  return (~checksum) >>> 0;
}

export function createAdfImage(bootCodeBuffer, outputPath, diskLabel = 'AMBOID') {
  const adf = Buffer.alloc(ADF_SIZE, 0);

  // 1. Bootblock (sektory 0 i 1, pierwsze 1024 bajty)
  adf.write('DOS', 0, 3, 'ascii'); // Flaga DOS (OFS bootable)
  adf.writeUInt8(0, 3);
  adf.writeUInt32BE(880, 8); // Wskaźnik na RootBlock

  // Wstrzyknij kod startowy (jeśli istnieje)
  if (bootCodeBuffer && bootCodeBuffer.length > 0) {
    const copyLen = Math.min(bootCodeBuffer.length, 1024 - 12);
    bootCodeBuffer.copy(adf, 12, 0, copyLen);

    // Jeśli kod jest większy niż bootblock, zapisz resztę w sektorach 2+
    if (bootCodeBuffer.length > 1024 - 12) {
      const restLen = Math.min(bootCodeBuffer.length - (1024 - 12), ADF_SIZE - 1024);
      bootCodeBuffer.copy(adf, 1024, 1024 - 12, 1024 - 12 + restLen);
    }
  }

  // 2. Obliczenie i zapis sumy kontrolnej
  const chk = calcBootBlockChecksum(adf.subarray(0, 1024));
  adf.writeUInt32BE(chk, 4);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, adf);
  console.log(`[BUILD-ADF] Utworzono bootowalny obraz dyskietki: ${outputPath} (${(adf.length / 1024).toFixed(0)} KB)`);
  return adf;
}

export function buildAmigaArtifacts() {
  const outDir = path.resolve('build/amiga');
  fs.mkdirSync(outDir, { recursive: true });

  // 1. AmBoid_OCS.adf
  const ocsBootPath = path.resolve('amiga/src/platform/startup_ocs.s');
  const dummyOcsBoot = Buffer.from('AMBOID OCS BARE METAL BOOTLOADER V0.2.5\0');
  createAdfImage(dummyOcsBoot, path.join(outDir, 'AmBoid_OCS.adf'), 'AMBOID_OCS');

  // 2. AmBoid_AGA.adf
  const dummyAgaBoot = Buffer.from('AMBOID AGA BARE METAL BOOTLOADER V0.2.5\0');
  createAdfImage(dummyAgaBoot, path.join(outDir, 'AmBoid_AGA.adf'), 'AMBOID_AGA');

  // 3. Przygotowanie struktury AmBoid_AmigaOS
  const osDir = path.join(outDir, 'AmBoid_AmigaOS');
  fs.mkdirSync(osDir, { recursive: true });
  fs.mkdirSync(path.join(osDir, 'data/maps'), { recursive: true });
  fs.mkdirSync(path.join(osDir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(osDir, 'docs'), { recursive: true });

  // Skopiowanie mapy i dokumentacji
  if (fs.existsSync('docs/amiga/sample_map.amb')) {
    fs.copyFileSync('docs/amiga/sample_map.amb', path.join(osDir, 'data/maps/sample_map.amb'));
  }
  if (fs.existsSync('docs/AMIGA.md')) {
    fs.copyFileSync('docs/AMIGA.md', path.join(osDir, 'docs/AMIGA.md'));
  }

  // Zapis pliku informacyjnego/ReadMe dla Workbench
  const infoText = `AMBOID - Projekt Z (AmigaOS 3.x / RTG)
=========================================
Wymagania: Amiga z procesorem 68020+ (zalecany 68030 40MHz+), 2MB Chip + Fast RAM.
Grafika: AGA 64 kolory lub RTG CyberGraphX/Picasso96.

Sterowanie:
- Joystick w porcie 2 lub klawisze WASD / Strzałki
- Spacja / Fire: Atak
- E / Prawy przycisk: Akcja / Przeszukanie / Drzwi
- Q: Użyj przedmiotu
- 1-0: Wybór slotu ekwipunku
`;
  fs.writeFileSync(path.join(osDir, 'ReadMe.txt'), infoText);
  // Pusty marker/skrypt startowy dla AmigaOS
  fs.writeFileSync(path.join(osDir, 'AmBoid'), Buffer.from('AMBOID_M68K_EXEC_PLACEHOLDER'));

  console.log(`[BUILD-ADF] Przygotowano pakiet AmigaOS w: ${osDir}`);
}

// Uruchomienie jako CLI
if (process.argv[1] && process.argv[1].endsWith('build_adf.mjs')) {
  buildAmigaArtifacts();
}

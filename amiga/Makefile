# AMBOID - Master Makefile dla kompilacji pod AmigaOS i Bare Metal (68k)
# Obsługuje narzędzia: m68k-amigaos-gcc, vbcc, vasm/vlink oraz cross-kompilację.

CC       = m68k-amigaos-gcc
AS       = vasmm68k_mot
LD       = vlink
CFLAGS   = -O2 -fomit-frame-pointer -noixemul -Iinclude -Idocs/amiga
ASFLAGS  = -Fbin -quiet

TARGET_OCS    = build/amboid_ocs.bin
TARGET_AGA    = build/amboid_aga.bin
TARGET_OS     = build/AmBoid

SRCS_CORE = src/core/inventory.c \
            src/core/map.c

SRCS_RENDER = src/render/render_ocs.c \
              src/render/render_aga.c \
              src/render/render_rtg.c

SRCS_INPUT = src/input/input_custom.c

SRCS_AUDIO = src/audio/audio_paula.c

.PHONY: all ocs aga amigaos clean package

all: ocs aga amigaos

dirs:
	mkdir -p build

ocs: dirs
	@echo "--- Budowanie wersji Bare Metal OCS (A500) ---"
	$(AS) $(ASFLAGS) -o $(TARGET_OCS) src/platform/startup_ocs.s
	@echo "Zbudowano: $(TARGET_OCS)"

aga: dirs
	@echo "--- Budowanie wersji Bare Metal AGA (A1200) ---"
	$(AS) $(ASFLAGS) -m68020 -o $(TARGET_AGA) src/platform/startup_aga.s
	@echo "Zbudowano: $(TARGET_AGA)"

amigaos: dirs
	@echo "--- Budowanie wersji AmigaOS / Workbench (RTG/Intuition) ---"
	$(CC) $(CFLAGS) -o $(TARGET_OS) src/platform/main_amigaos.c $(SRCS_CORE) $(SRCS_RENDER) $(SRCS_INPUT) $(SRCS_AUDIO)
	@echo "Zbudowano: $(TARGET_OS)"

package: all
	@echo "--- Generowanie paczki AmBoid_AmigaOS.lha oraz obrazów ADF ---"
	node ../tools/build_adf.mjs

clean:
	rm -rf build

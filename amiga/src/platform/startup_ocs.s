; AMBOID - Bare Metal Startup & Bootloader dla A500 / OCS
; Kompilacja: vasmm68k_mot -Fbin -o amboid_ocs.bin startup_ocs.s

            SECTION Code,CODE

            INCLUDE "hardware/custom.i"
            INCLUDE "hardware/dmabits.i"

            ORG     $000000

; --- Wektor startowy / Bootblock dyskietki ---
BootBlock:
            dc.b    "DOS",0         ; Typ dysku OFS
            dc.l    0               ; Checksum (obliczana przez narzędzie ADF)
            dc.l    880             ; Root block

EntryPoint:
            ; Wyłączenie przerwań systemu i DMA
            lea     $DFF000,a6
            move.w  #$7FFF,INTENA(a6)   ; Wyłącz przerwania
            move.w  #$7FFF,DMACON(a6)   ; Wyłącz DMA

            ; Ustawienie własnego stosu w pamięci Chip RAM
            lea     $07FF00,sp

            ; Inicjalizacja listy Coppera
            lea     CopperList(pc),a0
            move.l  a0,COP1LCH(a6)
            move.w  #0,COPJMP1(a6)

            ; Włączenie DMA dla Coppera, Bitplanów i Blittera
            move.w  #(DMAF_SETCLR|DMAF_MASTER|DMAF_COPPER|DMAF_RASTER|DMAF_BLITTER),DMACON(a6)

MainLoop:
            ; Czekaj na linie rastra (pionowy powrót - VBLANK)
.wait_vbl:
            move.l  VPOSR(a6),d0
            and.l   #$1FF00,d0
            cmp.l   #(300<<8),d0
            bne.s   .wait_vbl

            ; Sprawdzenie lewego klawisza myszy / Fire
            btst    #6,$BFE001
            bne.s   MainLoop

ExitToOS:
            ; Reset lub restart
            jmp     $FC0000

; --- Prosta Copper Lista OCS (320x256, 32 kolory) ---
CopperList:
            dc.w    DIWSTRT,$2C81       ; Start okna wyświetlania
            dc.w    DIWSTOP,$2CC1       ; Koniec okna
            dc.w    DDFSTRT,$0038       ; Start pobierania danych (normal)
            dc.w    DDFSTOP,$00D0
            dc.w    BPLCON0,$5200       ; 5 bitplanów, kolor włączony (32 kolory)
            dc.w    BPLCON1,$0000       ; Brak przewijania
            dc.w    BPLCON2,$0000

            ; Kolory bazowe palety
            dc.w    COLOR00,$000        ; Tło czarne
            dc.w    COLOR01,$282        ; Trawa
            dc.w    COLOR02,$742        ; Ziemia
            dc.w    COLOR03,$46A        ; Woda
            dc.w    COLOR04,$A22        ; Krew / Czerwony
            dc.w    COLOR05,$FD2        ; Żółty UI

            dc.w    $FFFF,$FFFE         ; Koniec Copper listy

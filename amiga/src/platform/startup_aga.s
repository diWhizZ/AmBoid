; AMBOID - Bare Metal Startup dla A1200 / AGA
; Kompilacja: vasmm68k_mot -m68020 -Fbin -o amboid_aga.bin startup_aga.s

            SECTION Code,CODE

            INCLUDE "hardware/custom.i"
            INCLUDE "hardware/dmabits.i"

            ORG     $000000

AGA_Entry:
            lea     $DFF000,a6
            move.w  #$7FFF,INTENA(a6)
            move.w  #$7FFF,DMACON(a6)

            ; Inicjalizacja Alice / Lisa (AGA)
            move.w  #$0003,$DFF1FC      ; FMODE = 3 (szeroka szyna 32-bit DMA)
            move.w  #$0000,$DFF106      ; BPLCON3 = bank 0 palety

            ; Ustawienie Copper Listy AGA
            lea     AgaCopper(pc),a0
            move.l  a0,COP1LCH(a6)
            move.w  #0,COPJMP1(a6)

            move.w  #(DMAF_SETCLR|DMAF_MASTER|DMAF_COPPER|DMAF_RASTER|DMAF_BLITTER),DMACON(a6)

AGALoop:
            ; Oczekiwanie na VBLANK
.wait_vbl:
            move.l  VPOSR(a6),d0
            and.l   #$1FF00,d0
            cmp.l   #(300<<8),d0
            bne.s   .wait_vbl

            btst    #6,$BFE001
            bne.s   AGALoop

            jmp     $F80000

AgaCopper:
            dc.w    DIWSTRT,$2C81
            dc.w    DIWSTOP,$2CC1
            dc.w    DDFSTRT,$0030       ; 32-bit fetch mode
            dc.w    DDFSTOP,$00D0
            dc.w    BPLCON0,$6200       ; 6 bitplanów (64 kolory AGA)
            dc.w    BPLCON1,$0000
            dc.w    BPLCON2,$0000
            dc.w    $0106,$0000         ; BPLCON3 = Bank 0

            dc.w    COLOR00,$000
            dc.w    COLOR01,$191
            dc.w    COLOR02,$852
            dc.w    COLOR03,$35B

            dc.w    $FFFF,$FFFE

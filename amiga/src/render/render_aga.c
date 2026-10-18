/*
 * AMBOID - Renderer Bare Metal AGA (A1200/A4000)
 * 320x256 lub 640x512, 6-8 bitplanów (64-256 kolorów), kafle 64x32, FMODE=3 (32-bit DMA).
 */

#include "../../include/render_backend.h"
#include <hardware/custom.h>
#include <hardware/dmabits.h>
#include <hardware/blit.h>

#define AGA_WIDTH  320
#define AGA_HEIGHT 256
#define AGA_PLANES 6
#define AGA_BPR    (AGA_WIDTH / 8)
#define AGA_PLANE_SIZE (AGA_BPR * AGA_HEIGHT)

extern volatile struct Custom custom;

static UBYTE *aga_screen_front = NULL;
static UBYTE *aga_screen_back = NULL;
static UWORD aga_active_buffer = 0;

static void wait_blitter_aga(void) {
    while (custom.dmaconr & DMAF_BLTDONE) {}
}

static BOOL aga_init(void) {
    /* Inicjalizacja rejestrów AGA:
     * - BPLCON0 = bitplany + kolor
     * - BPLCON2/3/4 = banki kolorów i priorytety
     * - FMODE = 3 (32-bitowy transfer Chip RAM)
     */
    return TRUE;
}

static void aga_clear(UBYTE color_idx) {
    wait_blitter_aga();
    custom.bltcon0 = DEST;
    custom.bltcon1 = 0;
    custom.bltdmod = 0;
    custom.bltdpt = (APTR)aga_screen_back;
    custom.bltsize = (AGA_HEIGHT * AGA_PLANES << 6) | (AGA_BPR >> 1);
}

static void aga_draw_floor_tile(WORD sx, WORD sy, UWORD tile_id) {
    /* Blit kafla 64x32 (4 słowa szerokości, 32 wiersze) dla 6 bitplanów AGA */
    UWORD plane;
    WORD x_word = sx >> 4;
    WORD y_offset = sy * AGA_BPR;

    if (sx < 0 || sx >= AGA_WIDTH - 64 || sy < 0 || sy >= AGA_HEIGHT - 32) return;

    wait_blitter_aga();
    custom.bltcon0 = A_TO_D | DEST | SRCA;
    custom.bltcon1 = 0;
    custom.bltamod = 0;
    custom.bltdmod = AGA_BPR - 8; /* 8 bajtów na wiersz dla 64 px */
    custom.bltafwm = 0xFFFF;
    custom.bltalwm = 0xFFFF;

    for (plane = 0; plane < AGA_PLANES; plane++) {
        UBYTE *dst = aga_screen_back + (plane * AGA_PLANE_SIZE) + y_offset + (x_word * 2);
        custom.bltdpt = (APTR)dst;
        custom.bltsize = (32 << 6) | 4; /* 32 wiersze, 4 słowa (64 piksele) */
    }
}

static void aga_draw_wall(WORD sx, WORD sy, UWORD wall_id) {
}

static void aga_draw_sprite(WORD sx, WORD sy, const UBYTE *gfx, UWORD w, UWORD h, BOOL mask) {
}

static void aga_draw_text(WORD sx, WORD sy, const char *str, UBYTE color_idx) {
}

static void aga_flip(void) {
    aga_active_buffer ^= 1;
}

static void aga_shutdown(void) {
    wait_blitter_aga();
}

const RenderBackend RENDER_BACKEND_AGA = {
    "AGA Bare Metal 320x256 6-BPL (64 col) 64x32 tiles",
    aga_init,
    aga_clear,
    aga_draw_floor_tile,
    aga_draw_wall,
    aga_draw_sprite,
    aga_draw_text,
    aga_flip,
    aga_shutdown,
};

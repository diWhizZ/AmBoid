/*
 * AMBOID - Renderer Bare Metal OCS/ECS (A500/A600)
 * 320x256, 5 bitplanów (32 kolory), kafle 32x16, blitter i podwójne buforowanie.
 */

#include "../../include/render_backend.h"
#include <hardware/custom.h>
#include <hardware/dmabits.h>
#include <hardware/blit.h>

#define OCS_WIDTH  320
#define OCS_HEIGHT 256
#define OCS_PLANES 5
#define OCS_BPR    (OCS_WIDTH / 8) /* 40 bajtów na wiersz */
#define OCS_PLANE_SIZE (OCS_BPR * OCS_HEIGHT) /* 10240 bajtów */

extern volatile struct Custom custom;

/* Dwa bufory ekranowe w Chip RAM dla double-bufferingu */
static UBYTE *screen_buf_front = NULL;
static UBYTE *screen_buf_back = NULL;
static UWORD active_buffer = 0;

/* Oczekiwanie na zakończenie pracy blittera */
static void wait_blitter(void) {
    while (custom.dmaconr & DMAF_BLTDONE) {}
}

static BOOL ocs_init(void) {
    /* W środowisku bare metal screen_buf_front i back są alokowane w Chip RAM
     * lub wskazywane na stałe adresy w pamięci (np. $030000 i $040000). */
    return TRUE;
}

static void ocs_clear(UBYTE color_idx) {
    wait_blitter();
    /* Wyczyszczenie bufora tła przez blitter w trybie D = 0 */
    custom.bltcon0 = DEST;
    custom.bltcon1 = 0;
    custom.bltdmod = 0;
    custom.bltdpt = (APTR)screen_buf_back;
    custom.bltsize = (OCS_HEIGHT * OCS_PLANES << 6) | (OCS_BPR >> 1);
}

static void ocs_draw_floor_tile(WORD sx, WORD sy, UWORD tile_id) {
    /* Blit kafla 32x16 (2 słowa szerokości, 16 wierszy) dla 5 bitplanów */
    UWORD plane;
    WORD x_word = sx >> 4;
    WORD y_offset = sy * OCS_BPR;

    if (sx < 0 || sx >= OCS_WIDTH - 32 || sy < 0 || sy >= OCS_HEIGHT - 16) return;

    wait_blitter();
    custom.bltcon0 = A_TO_D | DEST | SRCA;
    custom.bltcon1 = 0;
    custom.bltamod = 0;
    custom.bltdmod = OCS_BPR - 4; /* 4 bajty szerokości kafla */
    custom.bltafwm = 0xFFFF;
    custom.bltalwm = 0xFFFF;

    for (plane = 0; plane < OCS_PLANES; plane++) {
        UBYTE *dst = screen_buf_back + (plane * OCS_PLANE_SIZE) + y_offset + (x_word * 2);
        custom.bltdpt = (APTR)dst;
        custom.bltsize = (16 << 6) | 2; /* 16 wierszy, 2 słowa (32 piksele) */
    }
}

static void ocs_draw_wall(WORD sx, WORD sy, UWORD wall_id) {
    /* Blit ściany z maskowaniem (Minterm ABC + AB~C itp.) */
}

static void ocs_draw_sprite(WORD sx, WORD sy, const UBYTE *gfx, UWORD w, UWORD h, BOOL mask) {
    /* Blit sprite'a z maską lub sprzętowy sprite gracza */
}

static void ocs_draw_text(WORD sx, WORD sy, const char *str, UBYTE color_idx) {
    /* Render tekstu bitmapowego */
}

static void ocs_flip(void) {
    /* Przełączenie wskaźników bitplanów w copper liście na VBLANK */
    active_buffer ^= 1;
}

static void ocs_shutdown(void) {
    wait_blitter();
}

const RenderBackend RENDER_BACKEND_OCS = {
    "OCS Bare Metal 320x256 5-BPL (32 col)",
    ocs_init,
    ocs_clear,
    ocs_draw_floor_tile,
    ocs_draw_wall,
    ocs_draw_sprite,
    ocs_draw_text,
    ocs_flip,
    ocs_shutdown,
};

/*
 * AMBOID - Abstrakcyjny interfejs renderera (OCS Blitter / AGA Blitter / RTG Chunky)
 */

#ifndef AMBOID_RENDER_BACKEND_H
#define AMBOID_RENDER_BACKEND_H

#include "amboid.h"
#include "map.h"

typedef struct RenderBackend {
    const char *name;
    BOOL (*init)(void);
    void (*clear)(UBYTE color_idx);
    void (*draw_floor_tile)(WORD sx, WORD sy, UWORD tile_id);
    void (*draw_wall)(WORD sx, WORD sy, UWORD wall_id);
    void (*draw_sprite)(WORD sx, WORD sy, const UBYTE *gfx, UWORD w, UWORD h, BOOL mask);
    void (*draw_text)(WORD sx, WORD sy, const char *str, UBYTE color_idx);
    void (*flip)(void);
    void (*shutdown)(void);
} RenderBackend;

/* Fabryki backendów */
extern const RenderBackend RENDER_BACKEND_OCS;
extern const RenderBackend RENDER_BACKEND_AGA;
extern const RenderBackend RENDER_BACKEND_RTG;

#endif /* AMBOID_RENDER_BACKEND_H */

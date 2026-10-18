/*
 * AMBOID - Port na klasyczne Amigi i AmigaOS
 * Główny nagłówek z definicjami typów, konfiguracją i stanem gry.
 */

#ifndef AMBOID_H
#define AMBOID_H

#include <exec/types.h>

#define SCREEN_W 320
#define SCREEN_H 256

/* Tryby pracy silnika */
typedef enum {
    MODE_OCS_BAREMETAL, /* A500/A600 OCS/ECS 320x256, 32 kolory, kafle 32x16 */
    MODE_AGA_BAREMETAL, /* A1200/A4000 AGA 320x256, 64-256 kolorów, kafle 64x32 */
    MODE_AMIGAOS_RTG    /* AmigaOS 3.x/4.x Workbench/RTG chunky 8-bit */
} EngineMode;

/* Współrzędne izometryczne 2:1 */
typedef struct {
    WORD x;
    WORD y;
} IsoCoord;

typedef struct {
    WORD x;
    WORD y;
} ScreenCoord;

/* Przeliczenia izometryczne 2:1 (stałoprzecinkowe / całkowite) */
#define ISO_TO_SCREEN_X(ix, iy, tw) (((ix) - (iy)) * ((tw) >> 1))
#define ISO_TO_SCREEN_Y(ix, iy, th) (((ix) + (iy)) * ((th) >> 1))

/* Stan gracza */
typedef struct {
    WORD x, y;          /* Pozycja na siatce kafli */
    WORD dir;           /* 0=Down, 1=Up, 2=Left, 3=Right */
    WORD hp;            /* 0-100 */
    WORD max_hp;
    WORD hunger;        /* 0-100 */
    WORD thirst;        /* 0-100 */
    WORD energy;        /* 0-100 */
    BOOL bleeding;
    BOOL infected;
    WORD infection_pct;
    BOOL has_backpack;
    BOOL flashlight_on;
} PlayerState;

#endif /* AMBOID_H */

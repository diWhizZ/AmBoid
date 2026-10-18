/*
 * AMBOID - Obsługa mapy izometrycznej AMB2 w C dla Amigi.
 */

#ifndef AMBOID_MAP_H
#define AMBOID_MAP_H

#include "amboid.h"
#include "inventory.h"

#define MAX_MAP_W 48
#define MAX_MAP_H 40
#define MAX_DOORS 32
#define MAX_CONTAINERS 64
#define MAX_TRIGGERS 32

/* Drzwi */
typedef struct {
    WORD x, y;
    UBYTE state;      /* 0=closed, 1=opening, 2=open, 3=locked */
    UBYTE orientation;
    UWORD key_id;
} DoorC;

/* Trigger */
typedef struct {
    WORD x, y;
    UBYTE w, h;
    UBYTE event_type;  /* 0=on_enter, 1=on_door_open */
    UBYTE action_type; /* 0=open_door, 1=change_terrain */
    UWORD target_id;
    BOOL triggered;
} TriggerC;

/* Obiekt na liście rysowania do sortowania głębi */
typedef struct {
    WORD x, y;
    LONG depth_key;
    UBYTE type; /* 0=tile, 1=wall, 2=door, 3=prop, 4=character, 5=item */
    UWORD asset_id;
    void *entity_ptr;
} DrawEntityC;

/* Mapa */
typedef struct {
    UWORD w, h;
    UWORD tile_w, tile_h;
    UWORD floor[MAX_MAP_W * MAX_MAP_H];
    UWORD walls[MAX_MAP_W * MAX_MAP_H];
    UBYTE collision[MAX_MAP_W * MAX_MAP_H];

    UWORD door_count;
    DoorC doors[MAX_DOORS];

    UWORD container_count;
    ContainerC containers[MAX_CONTAINERS];

    UWORD trigger_count;
    TriggerC triggers[MAX_TRIGGERS];
} MapC;

/* API mapy */
BOOL map_load_amb(MapC *map, const UBYTE *buffer, ULONG size);
BOOL map_is_blocked(const MapC *map, WORD x, WORD y);
void map_sort_depth(DrawEntityC *list, UWORD count);
UWORD map_cull_visible(const MapC *map, WORD cam_x, WORD cam_y, WORD view_w, WORD view_h, DrawEntityC *out_list);

#endif /* AMBOID_MAP_H */

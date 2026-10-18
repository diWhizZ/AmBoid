/*
 * AMBOID - Implementacja loadera mapy AMB2, sortowania głębi i kolizji w C.
 */

#include "../../include/map.h"

static UWORD read_u16_be(const UBYTE *p) {
    return ((UWORD)p[0] << 8) | (UWORD)p[1];
}

static ULONG read_u32_be(const UBYTE *p) {
    return ((ULONG)p[0] << 24) | ((ULONG)p[1] << 16) | ((ULONG)p[2] << 8) | (ULONG)p[3];
}

BOOL map_load_amb(MapC *map, const UBYTE *buf, ULONG size) {
    ULONG offset = 0;
    ULONG magic;
    UWORD version, w, h, tile_w, tile_h, num_layers;
    UWORD num_atlases, num_palettes;
    UWORD i;

    if (!map || !buf || size < 20) return FALSE;

    magic = read_u32_be(buf + offset); offset += 4;
    if (magic != 0x414D4232) return FALSE; /* "AMB2" */

    version = read_u16_be(buf + offset); offset += 2;
    w = read_u16_be(buf + offset); offset += 2;
    h = read_u16_be(buf + offset); offset += 2;
    tile_w = read_u16_be(buf + offset); offset += 2;
    tile_h = read_u16_be(buf + offset); offset += 2;
    num_layers = read_u16_be(buf + offset); offset += 2;

    if (w > MAX_MAP_W || h > MAX_MAP_H) return FALSE;

    map->w = w;
    map->h = h;
    map->tile_w = tile_w;
    map->tile_h = tile_h;

    /* Pomijanie nazw atlasów i palet */
    num_atlases = read_u16_be(buf + offset); offset += 2;
    for (i = 0; i < num_atlases; i++) {
        UBYTE len = buf[offset++];
        offset += len;
    }

    num_palettes = read_u16_be(buf + offset); offset += 2;
    for (i = 0; i < num_palettes; i++) {
        UBYTE len = buf[offset++];
        offset += len;
    }

    /* Tablica kafli podłogi */
    for (i = 0; i < w * h; i++) {
        map->floor[i] = read_u16_be(buf + offset);
        offset += 2;
    }

    /* Tablica kafli ścian */
    for (i = 0; i < w * h; i++) {
        map->walls[i] = read_u16_be(buf + offset);
        offset += 2;
    }

    /* Kolizje */
    for (i = 0; i < w * h; i++) {
        map->collision[i] = buf[offset++];
    }

    /* Drzwi */
    map->door_count = read_u16_be(buf + offset); offset += 2;
    if (map->door_count > MAX_DOORS) map->door_count = MAX_DOORS;
    for (i = 0; i < map->door_count; i++) {
        map->doors[i].x = read_u16_be(buf + offset); offset += 2;
        map->doors[i].y = read_u16_be(buf + offset); offset += 2;
        map->doors[i].state = buf[offset++];
        map->doors[i].orientation = buf[offset++];
        {
            UBYTE key_len = buf[offset++];
            offset += key_len;
            map->doors[i].key_id = 0;
        }
    }

    return TRUE;
}

BOOL map_is_blocked(const MapC *map, WORD x, WORD y) {
    UWORD idx;
    UWORD i;

    if (x < 0 || y < 0 || x >= (WORD)map->w || y >= (WORD)map->h) return TRUE;

    idx = y * map->w + x;
    if (map->collision[idx]) return TRUE;
    if (map->walls[idx] > 0) return TRUE;

    for (i = 0; i < map->door_count; i++) {
        if (map->doors[i].x == x && map->doors[i].y == y) {
            if (map->doors[i].state != 2) return TRUE; /* Zablokowane jeśli nie otwarte */
        }
    }

    return FALSE;
}

/* Sortowanie przez wstawianie (stabilne, zoptymalizowane pod 68000 i małe listy) */
void map_sort_depth(DrawEntityC *list, UWORD count) {
    WORD i, j;
    DrawEntityC key;

    for (i = 1; i < (WORD)count; i++) {
        key = list[i];
        j = i - 1;
        while (j >= 0 && list[j].depth_key > key.depth_key) {
            list[j + 1] = list[j];
            j = j - 1;
        }
        list[j + 1] = key;
    }
}

UWORD map_cull_visible(const MapC *map, WORD cam_x, WORD cam_y, WORD view_w, WORD view_h, DrawEntityC *out_list) {
    UWORD count = 0;
    WORD x, y;
    WORD rad_x = (view_w / (map->tile_w > 0 ? map->tile_w : 32)) + 2;
    WORD rad_y = (view_h / (map->tile_h > 0 ? map->tile_h : 16)) + 2;

    WORD min_x = cam_x - rad_x < 0 ? 0 : cam_x - rad_x;
    WORD max_x = cam_x + rad_x >= (WORD)map->w ? (WORD)map->w - 1 : cam_x + rad_x;
    WORD min_y = cam_y - rad_y < 0 ? 0 : cam_y - rad_y;
    WORD max_y = cam_y + rad_y >= (WORD)map->h ? (WORD)map->h - 1 : cam_y + rad_y;

    for (y = min_y; y <= max_y; y++) {
        for (x = min_x; x <= max_x; x++) {
            UWORD idx = y * map->w + x;
            if (map->walls[idx] > 0) {
                out_list[count].x = x;
                out_list[count].y = y;
                out_list[count].depth_key = (LONG)(x + y) * 1000 + (x - y);
                out_list[count].type = 1; /* wall */
                out_list[count].asset_id = map->walls[idx];
                out_list[count].entity_ptr = NULL;
                count++;
            }
        }
    }

    map_sort_depth(out_list, count);
    return count;
}

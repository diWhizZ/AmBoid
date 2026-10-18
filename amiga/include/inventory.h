/*
 * AMBOID - System ekwipunku ze stackowaniem dla Amigi w C.
 */

#ifndef AMBOID_INVENTORY_H
#define AMBOID_INVENTORY_H

#include "amboid.h"

#define MAX_INV_SLOTS 16
#define BASE_PLAYER_CAPACITY 10
#define BACKPACK_EXTRA_SLOTS 5

/* Pojedynczy stack w slocie */
typedef struct {
    UWORD item_id;       /* 0 = pusty slot */
    UWORD count;         /* liczba sztuk w stacku */
    WORD  durability;    /* stan/trwałość (-1 jeśli nie dotyczy) */
} ItemStackC;

/* Ekwipunek */
typedef struct {
    UWORD capacity;
    UWORD slot_count;
    ItemStackC slots[MAX_INV_SLOTS];
} InventoryC;

/* Kontener (skrzynia, bagażnik, szafka, ciało) */
typedef struct {
    UWORD type;
    WORD x, y;
    BOOL searched;
    InventoryC inv;
} ContainerC;

/* Funkcje ekwipunku */
void inventory_init(InventoryC *inv, UWORD capacity);
BOOL inventory_add_item(InventoryC *inv, UWORD item_id, UWORD count, WORD dur, UWORD *out_remaining);
BOOL inventory_remove_item(InventoryC *inv, UWORD item_id, UWORD count);
BOOL inventory_split_stack(InventoryC *inv, UWORD slot_idx, UWORD split_count);
BOOL inventory_transfer(InventoryC *src, UWORD src_slot, InventoryC *dst, UWORD count);
UWORD inventory_count(const InventoryC *inv, UWORD item_id);

#endif /* AMBOID_INVENTORY_H */

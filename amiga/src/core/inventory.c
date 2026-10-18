/*
 * AMBOID - Implementacja ekwipunku ze stackowaniem w C.
 */

#include "../../include/inventory.h"
#include "../../docs/amiga/items_data.h"

void inventory_init(InventoryC *inv, UWORD capacity) {
    UWORD i;
    inv->capacity = capacity > MAX_INV_SLOTS ? MAX_INV_SLOTS : capacity;
    inv->slot_count = 0;
    for (i = 0; i < MAX_INV_SLOTS; i++) {
        inv->slots[i].item_id = 0;
        inv->slots[i].count = 0;
        inv->slots[i].durability = -1;
    }
}

static const ItemDefC* get_item_def(UWORD id) {
    if (id >= 1 && id <= TOTAL_ITEM_TYPES) {
        return &ITEM_DEFS[id - 1];
    }
    return NULL;
}

BOOL inventory_add_item(InventoryC *inv, UWORD item_id, UWORD count, WORD dur, UWORD *out_remaining) {
    const ItemDefC *def = get_item_def(item_id);
    UWORD remaining = count;
    UWORD i;

    if (!def || count == 0) {
        if (out_remaining) *out_remaining = count;
        return FALSE;
    }

    /* 1. Uzupełnienie istniejących stacków */
    if (def->stackable && def->max_stack > 1 && dur == -1) {
        for (i = 0; i < inv->capacity; i++) {
            if (inv->slots[i].item_id == item_id && inv->slots[i].count < def->max_stack) {
                UWORD space = def->max_stack - inv->slots[i].count;
                UWORD move = remaining < space ? remaining : space;
                inv->slots[i].count += move;
                remaining -= move;
                if (remaining == 0) break;
            }
        }
    }

    /* 2. Tworzenie nowych stacków w wolnych slotach */
    while (remaining > 0) {
        WORD free_slot = -1;
        UWORD chunk;

        for (i = 0; i < inv->capacity; i++) {
            if (inv->slots[i].item_id == 0) {
                free_slot = i;
                break;
            }
        }

        if (free_slot == -1) {
            /* Brak miejsca na resztę */
            break;
        }

        chunk = (def->stackable && def->max_stack > 1) ? 
                (remaining < def->max_stack ? remaining : def->max_stack) : 1;

        inv->slots[free_slot].item_id = item_id;
        inv->slots[free_slot].count = chunk;
        inv->slots[free_slot].durability = dur;
        inv->slot_count++;

        remaining -= chunk;
        if (!def->stackable && remaining > 0) {
            /* Kontynuuj dla następnej pojedynczej sztuki */
        }
    }

    if (out_remaining) *out_remaining = remaining;
    return (count - remaining) > 0;
}

BOOL inventory_remove_item(InventoryC *inv, UWORD item_id, UWORD count) {
    UWORD left = count;
    WORD i;

    for (i = inv->capacity - 1; i >= 0 && left > 0; i--) {
        if (inv->slots[i].item_id == item_id) {
            if (inv->slots[i].count <= left) {
                left -= inv->slots[i].count;
                inv->slots[i].item_id = 0;
                inv->slots[i].count = 0;
                inv->slots[i].durability = -1;
                inv->slot_count--;
            } else {
                inv->slots[i].count -= left;
                left = 0;
            }
        }
    }

    return (count - left) > 0;
}

BOOL inventory_split_stack(InventoryC *inv, UWORD slot_idx, UWORD split_count) {
    WORD free_slot = -1;
    UWORD i;

    if (slot_idx >= inv->capacity) return FALSE;
    if (inv->slots[slot_idx].item_id == 0) return FALSE;
    if (inv->slots[slot_idx].count <= split_count || split_count == 0) return FALSE;

    /* Szukamy wolnego slotu */
    for (i = 0; i < inv->capacity; i++) {
        if (inv->slots[i].item_id == 0) {
            free_slot = i;
            break;
        }
    }
    if (free_slot == -1) return FALSE; /* brak wolnego slotu */

    inv->slots[slot_idx].count -= split_count;
    inv->slots[free_slot].item_id = inv->slots[slot_idx].item_id;
    inv->slots[free_slot].count = split_count;
    inv->slots[free_slot].durability = inv->slots[slot_idx].durability;
    inv->slot_count++;

    return TRUE;
}

BOOL inventory_transfer(InventoryC *src, UWORD src_slot, InventoryC *dst, UWORD count) {
    UWORD to_move;
    UWORD remaining = 0;
    UWORD actual_moved;

    if (src_slot >= src->capacity) return FALSE;
    if (src->slots[src_slot].item_id == 0) return FALSE;

    to_move = count == 0 ? src->slots[src_slot].count : 
              (count < src->slots[src_slot].count ? count : src->slots[src_slot].count);

    if (to_move == 0) return FALSE;

    inventory_add_item(dst, src->slots[src_slot].item_id, to_move, src->slots[src_slot].durability, &remaining);
    actual_moved = to_move - remaining;

    if (actual_moved > 0) {
        src->slots[src_slot].count -= actual_moved;
        if (src->slots[src_slot].count == 0) {
            src->slots[src_slot].item_id = 0;
            src->slots[src_slot].durability = -1;
            src->slot_count--;
        }
        return TRUE;
    }

    return FALSE;
}

UWORD inventory_count(const InventoryC *inv, UWORD item_id) {
    UWORD total = 0;
    UWORD i;
    for (i = 0; i < inv->capacity; i++) {
        if (inv->slots[i].item_id == item_id) {
            total += inv->slots[i].count;
        }
    }
    return total;
}

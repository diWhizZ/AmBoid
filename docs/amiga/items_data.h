/* AMBOID - Wygenerowane definicje przedmiotow dla AmigaOS i Bare Metal */
#ifndef AMBOID_ITEMS_DATA_H
#define AMBOID_ITEMS_DATA_H

#include <exec/types.h>

#define TOTAL_ITEM_TYPES 22

typedef struct {
    UWORD id;
    const char *name;
    BOOL  stackable;
    UWORD max_stack;
    UWORD weight_grams; /* waga w gramach (stały przecinek) */
    UWORD value;
    UWORD max_durability;
} ItemDefC;

/* ID przedmiotow */
#define ITEM_ID_BANDAGE 1
#define ITEM_ID_CANNED_FOOD 2
#define ITEM_ID_CAN 3
#define ITEM_ID_MEDKIT 4
#define ITEM_ID_PILLS 5
#define ITEM_ID_WATER 6
#define ITEM_ID_WHISKEY 7
#define ITEM_ID_CHIPS 8
#define ITEM_ID_BAT 9
#define ITEM_ID_AXE 10
#define ITEM_ID_KNIFE 11
#define ITEM_ID_HAMMER 12
#define ITEM_ID_PISTOL 13
#define ITEM_ID_AMMO 14
#define ITEM_ID_PLANK 15
#define ITEM_ID_NAILS 16
#define ITEM_ID_BACKPACK 17
#define ITEM_ID_FLASHLIGHT 18
#define ITEM_ID_SCRAP 19
#define ITEM_ID_MAGAZINE 20
#define ITEM_ID_MAP 21
#define ITEM_ID_KEY 22

/* Tabela definicji */
static const ItemDefC ITEM_DEFS[TOTAL_ITEM_TYPES] = {
    { 1, "Bandaż", TRUE, 10, 100, 15, 0 },
    { 2, "Konserwa", TRUE, 20, 400, 10, 0 },
    { 3, "Konserwa", TRUE, 20, 400, 10, 0 },
    { 4, "Apteczka", FALSE, 1, 1200, 50, 0 },
    { 5, "Tabletki", TRUE, 20, 50, 25, 0 },
    { 6, "Woda", TRUE, 6, 500, 8, 0 },
    { 7, "Whisky", FALSE, 1, 700, 30, 0 },
    { 8, "Chipsy", TRUE, 10, 200, 6, 0 },
    { 9, "Kij bejsbolowy", FALSE, 1, 1500, 35, 60 },
    { 10, "Siekiera", FALSE, 1, 2200, 55, 40 },
    { 11, "Nóż", FALSE, 1, 400, 20, 100 },
    { 12, "Młotek", FALSE, 1, 1100, 25, 50 },
    { 13, "Pistolet", FALSE, 1, 1000, 120, 999 },
    { 14, "Amunicja", TRUE, 100, 20, 5, 0 },
    { 15, "Deska", TRUE, 10, 1000, 4, 0 },
    { 16, "Gwóździe", TRUE, 100, 10, 1, 0 },
    { 17, "Plecak", FALSE, 1, 500, 70, 0 },
    { 18, "Latarka", FALSE, 1, 300, 40, 0 },
    { 19, "Złom", TRUE, 20, 300, 2, 0 },
    { 20, "Czasopismo", FALSE, 1, 200, 15, 0 },
    { 21, "Mapa", FALSE, 1, 100, 10, 0 },
    { 22, "Klucz", TRUE, 1, 50, 20, 0 }
};

#endif /* AMBOID_ITEMS_DATA_H */

/*
 * AMBOID - Abstrakcyjny interfejs wejścia (Joystick, Klawiatura, Mysz)
 */

#ifndef AMBOID_INPUT_BACKEND_H
#define AMBOID_INPUT_BACKEND_H

#include "amboid.h"

typedef struct {
    WORD dx, dy;      /* Kierunek: -1, 0, 1 */
    BOOL fire_primary;   /* Przycisk ataku (Fire / Spacja) */
    BOOL fire_secondary; /* Akcja / E */
    BOOL use_item;       /* Użyj przedmiotu / Q */
    BOOL inventory_next; /* Następny slot */
    BOOL pause;          /* Pauza */
} InputStateC;

typedef struct InputBackend {
    const char *name;
    BOOL (*init)(void);
    void (*poll)(InputStateC *out_state);
    void (*shutdown)(void);
} InputBackend;

extern const InputBackend INPUT_BACKEND_CUSTOM;
extern const InputBackend INPUT_BACKEND_AMIGAOS;

#endif /* AMBOID_INPUT_BACKEND_H */

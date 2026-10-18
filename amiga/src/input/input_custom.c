/*
 * AMBOID - Odczyt wejścia ze sprzętu Amigi (Joystick w porcie 2, CIA klawiatura)
 */

#include "../../include/input_backend.h"
#include <hardware/custom.h>
#include <hardware/cia.h>

extern volatile struct Custom custom;
extern volatile struct CIA ciaa;

static BOOL custom_input_init(void) {
    return TRUE;
}

static void custom_input_poll(InputStateC *out) {
    UWORD joy = custom.joy1dat;
    BOOL up    = !((joy >> 8) & 1) && !((joy >> 9) & 1);
    BOOL down  = ((joy >> 8) & 1) && ((joy >> 9) & 1);
    BOOL left  = !((joy) & 1) && !((joy >> 1) & 1);
    BOOL right = ((joy) & 1) && ((joy >> 1) & 1);
    BOOL fire  = !(ciaa.ciapra & (1 << 7)); /* Przycisk Fire w porcie 2 */

    out->dx = 0;
    out->dy = 0;
    if (left) out->dx = -1;
    if (right) out->dx = 1;
    if (up) out->dy = -1;
    if (down) out->dy = 1;

    out->fire_primary = fire;
    out->fire_secondary = FALSE;
    out->use_item = FALSE;
    out->inventory_next = FALSE;
    out->pause = FALSE;
}

static void custom_input_shutdown(void) {
}

const InputBackend INPUT_BACKEND_CUSTOM = {
    "Amiga Custom Chips (Port 2 Joystick)",
    custom_input_init,
    custom_input_poll,
    custom_input_shutdown,
};

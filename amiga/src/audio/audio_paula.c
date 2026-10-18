/*
 * AMBOID - Sterownik dźwięku Paula (4 kanały DMA, 8-bit PCM)
 */

#include "../../include/audio_backend.h"
#include <hardware/custom.h>
#include <hardware/dmabits.h>

extern volatile struct Custom custom;

static BOOL paula_init(void) {
    /* Wyłączenie DMA dźwięku na start */
    custom.dmacon = DMAF_AUD0 | DMAF_AUD1 | DMAF_AUD2 | DMAF_AUD3;
    return TRUE;
}

static void paula_play_sfx(UWORD sfx_id, UBYTE channel, UBYTE volume, UWORD period) {
    /* Ustawienie rejestrów kanału Paula (AUD0-AUD3):
     * AUDxLCH/AUDxLCL - adres próbki w Chip RAM
     * AUDxLEN - długość w słowach
     * AUDxPER - okres (częstotliwość próbkowania)
     * AUDxVOL - głośność 0-64
     * DMACON - uruchomienie kanału DMA
     */
}

static void paula_play_music(const UBYTE *mod_data) {
    /* Odtwarzacz tracker ProTracker 4ch */
}

static void paula_stop_all(void) {
    custom.dmacon = DMAF_AUD0 | DMAF_AUD1 | DMAF_AUD2 | DMAF_AUD3;
}

static void paula_shutdown(void) {
    paula_stop_all();
}

const AudioBackend AUDIO_BACKEND_PAULA = {
    "Paula Direct Hardware DMA (4ch 8-bit PCM)",
    paula_init,
    paula_play_sfx,
    paula_play_music,
    paula_stop_all,
    paula_shutdown,
};

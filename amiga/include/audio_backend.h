/*
 * AMBOID - Abstrakcyjny interfejs audio (Paula DMA 4ch / AHI)
 */

#ifndef AMBOID_AUDIO_BACKEND_H
#define AMBOID_AUDIO_BACKEND_H

#include "amboid.h"

typedef struct AudioBackend {
    const char *name;
    BOOL (*init)(void);
    void (*play_sfx)(UWORD sfx_id, UBYTE channel, UBYTE volume, UWORD period);
    void (*play_music)(const UBYTE *mod_data);
    void (*stop_all)(void);
    void (*shutdown)(void);
} AudioBackend;

extern const AudioBackend AUDIO_BACKEND_PAULA;
extern const AudioBackend AUDIO_BACKEND_AHI;

#endif /* AMBOID_AUDIO_BACKEND_H */

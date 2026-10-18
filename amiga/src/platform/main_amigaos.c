/*
 * AMBOID - Wersja dla AmigaOS / Workbench (Intuition + RTG / graphics.library)
 * Kompatybilna z Kickstart 3.1, AmigaOS 3.2 i 4.x.
 */

#include "../../include/amboid.h"
#include "../../include/map.h"
#include "../../include/inventory.h"
#include "../../include/render_backend.h"
#include "../../include/input_backend.h"
#include "../../include/audio_backend.h"

#include <proto/exec.h>
#include <proto/dos.h>
#include <proto/intuition.h>
#include <proto/graphics.h>
#include <intuition/intuition.h>

struct IntuitionBase *IntuitionBase = NULL;
struct GfxBase *GfxBase = NULL;
struct DosBase *DOSBase = NULL;

static struct Screen *screen = NULL;
static struct Window *window = NULL;

static BOOL open_amiga_libs(void) {
    DOSBase = (struct DosBase *)OpenLibrary("dos.library", 36);
    IntuitionBase = (struct IntuitionBase *)OpenLibrary("intuition.library", 36);
    GfxBase = (struct GfxBase *)OpenLibrary("graphics.library", 36);
    return DOSBase && IntuitionBase && GfxBase;
}

static void close_amiga_libs(void) {
    if (GfxBase) CloseLibrary((struct Library *)GfxBase);
    if (IntuitionBase) CloseLibrary((struct Library *)IntuitionBase);
    if (DOSBase) CloseLibrary((struct Library *)DOSBase);
}

int main(int argc, char **argv) {
    struct IntuiMessage *msg;
    BOOL running = TRUE;
    MapC game_map;
    InventoryC player_inv;
    PlayerState player;
    BPTR map_file;

    if (!open_amiga_libs()) {
        close_amiga_libs();
        return 20;
    }

    /* Otwarcie okna Workbench */
    window = OpenWindowTags(NULL,
        WA_Title, (ULONG)"AMBOID - Projekt Z (AmigaOS)",
        WA_Left, 20,
        WA_Top, 20,
        WA_InnerWidth, SCREEN_W,
        WA_InnerHeight, SCREEN_H,
        WA_IDCMP, IDCMP_CLOSEWINDOW | IDCMP_RAWKEY | IDCMP_MOUSEBUTTONS,
        WA_Flags, WFLG_CLOSEGADGET | WFLG_DRAGBAR | WFLG_DEPTHGADGET | WFLG_ACTIVATE,
        TAG_DONE);

    if (!window) {
        close_amiga_libs();
        return 20;
    }

    /* Inicjalizacja podsystemów */
    inventory_init(&player_inv, BASE_PLAYER_CAPACITY);
    player.x = 15;
    player.y = 15;
    player.hp = 100;
    player.max_hp = 100;
    player.dir = 0;

    /* Próba wczytania mapy AMB2 z dysku */
    map_file = Open("data/maps/sample_map.amb", MODE_OLDFILE);
    if (map_file) {
        UBYTE buffer[4096];
        LONG bytes = Read(map_file, buffer, sizeof(buffer));
        Close(map_file);
        if (bytes > 0) {
            map_load_amb(&game_map, buffer, bytes);
        }
    }

    /* Pętla zdarzeń Intuition */
    while (running) {
        while ((msg = (struct IntuiMessage *)GetMsg(window->UserPort))) {
            ULONG msg_class = msg->Class;
            UWORD msg_code = msg->Code;
            ReplyMsg((struct Message *)msg);

            if (msg_class == IDCMP_CLOSEWINDOW) {
                running = FALSE;
            } else if (msg_class == IDCMP_RAWKEY) {
                if (msg_code == 0x45) { /* Klawisz Escape */
                    running = FALSE;
                }
            }
        }

        /* Krótkie uśpienie dla kooperacji z systemem */
        Delay(1);
    }

    /* Sprzątanie */
    if (window) CloseWindow(window);
    close_amiga_libs();
    return 0;
}

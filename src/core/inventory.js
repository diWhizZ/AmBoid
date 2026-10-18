// Modularny system ekwipunku ze stackowaniem, dzieleniem stacków,
// kontenerami i tooltipami przygotowany pod HTML5 i eksport na Amigę.

import { ITEMS } from '../items.js';

export class ItemStack {
  constructor(id, count = 1, extra = {}) {
    this.id = id;
    this.count = Math.max(1, count | 0);
    if (extra.dur != null) this.dur = extra.dur;
    for (const k of Object.keys(extra)) {
      if (k !== 'id' && k !== 'count') this[k] = extra[k];
    }
  }

  clone() {
    return new ItemStack(this.id, this.count, this);
  }
}

export class Inventory {
  constructor(capacity = 10) {
    this.capacity = capacity;
    this.slots = [];
  }

  get length() {
    return this.slots.length;
  }

  get(index) {
    return this.slots[index] || null;
  }

  isFull() {
    return this.slots.length >= this.capacity;
  }

  freeSlots() {
    return Math.max(0, this.capacity - this.slots.length);
  }

  find(id) {
    return this.slots.find((it) => it.id === id) || null;
  }

  findAll(id) {
    return this.slots.filter((it) => it.id === id);
  }

  has(id, count = 1) {
    return this.count(id) >= count;
  }

  count(id) {
    return this.slots
      .filter((it) => it.id === id)
      .reduce((acc, it) => acc + it.count, 0);
  }

  totalWeight() {
    return this.slots.reduce((acc, it) => {
      const def = ITEMS[it.id];
      const w = def && def.weight != null ? def.weight : 0.1;
      return acc + w * it.count;
    }, 0);
  }

  // Dodawanie przedmiotu:
  // 1. Uzupełnia istniejące stacki (jeśli przedmiot jest stackowalny)
  // 2. Tworzy nowy stack w wolnym slocie
  // 3. Zwraca nadwyżkę (remaining), jeśli brak miejsca w ekwipunku
  addItem(item) {
    if (!item || !item.id) return { success: false, added: 0, remaining: 0 };
    const def = ITEMS[item.id];
    if (!def) return { success: false, added: 0, remaining: item.count || 1 };

    const maxStack = def.max_stack || def.stack || 1;
    const isStackable = !!def.stackable && maxStack > 1 && item.dur == null;
    let remaining = item.count != null ? item.count : 1;
    let added = 0;

    // 1. Najpierw uzupełniamy istniejące stacki
    if (isStackable) {
      for (const slot of this.slots) {
        if (slot.id === item.id && slot.count < maxStack) {
          const space = maxStack - slot.count;
          const move = Math.min(space, remaining);
          slot.count += move;
          remaining -= move;
          added += move;
          if (remaining <= 0) break;
        }
      }
    }

    // 2. Jeśli nadal pozostały sztuki, tworzymy nowe stacki
    while (remaining > 0 && this.slots.length < this.capacity) {
      const chunkSize = isStackable ? Math.min(remaining, maxStack) : 1;
      const newStack = new ItemStack(item.id, chunkSize, item);
      this.slots.push(newStack);
      remaining -= chunkSize;
      added += chunkSize;
      if (!isStackable && remaining > 0) {
        // kolejny obrót pętli dla kolejnej niestackowalnej sztuki
      }
    }

    return {
      success: added > 0,
      added,
      remaining, // nadwyżka pozostawiona na ziemi lub w kontenerze
    };
  }

  // Usuwanie przedmiotu z pierwszego dostępnego stacku;
  // usuwa stack, gdy osiągnie zero.
  removeItem(id, count = 1) {
    let left = count;
    let removed = 0;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const it = this.slots[i];
      if (it.id !== id) continue;
      if (it.count <= left) {
        left -= it.count;
        removed += it.count;
        this.slots.splice(i, 1);
      } else {
        it.count -= left;
        removed += left;
        left = 0;
      }
    }
    return removed;
  }

  // Usunięcie ze wskazanego slotu
  removeSlot(index, count = null) {
    if (index < 0 || index >= this.slots.length) return null;
    const it = this.slots[index];
    if (count == null || count >= it.count) {
      this.slots.splice(index, 1);
      return it;
    }
    it.count -= count;
    return new ItemStack(it.id, count, it);
  }

  // Podział stacku (np. wyciągnięcie 2 konserw ze stacku x5)
  splitStack(slotIndex, countToSplit) {
    if (slotIndex < 0 || slotIndex >= this.slots.length) {
      return { success: false, reason: 'INVALID_SLOT' };
    }
    const stack = this.slots[slotIndex];
    if (!stack || stack.count <= 1) {
      return { success: false, reason: 'NOT_SPLITTABLE' };
    }
    if (countToSplit <= 0 || countToSplit >= stack.count) {
      return { success: false, reason: 'INVALID_COUNT' };
    }
    if (this.slots.length >= this.capacity) {
      return { success: false, reason: 'INVENTORY_FULL' };
    }

    stack.count -= countToSplit;
    const newStack = new ItemStack(stack.id, countToSplit, stack);
    this.slots.push(newStack);
    return {
      success: true,
      newSlotIndex: this.slots.length - 1,
      splitStack: newStack,
    };
  }

  // Przenoszenie przedmiotów między ekwipunkami (np. gracz <-> kontener)
  transferTo(targetInventory, sourceSlotIndex, count = null) {
    if (sourceSlotIndex < 0 || sourceSlotIndex >= this.slots.length) {
      return { success: false, transferred: 0, reason: 'INVALID_SLOT' };
    }
    const stack = this.slots[sourceSlotIndex];
    const toMoveCount = count == null ? stack.count : Math.min(count, stack.count);
    if (toMoveCount <= 0) {
      return { success: false, transferred: 0, reason: 'ZERO_COUNT' };
    }

    const tempItem = { ...stack, count: toMoveCount };
    const result = targetInventory.addItem(tempItem);

    if (result.added > 0) {
      stack.count -= result.added;
      if (stack.count <= 0) {
        this.slots.splice(sourceSlotIndex, 1);
      }
    }

    return {
      success: result.added > 0,
      transferred: result.added,
      remainingInSource: stack.count > 0 ? stack.count : 0,
      targetRemaining: result.remaining,
    };
  }

  // Wyrzucenie przedmiotu na podłogę
  dropToFloor(slotIndex, count = null, world = null, x = 0, y = 0) {
    const dropped = this.removeSlot(slotIndex, count);
    if (!dropped) return null;
    if (world && typeof world.dropItem === 'function') {
      world.dropItem(x, y, dropped);
    }
    return dropped;
  }

  // Formatowanie tooltipa dla przedmiotu
  formatTooltip(slotIndexOrItem) {
    const item = typeof slotIndexOrItem === 'number' ? this.get(slotIndexOrItem) : slotIndexOrItem;
    if (!item) return null;
    const def = ITEMS[item.id] || {};

    const name = def.name || item.id;
    const desc = def.desc || '';
    const category = def.category || def.type || 'ogólne';
    const weight = def.weight != null ? (def.weight * item.count).toFixed(2) : '0.10';
    const unitWeight = def.weight != null ? def.weight.toFixed(2) : '0.10';
    const maxStack = def.max_stack || def.stack || 1;
    const value = def.value != null ? def.value * item.count : 0;
    const stackableStr = def.stackable ? `tak (max ${maxStack})` : 'nie';

    let condition = null;
    if (def.durability) {
      const curDur = item.dur != null ? item.dur : def.durability;
      condition = `${curDur}/${def.durability} (${Math.round((curDur / def.durability) * 100)}%)`;
    }

    return {
      id: item.id,
      name,
      count: item.count,
      label: item.count > 1 ? `${name} x${item.count}` : name,
      desc,
      category,
      weight: `${weight} kg (${unitWeight} kg/szt.)`,
      value: `${value} $`,
      condition,
      stackable: stackableStr,
      maxStack,
      use: def.use || null,
      lines: [
        item.count > 1 ? `${name.toUpperCase()} x${item.count}` : name.toUpperCase(),
        `Typ: ${category.toUpperCase()}`,
        desc ? `"${desc}"` : null,
        condition ? `Stan: ${condition}` : null,
        `Waga: ${weight} kg`,
        `Max stack: ${maxStack}`,
      ].filter(Boolean),
    };
  }
}

// System kontenerów (skrzynie, plecaki, szafki, pojazdy)
export class Container {
  constructor(type, x = 0, y = 0, options = {}) {
    this.type = type; // crate, backpack, shelf, fridge, counter, car, dumpster, corpse
    this.x = x;
    this.y = y;
    this.searched = !!options.searched;
    this.name = options.name || CONTAINER_DISPLAY_NAMES[type] || 'KONTENER';
    const cap = options.capacity || CONTAINER_CAPACITIES[type] || 6;
    this.inventory = new Inventory(cap);
    if (options.loot && Array.isArray(options.loot)) {
      for (const item of options.loot) {
        this.inventory.addItem(item);
      }
    }
  }

  isSearched() {
    return this.searched;
  }

  setSearched(searched = true) {
    this.searched = searched;
  }

  transferToPlayer(slotIndex, playerInventory, count = null) {
    return this.inventory.transferTo(playerInventory, slotIndex, count);
  }

  transferFromPlayer(playerSlotIndex, playerInventory, count = null) {
    return playerInventory.transferTo(this.inventory, playerSlotIndex, count);
  }
}

export const CONTAINER_DISPLAY_NAMES = {
  fridge: 'LODÓWKA',
  shelf: 'PÓŁKA',
  counter: 'SZAFKA',
  crate: 'SKRZYNIA',
  backpack: 'PLECAK',
  trash: 'ŚMIETNIK',
  dumpster: 'KONTENER',
  car: 'BAGAŻNIK',
  corpse: 'CIAŁO',
  table: 'STÓŁ',
};

export const CONTAINER_CAPACITIES = {
  fridge: 8,
  shelf: 6,
  counter: 6,
  crate: 12,
  backpack: 8,
  trash: 4,
  dumpster: 12,
  car: 16,
  corpse: 4,
  table: 4,
};

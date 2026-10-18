// Eksport danych przykładowej mapy Tiled dla środowiska przeglądarki i Node.js
export const SAMPLE_TILED_MAP = {
  "height": 16,
  "width": 16,
  "tileheight": 32,
  "tilewidth": 64,
  "orientation": "isometric",
  "layers": [
    {
      "name": "floor",
      "data": [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 2, 2, 2, 1, 1, 4, 4, 4, 1, 1, 1, 1,
        1, 1, 1, 1, 2, 2, 2, 1, 1, 4, 4, 4, 1, 1, 1, 1,
        1, 1, 1, 1, 2, 2, 2, 1, 1, 4, 4, 4, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 1, 1, 1,
        1, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
      ]
    },
    {
      "name": "walls",
      "data": [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 10, 0, 0, 11, 0, 0, 10, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 10, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 10, 10, 0, 10, 10, 10, 10, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    },
    {
      "name": "doors",
      "objects": [
        { "id": 1, "name": "main_door", "x": 5, "y": 12, "properties": [{ "name": "state", "value": "closed" }, { "name": "material", "value": "wood" }] },
        { "id": 2, "name": "internal_door", "x": 6, "y": 10, "properties": [{ "name": "state", "value": "open" }, { "name": "material", "value": "wood" }] }
      ]
    },
    {
      "name": "objects",
      "objects": [
        { "id": 10, "name": "supply_crate", "type": "container", "x": 4, "y": 9, "properties": [{ "name": "container_type", "value": "crate" }, { "name": "loot", "value": "[{\"id\":\"canned_food\",\"count\":5}]" }] },
        { "id": 11, "name": "ground_bandage", "type": "ground_item", "x": 7, "y": 9, "properties": [{ "name": "item_id", "value": "bandage" }, { "name": "count", "value": 2 }] },
        { "id": 12, "name": "ground_key", "type": "ground_item", "x": 8, "y": 9, "properties": [{ "name": "item_id", "value": "key" }, { "name": "count", "value": 1 }] },
        { "id": 13, "name": "car_wreck", "type": "prop", "x": 2, "y": 2, "properties": [{ "name": "kind", "value": "car" }] },
        { "id": 14, "name": "tree_large", "type": "prop", "x": 13, "y": 2, "properties": [{ "name": "kind", "value": "tree" }] }
      ]
    },
    {
      "name": "spawn",
      "objects": [
        { "id": 20, "name": "player_spawn", "type": "spawn_player", "x": 5, "y": 14 },
        { "id": 21, "name": "zombie_guard", "type": "spawn_zombie", "x": 10, "y": 6 }
      ]
    }
  ]
};

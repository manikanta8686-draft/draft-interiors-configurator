import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ROOM_SCENE_ID, getRoomScene, ROOM_SCENES } from "../src/viewer/roomScenes.js";

test("room visualizer exposes stable unique premium scene choices", () => {
  assert.equal(ROOM_SCENES.length, 3);
  assert.equal(new Set(ROOM_SCENES.map((scene) => scene.id)).size, ROOM_SCENES.length);
  assert.ok(ROOM_SCENES.every((scene) => scene.label && scene.description));
});

test("room visualizer defaults safely for missing and retired scene ids", () => {
  assert.equal(getRoomScene().id, DEFAULT_ROOM_SCENE_ID);
  assert.equal(getRoomScene("retired-room").id, DEFAULT_ROOM_SCENE_ID);
  assert.equal(getRoomScene("stone-gallery").label, "Gallery");
});

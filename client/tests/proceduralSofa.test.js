import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultConfiguration, getViewerConfiguration } from "../src/configurator/configuration.js";
import { sofaModels } from "../src/data/sofas.js";
import {
  calculateCameraFraming,
  calculateCushionLayout,
  calculateProceduralDimensions,
  resolveLegFinish,
} from "../src/viewer/proceduralSofa.js";
import { easePremium, PREMIUM_MOTION, resolveViewerMotion } from "../src/motion/premiumMotion.js";

test("procedural dimensions preserve size tiers and expand chaise depth", () => {
  const compact = calculateProceduralDimensions({ size: "Compact" });
  const standard = calculateProceduralDimensions({ size: "Standard" });
  const grand = calculateProceduralDimensions({ size: "Grand" });
  const chaise = calculateProceduralDimensions({ size: "Standard", type: "Chaise" });

  assert.ok(compact.width < standard.width);
  assert.ok(standard.width < grand.width);
  assert.equal(compact.seatTop, standard.seatTop);
  assert.ok(chaise.depth > standard.depth);
  assert.equal(chaise.chaise, true);
});

test("every catalogue model crosses the serializable viewer boundary safely", () => {
  for (const model of sofaModels) {
    const viewerConfiguration = getViewerConfiguration(createDefaultConfiguration(model), model);
    const dimensions = calculateProceduralDimensions(viewerConfiguration);
    assert.ok(Number.isFinite(dimensions.width));
    assert.ok(Number.isFinite(dimensions.depth));
    assert.doesNotThrow(() => JSON.stringify(viewerConfiguration));
  }
});

test("cushion layout is deterministic, symmetric, and honours the persisted count", () => {
  const first = calculateCushionLayout({ width: 4.15, cushions: 5 });
  const second = calculateCushionLayout({ width: 4.15, cushions: 5 });

  assert.deepEqual(first, second);
  assert.equal(first.length, 5);
  assert.equal(first[0].x, -first[4].x);
  assert.equal(first[1].x, -first[3].x);
});

test("chaise layout extends only its final seat cushion", () => {
  const cushions = calculateCushionLayout({ width: 4.15, cushions: 3, chaise: true });
  assert.equal(cushions[0].seatDepth, cushions[1].seatDepth);
  assert.ok(cushions[2].seatDepth > cushions[1].seatDepth);
});

test("camera framing expands with sofa bounds and retains safe zoom limits", () => {
  const compact = calculateCameraFraming(calculateProceduralDimensions({ size: "Compact" }));
  const grand = calculateCameraFraming(calculateProceduralDimensions({ size: "Grand" }));
  const narrow = calculateCameraFraming(calculateProceduralDimensions({ size: "Grand" }), 0.85);

  assert.ok(grand.position[0] > compact.position[0]);
  assert.ok(grand.position[2] > compact.position[2]);
  assert.ok(grand.minDistance < grand.maxDistance);
  assert.ok(narrow.position[2] > grand.position[2]);
});

test("leg finishes remain distinct and unknown values fail safely", () => {
  assert.notDeepEqual(resolveLegFinish("Oak"), resolveLegFinish("Walnut"));
  assert.equal(resolveLegFinish("Brass").metalness, 0.82);
  assert.deepEqual(resolveLegFinish("unknown"), resolveLegFinish("Oak"));
});

test("reduced motion disables reveal travel and duration", () => {
  assert.deepEqual(resolveViewerMotion(true), { revealDuration: 0, cameraDuration: 0, settleDistance: 0 });
  assert.ok(resolveViewerMotion(false).revealDuration > 0);
  assert.ok(resolveViewerMotion(false).settleDistance > 0);
});

test("premium motion uses restrained timing and non-overshooting ease-in-out", () => {
  assert.ok(PREMIUM_MOTION.uiDuration >= 0.15 && PREMIUM_MOTION.uiDuration <= 0.3);
  assert.ok(PREMIUM_MOTION.viewerDuration >= 0.3 && PREMIUM_MOTION.viewerDuration <= 0.6);
  assert.equal(easePremium(-1), 0);
  assert.equal(easePremium(0), 0);
  assert.equal(easePremium(0.5), 0.5);
  assert.equal(easePremium(1), 1);
  assert.equal(easePremium(2), 1);
});

# Draft Interiors 3D Asset Standard

**Standard ID:** DI-3D-ASSET-001<br>
**Version:** 1.0.0<br>
**Status:** Draft for approval<br>
**Reference asset:** Butterfly<br>
**Runtime target:** Draft Interiors web configurator

This document is the mandatory production rulebook for every Draft Interiors sofa asset. It separates art production from application code so Butterfly, Mercer, and future products can use the same loading, material, validation, and configuration architecture.

The words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** describe requirement strength. An asset cannot be approved while any MUST rule fails.

## 1. Asset lifecycle

Every asset moves through these states:

1. `reference-ready` — measurements and photographs are approved.
2. `authoring` — source geometry and materials are being created.
3. `review` — first GLB is available for physical and visual comparison.
4. `validated` — automated structural and performance checks pass.
5. `approved` — business, visual, and technical owners approve the asset.
6. `active` — an approved manifest maps the asset to a catalogue model.
7. `retired` — the asset remains versioned but is no longer selected for new configurations.

No asset may move directly from `authoring` to `active`.

## 2. Folder structure

Use lowercase kebab-case model and variant identifiers. Version folders are immutable after approval.

```text
assets/
└── products/
    └── butterfly/
        ├── manifest.json
        ├── source/
        │   ├── butterfly-v1.blend
        │   └── textures/
        │       ├── upholstery-basecolor-master.png
        │       ├── upholstery-normal-master.png
        │       ├── upholstery-roughness-master.png
        │       └── upholstery-ao-master.png
        ├── delivery/
        │   └── 1.0.0/
        │       ├── models/
        │       │   ├── butterfly-1880-lod0.glb
        │       │   ├── butterfly-1880-lod1.glb
        │       │   └── butterfly-1880-lod2.glb
        │       ├── previews/
        │       │   ├── butterfly-1880-front.webp
        │       │   └── butterfly-1880-hero.webp
        │       ├── reports/
        │       │   ├── gltf-validator.json
        │       │   ├── asset-validation.json
        │       │   └── physical-digital-qa.csv
        │       └── checksums.sha256
        └── references/
            ├── measurements.xlsx
            ├── photography/
            └── notes.md
```

Rules:

- `source/` contains editable working files and lossless master textures.
- `delivery/<version>/` contains only runtime-ready, reproducible output.
- Runtime files MUST NOT reference absolute local paths.
- Approved version folders MUST NOT be overwritten. Corrections create a new semantic version.
- Reference photography MUST NOT be shipped to the public website unless separately approved.

## 3. File naming

Use ASCII lowercase kebab-case for files and identifiers.

```text
<model-id>-<variant-id>-<lod>.<extension>
butterfly-1880-lod0.glb
butterfly-1880-front.webp
```

Do not use spaces, dates as versions, artist initials, or suffixes such as `final`, `final2`, or `latest`.

## 4. Delivery format

- Runtime geometry MUST use binary **glTF 2.0** with the `.glb` extension.
- A GLB MUST be self-contained unless the manifest explicitly declares external runtime resources.
- Exported assets MUST NOT contain cameras, lights, animation tracks, or environment geometry unless required by an approved product feature.
- Hidden, disabled, helper, reference, and collision meshes MUST NOT be exported.
- Unsupported vendor-only extensions MUST NOT be required for the primary asset.
- Draco or Meshopt geometry compression MAY be used only when the runtime decoder and fallback policy are verified.
- KTX2 textures SHOULD use `KHR_texture_basisu`; assets requiring it MUST declare the extension correctly.

## 5. Coordinate system, scale, and orientation

The Draft Interiors standard is:

- Units: metres.
- Up axis: +Y.
- Product front direction: +Z.
- Product right direction when viewed from the front: +X.
- Whole-sofa origin: centre of the floor-contact footprint at Y = 0.
- Lowest intentional floor-contact point: Y = 0 within 1 mm.
- Applied object scale: `(1, 1, 1)`.
- Applied object rotation: `(0, 0, 0)` at export.

The model MUST open at correct real-world scale without importer-specific scale compensation.

## 6. Geometry construction

- Model the visible production silhouette, not the internal manufacturing frame, unless internal construction is a customer-facing feature.
- Remove hidden geometry that cannot affect silhouette, shadows, deformation, or material transitions.
- Avoid duplicate coplanar faces, zero-area triangles, non-manifold accidental seams, inverted normals, and isolated vertices.
- Use smooth shading and deliberate hard edges. Do not rely on extreme subdivision levels to hide poor topology.
- Cushion softness, piping, tufting, seam tension, and upholstery compression SHOULD be represented in geometry or normal data according to their effect on silhouette.
- Do not bake studio lighting, ambient shadows, reflections, or colour grading into base-colour textures.
- Separate geometry variants MUST be authored for materially different sizes. Do not create production sizes by non-uniformly stretching one sofa.

## 7. Semantic mesh naming

Names MUST use lowercase snake_case and match the manifest exactly.

Required Butterfly reference roles:

```text
frame
arm_left
arm_right
seat_cushion_01
seat_cushion_02
seat_cushion_03
back_cushion_01
back_cushion_02
back_cushion_03
leg_front_left
leg_front_right
leg_rear_left
leg_rear_right
leg_support_center
```

Optional roles follow the same pattern:

```text
piping_frame
piping_seat_01
stitching_seat_01
button_back_01
hardware_visible_01
decorative_cushion_01
```

Rules:

- Names such as `Cube.001`, `Object12`, and `Mesh003` are prohibited.
- `left` and `right` are always from the seated customer’s perspective.
- Numeric suffixes are two digits and increase from customer-left to customer-right.
- A required role MUST resolve to exactly one node unless the manifest explicitly declares a repeated role.
- Object and mesh data names SHOULD match before export.

## 8. Pivot rules

- Whole sofa: floor-centre origin.
- Seat and back cushions: geometric centre of the individual cushion.
- Arms: centre of the arm’s local bounds.
- Legs: bottom centre at the floor-contact point.
- Hinged, reclining, sliding, or removable components: pivot at the real mechanical axis.
- Pivots MUST remain stable across LODs and material variants.

## 9. Semantic material naming

Material names MUST use lowercase snake_case and describe function rather than colour.

```text
upholstery_primary
upholstery_accent
piping
stitching
legs_matte_black
frame_visible_metal
feet_plastic
buttons
hardware_visible
```

Rules:

- Do not encode customer colour names into reusable material roles.
- Customer-selectable surfaces MUST have stable roles across models and LODs.
- Material swapping MUST NOT require reloading geometry when only fabric, colour, or finish changes.
- Merge identical non-configurable materials where this reduces draw calls without destroying semantic control.

## 10. PBR material rules

- Use the metallic-roughness PBR workflow supported by glTF 2.0.
- Base colour uses sRGB colour interpretation.
- Normal, roughness, metallic, and ambient-occlusion data use linear/non-colour interpretation.
- Dielectric upholstery uses metallic = 0.
- Velvet, bouclé, linen, leather, and suede require distinct calibrated roughness and normal response; colour alone is insufficient.
- Clearcoat MUST NOT be used as a substitute for correct leather roughness.
- Fabric grain direction and physical texture scale MUST remain consistent across separate meshes.
- Material values MUST be reviewed under a neutral studio environment and at least one warm showroom environment.

## 11. Texture standards

### Source masters

- Source masters MUST be lossless PNG, TIFF, EXR, or an approved layered authoring format.
- Source masters SHOULD be 4K or higher when captured/scanned, even if delivery textures are smaller.
- Source files MUST retain enough bit depth to avoid banding or normal-map degradation.

### Runtime delivery

| Map | Runtime format | LOD0 maximum | LOD1 maximum | Colour space |
|---|---|---:|---:|---|
| Base colour | KTX2; PNG/JPEG fallback | 4096² | 2048² | sRGB |
| Normal | KTX2; PNG fallback | 4096² | 2048² | Linear |
| Roughness | KTX2; PNG fallback | 2048² | 2048² | Linear |
| Ambient occlusion | KTX2; PNG fallback | 2048² | 1024² | Linear |
| Metallic | KTX2; PNG fallback | 1024² | 1024² | Linear |
| Preview/thumbnail | WebP | As required | As required | sRGB |

Additional rules:

- Power-of-two dimensions are required for runtime material textures.
- Roughness, metallic, and AO MAY be channel-packed when the target material and exporter preserve glTF channel conventions.
- Do not include a metallic map for fully dielectric upholstery when a scalar value is sufficient.
- Normal-map strength must be physically restrained and verified at real-world camera distances.
- Every runtime texture requires a documented physical repeat scale.
- Visible seams caused by tiling, colour shifts, or mismatched UV orientation fail review.

## 12. UV rules

- Every textured mesh MUST have a valid UV set.
- UVs MUST remain inside the intended tile space unless the material explicitly uses repeated coordinates.
- Upholstery UV direction MUST follow fabric warp/weft direction consistently.
- Mirrored UVs are prohibited where they reverse visible grain, logos, asymmetric stitching, or normal-map direction.
- AO/lightmap UVs, when used, MUST be non-overlapping and sufficiently padded.
- UV islands require padding appropriate to the final texture resolution and compression.
- LODs SHOULD preserve material scale and texture orientation even when topology changes.

## 13. Triangle, draw-call, and file budgets

Budgets apply to one configured sofa visible in the viewer.

| Tier | Purpose | Triangle target | Compressed GLB target |
|---|---|---:|---:|
| LOD0 | Desktop hero/review | 100k–180k | ≤ 8 MB |
| LOD1 | Mobile/default runtime | 45k–70k | ≤ 5 MB |
| LOD2 | Thumbnail/distant preview | 15k–30k | ≤ 2 MB |

Component guidance for LOD1:

| Component | Triangle guidance |
|---|---:|
| Upholstered frame and arms | 20k–35k |
| Each cushion | 2k–5k |
| Each leg | 300–800 |
| Piping, seams, buttons, visible hardware | Remaining verified budget |

Additional gates:

- Draw calls: target ≤ 20; hard maximum 30 without written exception.
- Materials: target ≤ 8 active material slots.
- Texture GPU memory MUST be measured, not inferred from compressed download size.
- Budgets are quality gates, not permission to waste geometry. Silhouette and close-up quality determine where triangles are spent.

## 14. LOD strategy

- Deliver separate versioned GLBs for LOD0, LOD1, and LOD2. Do not depend on a non-ratified automatic LOD extension.
- Every LOD MUST preserve overall dimensions, origin, pivots, mesh-role compatibility, material-role compatibility, and configuration behavior.
- Reduce hidden curvature, stitch geometry, piping segments, and cushion subdivisions before degrading the main silhouette.
- LOD transitions MUST NOT visibly change overall scale, floor contact, fabric direction, or selected material.
- The manifest selects LOD according to device capability, viewport, and quality policy.

## 15. Blender authoring and export

Before export:

1. Work in metric units with unit scale 1.0.
2. Confirm dimensions numerically against the approved specification.
3. Apply rotation and scale.
4. Recalculate and inspect outward normals.
5. Remove hidden/helper collections from export selection.
6. Confirm semantic node and material names.
7. Verify UVs, texture colour spaces, and physical repeat scale.
8. Save the source `.blend` before generating delivery files.

Recommended glTF exporter settings:

- Format: glTF Binary (`.glb`).
- Include: selected approved export collection only.
- Transform: +Y Up.
- Data: meshes and materials required by the manifest.
- Apply modifiers: enabled for delivery geometry.
- Cameras: disabled.
- Punctual lights: disabled.
- Animations: disabled unless required by an approved feature.
- Custom properties: only approved metadata; no personal or workstation information.

After export, reopen the GLB in a clean scene or independent viewer. A successful Blender export alone is not approval.

## 16. Manifest standard

The application-side contract in `client/src/assets/productionAssets.js` is authoritative. Delivery metadata MUST represent the same information.

```json
{
  "schemaVersion": 1,
  "id": "butterfly",
  "displayName": "Butterfly",
  "catalogueModelId": null,
  "version": "1.0.0",
  "status": "review",
  "coordinateSystem": {
    "units": "metres",
    "upAxis": "Y",
    "origin": "floor-centre",
    "forwardAxis": "Z"
  },
  "variants": [
    {
      "id": "butterfly-1880",
      "label": "1880 × 900 mm",
      "assetUri": "delivery/1.0.0/models/butterfly-1880-lod1.glb",
      "fallbackImageUri": "delivery/1.0.0/previews/butterfly-1880-front.webp",
      "expectedBoundsMetres": { "x": 1.88, "y": 1.02, "z": 0.9 },
      "status": "review",
      "lods": {
        "lod0": "delivery/1.0.0/models/butterfly-1880-lod0.glb",
        "lod1": "delivery/1.0.0/models/butterfly-1880-lod1.glb",
        "lod2": "delivery/1.0.0/models/butterfly-1880-lod2.glb"
      }
    }
  ]
}
```

`assetUri` is the default runtime delivery (normally LOD1). The optional `lods` block supports capability-based selection without changing business identifiers. `catalogueModelId` remains `null` until explicit activation approval. An asset id and a marketing/catalogue id are separate concepts.

## 17. Physical versus digital QA

Measure the exported GLB independently. Do not copy intended measurements into the Digital column without measuring the file.

| Check | Physical Butterfly | Digital model | Tolerance | Result |
|---|---:|---:|---:|---|
| Overall width | 1880 mm | Pending | ±10 mm | Pending |
| Overall depth | 900 mm | Pending | ±10 mm | Pending |
| Maximum height including cushions | 1020 mm | Pending | ±20 mm | Pending |
| Upholstered frame height | 900 mm | Pending | ±10 mm | Pending |
| Seat height | 450 mm | Pending | ±10 mm | Pending |
| Usable seat depth | 560 mm | Pending | ±15 mm | Pending |
| Arm height from floor | 700 mm | Pending | ±10 mm | Pending |
| Leg height | 200 mm | Pending | ±5 mm | Pending |

Soft cushions may use the larger documented tolerance because compression and dressing vary. Hard frame and leg dimensions use the tighter tolerance.

Visual comparison must include front, rear, both sides, both 45° views, top view, leg close-up, cushion close-up, piping, stitching, and fabric response.

## 18. Automated validation

Every delivery candidate MUST produce machine-readable reports for:

- glTF 2.0 schema and binary validity.
- Missing or unsupported resources.
- Required mesh roles.
- Required material roles.
- Bounds and floor contact.
- Non-finite transforms and dimensions.
- Triangle, material, draw-call, and texture counts.
- Texture resolution and colour-space declarations.
- File size and checksum.

The official Khronos glTF Validator MUST report zero errors. Warnings require review and an explicit disposition; they must not be ignored automatically.

## 19. Manual validation checklist

### Geometry

- [ ] Physical dimensions and digital bounds pass tolerance.
- [ ] Sofa faces +Z and sits at Y = 0.
- [ ] Origin and all component pivots follow the standard.
- [ ] Transforms are applied.
- [ ] No hidden/helper meshes are exported.
- [ ] No inverted normals, accidental holes, z-fighting, or duplicate faces.
- [ ] Silhouette matches every approved reference angle.

### Mesh and material roles

- [ ] Every required mesh role exists and is uniquely resolvable.
- [ ] Every required material role exists.
- [ ] Fabric and finish swapping affect only intended surfaces.
- [ ] No generic Blender-generated names remain.

### Textures and UVs

- [ ] No missing textures or absolute paths.
- [ ] Correct sRGB/linear interpretation.
- [ ] Consistent physical fabric scale and direction.
- [ ] No visible tiling seams or inappropriate mirrored UVs.
- [ ] Runtime compression and fallbacks load correctly.

### Performance

- [ ] Triangle, draw-call, material, texture-memory, and file-size budgets pass.
- [ ] LODs preserve dimensions, pivots, roles, and materials.
- [ ] Initial load and interaction remain smooth on the agreed mobile reference device.

### Presentation

- [ ] Neutral studio lighting review passes.
- [ ] Warm showroom lighting review passes.
- [ ] Desktop and compact-screen framing pass.
- [ ] Orbit, zoom, reset, material changes, and fallback behavior pass.

## 20. Quality gates and approval

Activation requires all seven gates:

1. Physical-dimension QA.
2. Visual likeness review.
3. glTF structural validation.
4. Mesh/material/texture contract validation.
5. Performance-budget validation.
6. Configurator integration and fallback testing.
7. Cross-browser and representative-device testing.

Approval must record asset id, semantic version, checksum, reviewer, date, test results, and any accepted exceptions. Only an approved version may receive a non-null `catalogueModelId` and `active` status.

## 21. Versioning

- Patch (`1.0.1`): optimization or invisible correction with unchanged roles and dimensions.
- Minor (`1.1.0`): compatible new variant, material role, or optional feature.
- Major (`2.0.0`): changed mesh/material contract, pivots, coordinate rules, or incompatible configuration behavior.

Saved customer configurations store stable business ids, not asset versions. Asset-version changes MUST remain backward compatible or provide an explicit migration/fallback policy.

## 22. Reference implementation boundary

Butterfly is an engineering reference and MUST NOT be displayed as Mercer. Mercer and the existing catalogue remain unchanged until separately approved. Butterfly activation requires a production GLB, completed validation reports, visual approval, and an explicit catalogue mapping decision.

## 23. Authoritative technical references

- [Khronos glTF 2.0 specification and extension registry](https://github.com/KhronosGroup/glTF)
- [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator)
- [Blender glTF 2.0 exporter documentation](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)

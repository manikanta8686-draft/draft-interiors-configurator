# Phase 5B — Production Product Asset Pipeline

Butterfly is the first physical reference model for the production pipeline. It is intentionally not mapped to a user-facing catalogue entry yet. The current procedural viewer remains labelled illustrative until an authored GLB passes this contract.

## Pipeline boundary

The persisted configuration remains unchanged: `modelId`, `fabricId`, `colourId`, `size`, `legs`, and `cushions`. The viewer boundary now also carries the exact catalogue model id and exact size label. A production asset registry resolves that identity to a versioned geometry variant.

The registry must fail closed. Missing, invalid, or incomplete production files use the existing illustrative preview; they are never silently presented as the configured production sofa.

## Butterfly reference dimensions

All authoring happens in metres, using the confirmed millimetre measurements below:

- Overall width: 1880 mm
- Overall depth: 900 mm
- Maximum height including loose cushions: 1020 mm
- Upholstered frame height: 900 mm
- Floor-to-seat height: 450 mm
- Usable seat depth: 560 mm
- Seat cushions: 3 × 580 mm wide × 200 mm thick
- Back cushions: 3 × 560 × 560 × 200 mm
- Back frame height above seat: 450 mm
- Arm width: 75 mm
- Floor-to-arm height: 700 mm
- Leg height: 200 mm

The code source of truth is `client/src/assets/productionAssets.js`.

## Authoring contract

- Real-world scale in metres.
- Y-up, forward along Z, origin at the centre of the floor contact plane.
- Applied object transforms and clean outward-facing normals.
- Separate semantic meshes for frame, arms, three seat cushions, three back cushions, individual legs, and centre support.
- Separate semantic materials for primary upholstery, piping, stitching, and matte-black metal legs.
- No baked studio lighting, shadows, or colour grading.
- Fabric direction and physical texture scale must be consistent across every upholstered part.
- Preserve the observed soft cushion deformation, button tufting, piping, double stitching, slim arms, rear shell, and tapered bolted legs.

## Texture contract

- Base colour: sRGB.
- Normal, roughness, and ambient occlusion: linear/non-colour data.
- Tileable source maps with no baked highlights or shadows.
- KTX2 delivery for production, with a 2K mobile set and optional 4K desktop upholstery set.
- Texture slots are assigned by semantic material role rather than Blender-generated material names.

## GLB acceptance checks

1. Bounds match 1.88 × 1.02 × 0.90 metres within a 10 mm authoring tolerance.
2. Lowest leg contact is at Y = 0 and the model is centred on X/Z.
3. Every required mesh and material role exists exactly once unless the manifest explicitly allows a repeated role.
4. No missing textures, unsupported external file references, hidden geometry, or duplicate coplanar faces.
5. Cushion count, tufting, piping, seams, rear silhouette, and five-leg support arrangement match the approved photographs.
6. GLB and textures meet the agreed mobile/desktop file budgets before activation.
7. Automated validation, desktop review, compact-screen review, and fallback behavior all pass.

## Activation sequence

1. Receive the authored Butterfly GLB and texture package.
2. Run geometry, role, bounds, texture, and file-size validation.
3. Add the versioned file URI to the Butterfly manifest.
4. Integrate the generic GLB viewer behind the current viewer boundary.
5. Compare the rendered model against the reference photographs.
6. Only then map Butterfly to an approved catalogue id and enable it for customers.

Mercer and future sofas reuse this contract by supplying a new manifest, measured geometry variants, semantic mesh roles, texture sets, and fallback imagery. They do not require changes to saved-configuration architecture.

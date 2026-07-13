import { useEffect, useMemo, useState } from "react";
import { MeshPhysicalMaterial, Vector2 } from "three";
import { resolveFabricPresentation, resolveSofaMaterial } from "./materialResolver.js";
import { getCachedTextureState, loadCachedTexture } from "./textureCache.js";

function useCachedTexture(reference, kind, repeat) {
  const [state, setState] = useState(() => getCachedTextureState(reference, kind, repeat));

  useEffect(() => {
    let active = true;
    const current = getCachedTextureState(reference, kind, repeat);
    setState(current);
    if (!reference || current.status === "ready" || current.status === "error") return undefined;

    setState({ status: "loading", texture: null, error: null });
    loadCachedTexture(reference, kind, repeat).then(() => {
      if (active) setState(getCachedTextureState(reference, kind, repeat));
    });
    return () => { active = false; };
  }, [reference, kind, repeat]);

  return state;
}

export function useSofaMaterial(input) {
  const { color, fabricId, material: materialMetadata, texture } = input;
  const resolved = useMemo(
    () => resolveSofaMaterial({ color, material: materialMetadata, texture }),
    [color, materialMetadata, texture],
  );
  const baseColor = useCachedTexture(resolved.maps.baseColor, "baseColor", resolved.repeat);
  const normal = useCachedTexture(resolved.maps.normal, "normal", resolved.repeat);
  const roughness = useCachedTexture(resolved.maps.roughness, "roughness", resolved.repeat);
  const presentation = useMemo(() => resolveFabricPresentation(fabricId), [fabricId]);
  const material = useMemo(() => new MeshPhysicalMaterial({
    color: resolved.color,
    roughness: Math.max(resolved.roughness, presentation.roughnessFloor),
    metalness: 0,
    map: baseColor.texture,
    normalMap: normal.texture,
    normalScale: new Vector2(presentation.normalStrength, presentation.normalStrength),
    roughnessMap: roughness.texture,
    sheen: presentation.sheen,
    sheenColor: "#f7f7f4",
    sheenRoughness: presentation.sheenRoughness,
    clearcoat: presentation.clearcoat,
    clearcoatRoughness: presentation.clearcoatRoughness,
    specularIntensity: presentation.specularIntensity,
    envMapIntensity: presentation.envMapIntensity,
  }), [baseColor.texture, normal.texture, presentation, resolved.color, resolved.roughness, roughness.texture]);

  useEffect(() => () => material.dispose(), [material]);

  const textureStates = [baseColor, normal, roughness];
  const status = textureStates.some((state) => state.status === "loading")
    ? "loading"
    : textureStates.some((state) => state.status === "error") ? "error" : "ready";

  return { material, status };
}

import { useEffect, useMemo, useState } from "react";
import { MeshStandardMaterial } from "three";
import { resolveSofaMaterial } from "./materialResolver.js";
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
  const { color, material: materialMetadata, texture } = input;
  const resolved = useMemo(
    () => resolveSofaMaterial({ color, material: materialMetadata, texture }),
    [color, materialMetadata, texture],
  );
  const baseColor = useCachedTexture(resolved.maps.baseColor, "baseColor", resolved.repeat);
  const normal = useCachedTexture(resolved.maps.normal, "normal", resolved.repeat);
  const roughness = useCachedTexture(resolved.maps.roughness, "roughness", resolved.repeat);
  const material = useMemo(() => new MeshStandardMaterial({
    color: resolved.color,
    roughness: resolved.roughness,
    metalness: resolved.metalness,
    map: baseColor.texture,
    normalMap: normal.texture,
    roughnessMap: roughness.texture,
  }), [baseColor.texture, normal.texture, resolved.color, resolved.metalness, resolved.roughness, roughness.texture]);

  useEffect(() => () => material.dispose(), [material]);

  const textureStates = [baseColor, normal, roughness];
  const status = textureStates.some((state) => state.status === "loading")
    ? "loading"
    : textureStates.some((state) => state.status === "error") ? "error" : "ready";

  return { material, status };
}

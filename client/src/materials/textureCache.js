import { NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader } from "three";

const textureLoader = new TextureLoader();
const textureCache = new Map();

export function getTextureCacheKey(reference, kind, repeat = [1, 1]) {
  return reference ? `${kind}:${reference}:${repeat[0]}x${repeat[1]}` : null;
}

export function getCachedTextureState(reference, kind, repeat) {
  const key = getTextureCacheKey(reference, kind, repeat);
  if (!key) return { status: "idle", texture: null, error: null };
  return textureCache.get(key) ?? { status: "idle", texture: null, error: null };
}

export function loadCachedTexture(reference, kind, repeat) {
  const key = getTextureCacheKey(reference, kind, repeat);
  if (!key) return Promise.resolve(null);

  const cached = textureCache.get(key);
  if (cached?.status === "ready" || cached?.status === "error") {
    return Promise.resolve(cached.texture);
  }
  if (cached?.promise) return cached.promise;

  const entry = { status: "loading", texture: null, error: null, promise: null };
  entry.promise = new Promise((resolve) => {
    const fail = (error) => {
      entry.status = "error";
      entry.error = error instanceof Error ? error : new Error("Texture failed to load");
      resolve(null);
    };

    try {
      textureLoader.load(
        reference,
        (texture) => {
          texture.colorSpace = kind === "baseColor" ? SRGBColorSpace : NoColorSpace;
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          texture.repeat.set(repeat[0], repeat[1]);
          texture.needsUpdate = true;
          entry.status = "ready";
          entry.texture = texture;
          resolve(texture);
        },
        undefined,
        fail,
      );
    } catch (error) {
      fail(error);
    }
  });
  textureCache.set(key, entry);
  return entry.promise;
}

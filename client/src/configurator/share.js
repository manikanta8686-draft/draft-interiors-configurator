export const SHARE_CONFIGURATION_PARAM = "design";
export const SHARE_PAYLOAD_VERSION = 1;

function toBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareConfiguration(configuration) {
  const payload = {
    v: SHARE_PAYLOAD_VERSION,
    m: configuration.modelId,
    f: configuration.fabricId,
    c: configuration.colourId,
    s: configuration.size,
    l: configuration.legs,
    n: configuration.cushions,
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShareConfiguration(value) {
  if (typeof value !== "string" || !value || value.length > 2048) return null;

  try {
    const payload = JSON.parse(fromBase64Url(value));
    if (payload?.v !== SHARE_PAYLOAD_VERSION
      || ![payload.m, payload.f, payload.c, payload.s, payload.l].every((item) => typeof item === "string")
      || !Number.isInteger(payload.n)) return null;

    return {
      modelId: payload.m,
      fabricId: payload.f,
      colourId: payload.c,
      size: payload.s,
      legs: payload.l,
      cushions: payload.n,
    };
  } catch {
    return null;
  }
}

export function createSharePath(configuration) {
  const params = new URLSearchParams({
    model: configuration.modelId,
    [SHARE_CONFIGURATION_PARAM]: encodeShareConfiguration(configuration),
  });
  return `/configurator?${params.toString()}`;
}

export function createShareUrl(configuration, location) {
  return `${location?.origin ?? ""}${createSharePath(configuration)}`;
}

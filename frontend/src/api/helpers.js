export function unwrapListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export function unwrapItemPayload(payload) {
  return payload?.results ?? payload;
}

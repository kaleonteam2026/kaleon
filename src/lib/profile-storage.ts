export const PROFILE_ID_KEY = "kaleon_active_profile_id";

export function storeProfileId(id: number) {
  localStorage.setItem(PROFILE_ID_KEY, String(id));
}

export function getStoredProfileId(): number | null {
  const v =
    localStorage.getItem(PROFILE_ID_KEY) ??
    localStorage.getItem("pathwise_active_profile_id");
  return v ? parseInt(v, 10) : null;
}

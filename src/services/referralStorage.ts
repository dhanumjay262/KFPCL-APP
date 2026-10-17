import AsyncStorage from "@react-native-async-storage/async-storage";

export const PENDING_REFERRAL_CODE_KEY = "pendingReferralCode";

export const normalizeReferralCode = (value: unknown): string => {
  if (typeof value !== "string") return "";

  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
};

export const extractReferralCodeFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;

  const directMatch = url.match(/\/r\/([A-Za-z0-9]{4,12})(?:[/?#]|$)/i);
  if (directMatch?.[1]) {
    const code = normalizeReferralCode(directMatch[1]);
    return code || null;
  }

  try {
    const parsed = new URL(url);
    const queryCode =
      parsed.searchParams.get("referralCode") ||
      parsed.searchParams.get("ref") ||
      parsed.searchParams.get("code");

    const code = normalizeReferralCode(queryCode);
    return code || null;
  } catch {
    return null;
  }
};

export const extractReferralCodeFromReferrer = (referrer: string | null | undefined): string | null => {
  if (!referrer) return null;

  const direct = extractReferralCodeFromUrl(referrer);
  if (direct) return direct;

  try {
    const params = new URLSearchParams(referrer);
    const directCode =
      params.get("referralCode") ||
      params.get("ref") ||
      params.get("code");

    const normalizedDirectCode = normalizeReferralCode(directCode);
    if (normalizedDirectCode) return normalizedDirectCode;

    const nestedLink = params.get("link") || params.get("deep_link_id") || params.get("apn");
    return extractReferralCodeFromUrl(nestedLink);
  } catch {
    return null;
  }
};

export const getPendingReferralCode = async (): Promise<string | null> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_REFERRAL_CODE_KEY);
    const code = normalizeReferralCode(raw);
    return code || null;
  } catch (error) {
    console.warn("[referralStorage] Could not read pending referral code:", error);
    return null;
  }
};

export const savePendingReferralCode = async (code: string): Promise<void> => {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;

  try {
    await AsyncStorage.setItem(PENDING_REFERRAL_CODE_KEY, normalized);
  } catch (error) {
    console.warn("[referralStorage] Could not save pending referral code:", error);
  }
};

export const clearPendingReferralCode = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
  } catch (error) {
    console.warn("[referralStorage] Could not clear pending referral code:", error);
  }
};

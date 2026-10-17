/**
 * Global API Configuration
 * 
 * Base URL configured for KFPCL Exports API: https://api.kfpclexports.com
 */

const rawApiRoot = (process.env.EXPO_PUBLIC_API_URL || "https://api.kfpclexports.com")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/api\/?$/i, "");

export const API_CONFIG = {
  BASE_URL: rawApiRoot || "https://api.kfpclexports.com",
  SHARE_URL: process.env.EXPO_PUBLIC_SHARE_URL || "https://kfpclexports.com",
  ENDPOINTS: {} as Record<string, string>,
  TIMEOUT: 15000,
};

export default API_CONFIG;


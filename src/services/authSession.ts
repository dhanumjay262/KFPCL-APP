/**
 * authSession.ts — Customer App Token Management
 *
 * Handles storage, refresh, and logout for the 2-token auth flow:
 *   - accessToken  (short-lived, 900s)
 *   - refreshToken (rotated on every refresh)
 *
 * NOTE: This file intentionally does NOT import from api.config.ts
 * to avoid a circular dependency (api.config imports from here).
 * It uses raw fetch() and builds the AUTH URL directly.
 */
import * as SecureStore from "expo-secure-store";

const rawApiRoot = (process.env.EXPO_PUBLIC_API_URL || "https://api.kfpclexports.com")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/api\/?$/i, "");

const AUTH_URL = `${rawApiRoot || "https://api.kfpclexports.com"}/api/auth`;

// ─── Storage Keys ───────────────────────────────────────────────────────────
export const ACCESS_TOKEN_KEY  = "kfpcl_jwtToken";
export const REFRESH_TOKEN_KEY = "kfpcl_refreshToken";
export const USER_PROFILE_KEY  = "kfpcl_UserProfile";

// ─── In-memory cache (faster than hitting SecureStore every request) ────────
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;

// ─── Listeners ────────────────────────────────────────────
type TokenListener = (newToken: string | null) => void;
type SessionExpiredListener = () => void;

const tokenListeners: TokenListener[] = [];
const sessionExpiredListeners: SessionExpiredListener[] = [];

export const onTokenUpdate = (listener: TokenListener) => {
  tokenListeners.push(listener);
  return () => {
    const idx = tokenListeners.indexOf(listener);
    if (idx !== -1) tokenListeners.splice(idx, 1);
  };
};

export const onSessionExpired = (listener: SessionExpiredListener) => {
  sessionExpiredListeners.push(listener);
  return () => {
    const idx = sessionExpiredListeners.indexOf(listener);
    if (idx !== -1) sessionExpiredListeners.splice(idx, 1);
  };
};

const notifyTokenListeners = (token: string | null) => {
  tokenListeners.forEach((fn) => fn(token));
};

const notifySessionExpired = () => {
  sessionExpiredListeners.forEach((fn) => fn());
};

// ─── Token Getters ──────────────────────────────────────────────────────────
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    cachedAccessToken = token;
    return cachedAccessToken;
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (cachedRefreshToken) return cachedRefreshToken;
  try {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    cachedRefreshToken = token;
    return cachedRefreshToken;
  } catch {
    return null;
  }
};

// ─── Token Setters ──────────────────────────────────────────────────────────
export const saveTokens = async (accessToken: string, refreshToken?: string) => {
  try {
    cachedAccessToken = accessToken;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);

    if (refreshToken) {
      cachedRefreshToken = refreshToken;
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }

    notifyTokenListeners(accessToken);
  } catch (error) {
    console.error("[authSession] Error saving tokens:", error);
  }
};

// ─── Refresh Session ────────────────────────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refreshes the access token using the stored refresh token.
 * De-duplicates concurrent refresh calls.
 *
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Response: { accessToken, refreshToken, expiresIn }
 *
 * Returns the new accessToken on success, or null on failure.
 */
export const refreshCustomerSession = async (): Promise<string | null> => {
  // De-duplicate: if a refresh is already in flight, piggyback on it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const currentRefreshToken = await getRefreshToken();
      if (!currentRefreshToken) {
        console.warn("[authSession] No refresh token available — session expired.");
        notifySessionExpired();
        return null;
      }

      console.log("[authSession] Refreshing access token...");

      const response = await fetch(`${AUTH_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!response.ok) {
        console.error(`[authSession] Refresh failed with status ${response.status}`);
        // Refresh token is invalid or expired — force logout
        notifySessionExpired();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.accessToken || data.jwtToken || data.token;
      const newRefreshToken = data.refreshToken;

      if (!newAccessToken) {
        console.error("[authSession] Refresh response missing accessToken");
        notifySessionExpired();
        return null;
      }

      // Save both rotated tokens
      await saveTokens(newAccessToken, newRefreshToken);
      console.log("[authSession] Token refreshed successfully.");
      return newAccessToken;
    } catch (error) {
      console.error("[authSession] Refresh error:", error);
      notifySessionExpired();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ─── Logout Session ─────────────────────────────────────────────────────────
/**
 * Logs out by calling the backend logout endpoint and clearing local tokens.
 *
 * POST /api/auth/logout
 * Body: { refreshToken }
 */
export const logoutCustomerSession = async (): Promise<void> => {
  try {
    const currentRefreshToken = await getRefreshToken();
    const currentAccessToken = await getAccessToken();

    // Tell backend to invalidate the refresh token (best-effort)
    if (currentRefreshToken) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (currentAccessToken) {
          headers["Authorization"] = `Bearer ${currentAccessToken}`;
        }
        await fetch(`${AUTH_URL}/logout`, {
          method: "POST",
          headers,
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });
      } catch (e) {
        console.warn("[authSession] Backend logout call failed (non-blocking):", e);
      }
    }

    // Clear local storage
    cachedAccessToken = null;
    cachedRefreshToken = null;
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_PROFILE_KEY);

    notifyTokenListeners(null);
  } catch (error) {
    console.error("[authSession] Logout error:", error);
  }
};

// ─── Clear cache (for when tokens are loaded from SecureStore on boot) ──────
export const clearCachedTokens = () => {
  cachedAccessToken = null;
  cachedRefreshToken = null;
};

import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../screens/config/firebase";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACCESS_TOKEN_KEY,
  USER_PROFILE_KEY,
  saveTokens,
  logoutCustomerSession,
  onTokenUpdate,
  onSessionExpired,
  clearCachedTokens,
} from "../services/authSession";
import { prefetchFcmToken, markPhoneAsRegistered } from "../services/api/auth";

export type UserType = {
  id?: number | string;
  customerId?: number | string;
  name: string;
  fullName?: string;
  phone: string;
  phoneNumber?: string;
  email?: string;
  companyName?: string;
  businessType?: string;
  state?: string;
  city?: string;
  isVerified?: boolean;
  isActive?: boolean;
  referralCode?: string;
  [key: string]: any;
};

type PostAuthRedirect = string | null;

type AuthContextType = {
  user: UserType | null;
  jwtToken: string | null;
  loading: boolean;
  login: (user: any, token: string, refreshToken?: string) => void;
  logout: () => void;
  postAuthRedirect: PostAuthRedirect;
  queuePostAuthRedirect: (destination: PostAuthRedirect) => void;
  clearPostAuthRedirect: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [postAuthRedirect, setPostAuthRedirect] = useState<PostAuthRedirect>(null);

  // Warm the FCM token cache as early as possible
  useEffect(() => {
    try {
      prefetchFcmToken();
    } catch {}
  }, []);

  // Load from SecureStore explicitly on mount
  useEffect(() => {
    const checkPersistentSession = async () => {
      try {
        clearCachedTokens();

        const storedUser = await SecureStore.getItemAsync(USER_PROFILE_KEY);
        const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        if (storedToken) {
          setJwtToken(storedToken);
        }
      } catch (error) {
        console.log("SecureStore error reading session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkPersistentSession();

    // Firebase Auth State Observer with safe guard
    let unsubscribe: (() => void) | undefined;
    try {
      if (auth && typeof auth === "function") {
        unsubscribe = auth().onAuthStateChanged(async (_firebaseUser: any) => {
          // Observer active
        });
      }
    } catch (e) {
      console.warn("[AuthContext] Firebase Auth observer not available:", e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Subscribe to token updates from authSession (e.g. after silent refresh)
  useEffect(() => {
    const unsubToken = onTokenUpdate((newToken) => {
      setJwtToken(newToken);
    });

    return unsubToken;
  }, []);

  // Subscribe to session-expired events
  useEffect(() => {
    const unsubExpired = onSessionExpired(() => {
      console.warn("[AuthContext] Session expired — clearing user state.");
      setUser(null);
      setJwtToken(null);
    });

    return unsubExpired;
  }, []);

  const login = async (userData: any, token: string, refreshToken?: string) => {
    const normalizedUser: UserType = {
      ...userData,
      id: userData?.id || userData?.customerId,
      customerId: userData?.customerId || userData?.id,
      name: userData?.fullName || userData?.name || "Buyer",
      fullName: userData?.fullName || userData?.name || "Buyer",
      phone: userData?.phoneNumber || userData?.phone || "",
      phoneNumber: userData?.phoneNumber || userData?.phone || "",
      email: userData?.email || "",
      companyName: userData?.companyName || "",
      businessType: userData?.businessType || "",
      state: userData?.state || "",
      city: userData?.city || "",
    };

    setUser(normalizedUser);
    setJwtToken(token);

    try {
      await Promise.all([
        SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(normalizedUser)),
        saveTokens(token, refreshToken),
      ]);
    } catch (e) {
      console.error("Error saving user session", e);
    }

    const cleanUserPhone = (normalizedUser.phoneNumber || normalizedUser.phone || "").replace(/\D/g, "").slice(-10);
    if (cleanUserPhone && cleanUserPhone.length === 10) {
      void markPhoneAsRegistered(cleanUserPhone, normalizedUser);
    }
  };

  const logout = async () => {
    try {
      if (auth && typeof auth === "function") {
        await auth().signOut();
      }
    } catch (error) {
      console.log("Firebase signOut error:", error);
    }
    await logoutCustomerSession();
    setUser(null);
    setJwtToken(null);
    setPostAuthRedirect(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        jwtToken,
        loading,
        login,
        logout,
        postAuthRedirect,
        queuePostAuthRedirect: setPostAuthRedirect,
        clearPostAuthRedirect: () => setPostAuthRedirect(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};


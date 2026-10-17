import { NativeModules } from "react-native";

let nativeAuth: any = null;
let nativeMessaging: any = null;

try {
  const firebaseAuthModule = require("@react-native-firebase/auth");
  nativeAuth = firebaseAuthModule.default || firebaseAuthModule;
  if (firebaseAuthModule.PhoneAuthProvider && !nativeAuth.PhoneAuthProvider) {
    nativeAuth.PhoneAuthProvider = firebaseAuthModule.PhoneAuthProvider;
  }
} catch (e) {
  console.warn("[Firebase] Could not initialize native auth:", e);
}

try {
  const firebaseMsgModule = require("@react-native-firebase/messaging");
  nativeMessaging = firebaseMsgModule.default || firebaseMsgModule;
} catch (e) {
  console.warn("[Firebase] Could not initialize native messaging:", e);
}

/**
 * Check if the React Native Firebase native module is linked in the current runtime.
 * Returns false in Expo Go (which does not include custom native binary modules).
 */
export const isFirebaseAvailable = (): boolean => {
  return !!(nativeAuth || NativeModules?.RNFBAppModule);
};

// Fallback when native build is not present - strictly throws to prevent fake/dummy OTPs
const fallbackAuth: any = () => ({
  signInWithPhoneNumber: async (_phone: string) => {
    throw new Error(
      "Firebase Native module is not linked in Expo Go. Real SMS OTP requires running on an Android native build (APK or npx expo run:android)."
    );
  },
  signInWithCredential: async (_cred: any) => {
    throw new Error("Native Firebase Auth is not available.");
  },
  signOut: async () => {},
  onAuthStateChanged: (_cb: any) => () => {},
  currentUser: null,
});

const mockMessaging: any = () => ({
  getToken: async () => "",
  requestPermission: async () => 1,
  onMessage: (_cb: any) => () => {},
  onNotificationOpenedApp: (_cb: any) => () => {},
  getInitialNotification: async () => null,
});

mockMessaging.AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
  EPHEMERAL: 3,
};

export const auth = nativeAuth || fallbackAuth;
export const messaging = nativeMessaging || mockMessaging;

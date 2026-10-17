import { useState, useCallback, useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import * as Haptics from 'expo-haptics';

export type VoiceErrorKind =
  | "permission_denied"
  | "not_supported"
  | "network"
  | "no_speech"
  | "transient";

interface UseVoiceSearchReturn {
  isListening: boolean;
  error: string | null;
  errorKind: VoiceErrorKind | null;
  partialResult: string;
  isAvailable: boolean | null;
  startListening: () => Promise<void>;
  stopListening: (cancelMode?: boolean) => Promise<void>;
}

let VoiceModule: any = null;
try {
  if (NativeModules && NativeModules.Voice) {
    VoiceModule = require('@react-native-voice/voice').default;
  }
} catch {
  // Not in native build
}

export const useVoiceSearch = (
  onResult: (text: string) => void,
): UseVoiceSearchReturn => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<VoiceErrorKind | null>(null);
  const [partialResult, setPartialResult] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const onResultRef = useRef(onResult);

  const reportError = useCallback((kind: VoiceErrorKind, message: string) => {
    setErrorKind(kind);
    setError(message);
  }, []);
  
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const clearSilenceTimer = () => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  };

  const resetSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimer.current = setTimeout(async () => {
      try {
        if (VoiceModule) await VoiceModule.stop();
      } catch (e) {}
      setIsListening(false);
      reportError("no_speech", "We didn't catch that. Try again or type your search.");
    }, 5000);
  };

  useEffect(() => {
    if (!VoiceModule) {
      setIsAvailable(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const available = await VoiceModule.isAvailable();
        if (!cancelled) setIsAvailable(Boolean(available));
      } catch {
        if (!cancelled) setIsAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!VoiceModule) return;

    VoiceModule.onSpeechStart = () => {
      setIsListening(true);
      setError(null);
      setErrorKind(null);
      setPartialResult("");
      resetSilenceTimer();
    };

    VoiceModule.onSpeechEnd = () => {
      setIsListening(false);
      clearSilenceTimer();
    };

    VoiceModule.onSpeechPartialResults = (e: any) => {
      resetSilenceTimer();
      if (e.value && e.value.length > 0) {
        setPartialResult(e.value[0]);
      }
    };

    VoiceModule.onSpeechResults = (e: any) => {
      setIsListening(false);
      clearSilenceTimer();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (e.value && e.value.length > 0) {
        const bestResult = e.value[0].trim();
        if (bestResult) {
          onResultRef.current(bestResult);
        }
      }
    };

    VoiceModule.onSpeechError = (e: any) => {
      setIsListening(false);
      clearSilenceTimer();
      const code = e.error?.code;
      const msg = (e.error?.message || "").toLowerCase();

      if (code === "5" || code === "6" || code === "7") return;

      if (code === "9" || msg.includes("permission")) {
        reportError("permission_denied", "Microphone permission required.");
      } else if (msg.includes("network") || msg.includes("internet")) {
        reportError("network", "Voice search needs an internet connection.");
      } else {
        reportError("transient", "Speech recognition failed. Try typing instead.");
      }
    };

    return () => {
      clearSilenceTimer();
      try {
        VoiceModule.destroy().then(VoiceModule.removeAllListeners);
      } catch {}
    };
  }, [reportError]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'KFPCL Exports needs access to your microphone for voice search.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  const startListening = useCallback(async () => {
    if (!VoiceModule) {
      reportError("not_supported", "Voice search is not supported in Expo Go.");
      return;
    }

    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        reportError("permission_denied", "Microphone access is required for voice search.");
        return;
      }

      setError(null);
      setErrorKind(null);
      setPartialResult("");
      await VoiceModule.start('en-IN');
    } catch (e: any) {
      reportError("transient", "Could not start voice search.");
    }
  }, [reportError, requestPermission]);

  const stopListening = useCallback(async (cancelMode = false) => {
    if (!VoiceModule) return;
    clearSilenceTimer();
    try {
      if (cancelMode) {
        await VoiceModule.cancel();
      } else {
        await VoiceModule.stop();
      }
    } catch (e) {}
    setIsListening(false);
  }, []);

  return {
    isListening,
    error,
    errorKind,
    partialResult,
    isAvailable,
    startListening,
    stopListening,
  };
};


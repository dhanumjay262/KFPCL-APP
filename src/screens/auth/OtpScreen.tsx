import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import type { RootStackParamList } from "../../navigation/RootStack";
import { scale } from "../../utils/responsive";
import {
  verifyOtp,
  resendOtp,
  checkPhoneExists,
  firebaseLogin,
  setActiveVerificationId,
} from "../../services/api/auth";

type OtpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Otp"
>;
type OtpScreenRouteProp = RouteProp<RootStackParamList, "Otp">;

// Resend Cooldown: 60 seconds
const RESEND_INTERVAL = 60;

const OtpScreen = () => {
  const navigation = useNavigation<OtpScreenNavigationProp>();
  const route = useRoute<OtpScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const rawPhone = route.params?.phone || (route.params as any)?.phoneNumber || "";
  const phone = rawPhone.replace(/\D/g, "").slice(-10);

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(RESEND_INTERVAL);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const isMounted = useRef<boolean>(true);
  const isVerifying = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (route.params?.verificationId) {
      setActiveVerificationId(route.params.verificationId);
    }
  }, [route.params?.verificationId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleOtpChange = (value: string, index: number) => {
    const cleanValue = value.replace(/\D/g, "");

    if (cleanValue.length > 1) {
      const digits = cleanValue.slice(0, 6).split("");
      const newOtp = ["", "", "", "", "", ""];
      digits.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      const focusIndex = Math.min(digits.length, 5);
      inputRefs.current[focusIndex]?.focus();
      if (digits.length === 6) {
        void handleVerifyOtp(digits.join(""));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullOtp = otp.join("");
  const isOtpComplete = fullOtp.length === 6;

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || fullOtp).trim();
    if (code.length < 6 || loading || isVerifying.current) return;

    if (!phone || phone.length < 10) {
      Alert.alert("Error", "Invalid phone number. Please try entering your phone number again.");
      navigation.goBack();
      return;
    }

    isVerifying.current = true;
    setLoading(true);

    try {
      const res = await verifyOtp(phone, code);

      if (!isMounted.current) return;

      if (res && (res.verified || res.success)) {
        const cleanNumber = phone.replace(/\D/g, "").slice(-10);

        // Explicitly check registration via GET /api/auth/check-phone/${cleanPhoneNumber}
        let isRegistered = Boolean(res.isRegistered);
        try {
          const dbCheck = await checkPhoneExists(cleanNumber);
          if (dbCheck?.isRegistered !== undefined) {
            isRegistered = Boolean(dbCheck.isRegistered);
          } else if (dbCheck?.exists !== undefined) {
            isRegistered = Boolean(dbCheck.exists);
          }
        } catch (dbErr) {
          console.warn("[OtpScreen] check-phone check notice:", dbErr);
        }

        const anyRes = res as any;

        if (isRegistered || anyRes.accessToken) {
          // Existing Registered Buyer Direct Login Flow
          let accessToken = anyRes.accessToken;
          let refreshToken = anyRes.refreshToken || accessToken;
          let userObj = anyRes.user;

          // If session tokens are not present yet, exchange credentials via POST /api/auth/firebase-login
          const tokenToExchange = anyRes.verificationToken || accessToken;
          if (!accessToken && tokenToExchange) {
            try {
              const fbLoginRes = await firebaseLogin({ idToken: tokenToExchange });
              if (fbLoginRes && fbLoginRes.accessToken) {
                accessToken = fbLoginRes.accessToken;
                refreshToken = fbLoginRes.refreshToken || fbLoginRes.accessToken;
                userObj = fbLoginRes.user || userObj;
              }
            } catch (fbErr) {
              console.warn("[OtpScreen] Direct firebase-login exchange notice:", fbErr);
            }
          }

          userObj = userObj || {
            id: `buyer_${cleanNumber}`,
            phoneNumber: cleanNumber,
            fullName: anyRes.fullName || "KFPCL Buyer",
          };
          accessToken = accessToken || tokenToExchange;
          refreshToken = refreshToken || accessToken;

          await login(userObj, accessToken, refreshToken);
          setLoading(false);
          isVerifying.current = false;
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          });
        } else {
          // Mobile number is NOT registered in database -> Only then navigate to SignupScreen
          setLoading(false);
          isVerifying.current = false;
          const verificationToken = anyRes.verificationToken || "";
          navigation.navigate("Signup", {
            phone: cleanNumber,
            phoneNumber: cleanNumber,
            verificationToken,
          });
        }
      } else {
        setLoading(false);
        isVerifying.current = false;
        Alert.alert("Invalid OTP", "The verification code you entered is incorrect or expired.");
      }
    } catch (error: any) {
      if (isMounted.current) {
        setLoading(false);
        isVerifying.current = false;
        Alert.alert(
          "Verification Failed",
          error?.message || "Invalid OTP code. Please check the SMS and try again."
        );
      }
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;

    setResending(true);
    try {
      const res = await resendOtp(phone);
      if (isMounted.current) {
        setTimer(RESEND_INTERVAL);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        Alert.alert("OTP Sent", res?.message || `A new verification code was sent to +91 ${phone}`);
      }
    } catch (error: any) {
      if (isMounted.current) {
        Alert.alert("Resend Failed", error?.message || "Could not resend OTP. Please try again later.");
      }
    } finally {
      if (isMounted.current) {
        setResending(false);
      }
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled={Platform.OS === "ios"}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        >
          {/* Top Hero Gradient */}
          <LinearGradient
            colors={["#064E3B", "#0A8754", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroHeader, { paddingTop: Math.max(insets.top + scale(12), scale(36)) }]}
          >
            {/* Top Bar with Back Button */}
            <View style={styles.topBar}>
              <Pressable
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={scale(20)} color="#FFFFFF" />
              </Pressable>

              <View style={styles.verifiedTag}>
                <Ionicons name="shield-checkmark" size={scale(13)} color="#10B981" />
                <Text style={styles.verifiedText}>Buyer Verification</Text>
              </View>
            </View>

            {/* Brand Title */}
            <View style={styles.brandHero}>
              <View style={styles.logoBadge}>
                <Image
                  source={require("../../../assets/images/kfpcl-logo.png")}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.heroTitle}>Enter OTP</Text>
              <Text style={styles.heroSubtitle}>
                We sent a 6-digit verification code to
              </Text>

              {/* Phone Badge */}
              <View style={styles.phonePill}>
                <Text style={styles.phoneText}>+91 {phone}</Text>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => navigation.goBack()}
                >
                  <Feather name="edit-2" size={scale(12)} color="#A7F3D0" />
                  <Text style={styles.editText}>Change</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>

          {/* Elevated Verification Card */}
          <View style={styles.cardContainer}>
            <View style={styles.loginCard}>
              <Text style={styles.cardHeaderTitle}>Verify Code</Text>
              <Text style={styles.cardHeaderDesc}>
                Enter the 6-digit code received via SMS to continue
              </Text>

              {/* 6-Digit Boxes */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(val) => handleOtpChange(val, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? 6 : 1}
                    selectTextOnFocus
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                    ]}
                    selectionColor="#0A8754"
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              {/* Verify Button */}
              <Pressable
                onPress={() => handleVerifyOtp()}
                disabled={!isOtpComplete || loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  !isOtpComplete || loading ? styles.submitBtnDisabled : styles.submitBtnActive,
                  pressed && isOtpComplete && !loading && styles.submitBtnPressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Verify & Continue</Text>
                    <Ionicons name="checkmark-circle" size={scale(18)} color="#fff" />
                  </>
                )}
              </Pressable>

              {/* Resend Section */}
              <View style={styles.resendContainer}>
                {timer > 0 ? (
                  <Text style={styles.timerText}>
                    Resend code in <Text style={styles.timerHighlight}>{timer}s</Text>
                  </Text>
                ) : (
                  <Pressable onPress={handleResend} disabled={resending} style={styles.resendBtn}>
                    {resending ? (
                      <ActivityIndicator size="small" color="#0A8754" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={scale(14)} color="#0A8754" />
                        <Text style={styles.resendLink}>Resend OTP</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroHeader: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(44),
    borderBottomLeftRadius: scale(32),
    borderBottomRightRadius: scale(32),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scale(16),
  },
  backBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(20),
  },
  verifiedText: {
    fontSize: scale(11),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  brandHero: {
    alignItems: "center",
  },
  logoBadge: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: scale(10),
    overflow: "hidden",
  },
  brandLogo: {
    width: scale(48),
    height: scale(48),
  },
  heroTitle: {
    fontSize: scale(22),
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: scale(2),
  },
  heroSubtitle: {
    fontSize: scale(12.5),
    color: "#D1FAE5",
    textAlign: "center",
  },
  phonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    marginTop: scale(10),
  },
  phoneText: {
    fontSize: scale(14),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(3),
    paddingLeft: scale(6),
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.3)",
  },
  editText: {
    fontSize: scale(12),
    fontWeight: "700",
    color: "#A7F3D0",
  },
  cardContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(-24),
    paddingBottom: scale(40),
  },
  loginCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(24),
    padding: scale(22),
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  cardHeaderTitle: {
    fontSize: scale(19),
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: scale(4),
  },
  cardHeaderDesc: {
    fontSize: scale(12.5),
    color: "#64748B",
    marginBottom: scale(22),
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: scale(22),
  },
  otpBox: {
    width: scale(45),
    height: scale(54),
    borderRadius: scale(14),
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    textAlign: "center",
    fontSize: scale(22),
    fontWeight: "900",
    color: "#0F172A",
  },
  otpBoxFilled: {
    borderColor: "#0A8754",
    backgroundColor: "#ECFDF5",
  },
  submitBtn: {
    height: scale(54),
    borderRadius: scale(16),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(8),
    marginBottom: scale(16),
  },
  submitBtnActive: {
    backgroundColor: "#0A8754",
    elevation: 4,
    shadowColor: "#0A8754",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  submitBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
  submitBtnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  submitBtnText: {
    fontSize: scale(16),
    fontWeight: "800",
    color: "#FFFFFF",
  },
  resendContainer: {
    alignItems: "center",
    minHeight: scale(24),
    justifyContent: "center",
  },
  timerText: {
    fontSize: scale(13),
    color: "#64748B",
  },
  timerHighlight: {
    color: "#0A8754",
    fontWeight: "800",
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  resendLink: {
    fontSize: scale(13.5),
    fontWeight: "800",
    color: "#0A8754",
  },
});


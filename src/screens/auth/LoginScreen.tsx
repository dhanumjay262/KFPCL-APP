import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator } from "react-native";
import { scale } from "../../utils/responsive";
import type { RootStackParamList } from "../../navigation/RootStack";
import { checkPhoneExists, sendOtp } from "../../services/api/auth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const phoneInputRef = useRef<TextInput>(null);
  const navigatedPhoneRef = useRef<string>("");

  const [phone, setPhone] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingPhone, setCheckingPhone] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  const cleanPhone = phone.replace(/\D/g, "").slice(0, 10);
  const isValidPhone = cleanPhone.length === 10;

  // Real-time check when mobile number reaches 10 digits
  useEffect(() => {
    if (cleanPhone.length === 10) {
      let active = true;
      setCheckingPhone(true);
      checkPhoneExists(cleanPhone)
        .then((res) => {
          if (!active) return;
          const exists = Boolean(res?.exists || res?.isRegistered || res?.registered);
          setIsRegistered(exists);

          // If user does not have an account, directly navigate to Register page
          if (!exists && navigatedPhoneRef.current !== cleanPhone) {
            navigatedPhoneRef.current = cleanPhone;
            navigation.navigate("Signup", { phone: cleanPhone });
          }
        })
        .catch(() => {
          if (!active) return;
          setIsRegistered(null);
        })
        .finally(() => {
          if (active) {
            setCheckingPhone(false);
          }
        });

      return () => {
        active = false;
      };
    } else {
      setIsRegistered(null);
      setCheckingPhone(false);
      navigatedPhoneRef.current = "";
    }
  }, [cleanPhone, navigation]);

  const handleContinue = async () => {
    if (!isValidPhone || loading) {
      if (!isValidPhone) {
        Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number");
      }
      return;
    }

    // 1. If already known to be unregistered, navigate directly to Register page
    if (isRegistered === false) {
      navigation.navigate("Signup", { phone: cleanPhone });
      return;
    }

    setLoading(true);
    try {
      // 2. Query database registration status if not already confirmed
      let regStatus: boolean | null = isRegistered;
      if (regStatus === null) {
        const checkRes = await checkPhoneExists(cleanPhone);
        regStatus = Boolean(checkRes?.exists || checkRes?.isRegistered || checkRes?.registered);
        setIsRegistered(regStatus);
      }

      // If user does not have an account, directly navigate to Register page
      if (!regStatus) {
        setLoading(false);
        navigation.navigate("Signup", { phone: cleanPhone });
        return;
      }

      // 3. Registered mobile number in database -> Continue with real SMS OTP
      const sendRes = await sendOtp(cleanPhone);

      if (sendRes && sendRes.success !== false) {
        navigation.navigate("Otp", {
          phone: cleanPhone,
          isRegistered: true,
          verificationId: sendRes.verificationId,
          source: "login",
        });
      } else {
        Alert.alert("OTP Error", sendRes?.message || "Failed to send OTP. Please try again.");
      }
    } catch (error: any) {
      console.warn("[LoginScreen] OTP dispatch error:", error);
      Alert.alert(
        "Could Not Send OTP",
        error?.message || "Unable to contact verification server. Please verify your internet connection."
      );
    } finally {
      setLoading(false);
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
          {/* Top Hero Header */}
          <LinearGradient
            colors={["#064E3B", "#0A8754", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroHeader, { paddingTop: Math.max(insets.top + scale(12), scale(36)) }]}
          >
            {/* Header Nav Bar */}
            <View style={styles.topBar}>
              <View style={styles.verifiedTag}>
                <Ionicons name="shield-checkmark" size={scale(13)} color="#10B981" />
                <Text style={styles.verifiedText}>Verified B2B Wholesale</Text>
              </View>

              <View style={styles.buyerPill}>
                <Text style={styles.buyerPillText}>BUYER APP</Text>
              </View>
            </View>

            {/* Brand Logo + Hero Title */}
            <View style={styles.brandHero}>
              <View style={styles.logoBadge}>
                <Image
                  source={require("../../../assets/images/kfpcl-logo.png")}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.heroTitle}>KFPCL EXPORTS</Text>
              <Text style={styles.heroSubtitle}>
                Farmer Producer B2B Agriculture Marketplace
              </Text>
            </View>

            {/* 3 Value Pillars */}
            <View style={styles.pillarsRow}>
              <View style={styles.pillarItem}>
                <View style={styles.pillarIcon}>
                  <Ionicons name="leaf" size={scale(13)} color="#A7F3D0" />
                </View>
                <Text style={styles.pillarText}>Direct Sourcing</Text>
              </View>
              <View style={styles.pillarDot} />
              <View style={styles.pillarItem}>
                <View style={styles.pillarIcon}>
                  <MaterialCommunityIcons name="tag-multiple" size={scale(13)} color="#A7F3D0" />
                </View>
                <Text style={styles.pillarText}>Wholesale Rates</Text>
              </View>
              <View style={styles.pillarDot} />
              <View style={styles.pillarItem}>
                <View style={styles.pillarIcon}>
                  <Feather name="truck" size={scale(13)} color="#A7F3D0" />
                </View>
                <Text style={styles.pillarText}>Bulk Delivery</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Elevated Card */}
          <View style={styles.cardContainer}>
            <View style={styles.loginCard}>
              <Text style={styles.cardHeaderTitle}>Buyer Login</Text>
              <Text style={styles.cardHeaderDesc}>
                Enter your 10-digit mobile number to access wholesale prices
              </Text>

              {/* Phone Input Box */}
              <View
                style={[
                  styles.phoneInputWrap,
                  isFocused && styles.phoneInputWrapFocused,
                  isValidPhone && styles.phoneInputWrapValid,
                ]}
              >
                <View style={styles.flagPrefix}>
                  <Text style={styles.flagEmoji}>🇮🇳</Text>
                  <Text style={styles.countryCode}>+91</Text>
                </View>

                <TextInput
                  ref={phoneInputRef}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val.replace(/\D/g, "").slice(0, 10));
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  selectionColor="#0A8754"
                  style={styles.textInput}
                  autoFocus={false}
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />

                {isValidPhone ? (
                  <View style={styles.validCheck}>
                    <Ionicons name="checkmark" size={scale(14)} color="#fff" />
                  </View>
                ) : cleanPhone.length > 0 ? (
                  <Text style={styles.digitCounter}>{10 - cleanPhone.length}</Text>
                ) : null}
              </View>

              {/* Registered Account Confirmed in DB */}
              {isRegistered === true && (
                <View style={styles.registeredSuccessBadge}>
                  <Ionicons name="checkmark-circle" size={scale(16)} color="#0A8754" />
                  <Text style={styles.registeredSuccessText}>
                    Registered Account Found • Tap below to receive OTP
                  </Text>
                </View>
              )}

              {/* New Account Detected in DB */}
              {isRegistered === false && (
                <View style={styles.registeredSuccessBadge}>
                  <Ionicons name="sparkles" size={scale(16)} color="#0A8754" />
                  <Text style={styles.registeredSuccessText}>
                    New Mobile Number • Tap below to register your account
                  </Text>
                </View>
              )}

              {/* Continue Button */}
              <Pressable
                onPress={handleContinue}
                disabled={!isValidPhone || loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  !isValidPhone || loading ? styles.submitBtnDisabled : styles.submitBtnActive,
                  pressed && isValidPhone && !loading && styles.submitBtnPressed,
                ]}
              >
                {loading ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.submitBtnText, { marginLeft: scale(8), fontSize: scale(14) }]}>
                      Please wait...
                    </Text>
                  </View>
                ) : isRegistered === false ? (
                  <>
                    <Text style={styles.submitBtnText}>Continue to Register</Text>
                    <Ionicons name="arrow-forward" size={scale(18)} color="#fff" />
                  </>
                ) : isRegistered === true ? (
                  <>
                    <Text style={styles.submitBtnText}>Continue with OTP</Text>
                    <Ionicons name="arrow-forward" size={scale(18)} color="#fff" />
                  </>
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={scale(18)} color="#fff" />
                  </>
                )}
              </Pressable>

              <View style={styles.divider} />

              {/* B2B Assurance Tags */}
              <View style={styles.b2bFeatures}>
                <View style={styles.b2bFeatureRow}>
                  <Ionicons name="checkmark-circle" size={scale(16)} color="#0A8754" />
                  <Text style={styles.b2bFeatureText}>GST Invoice available for tax input credit</Text>
                </View>
                <View style={styles.b2bFeatureRow}>
                  <Ionicons name="checkmark-circle" size={scale(16)} color="#0A8754" />
                  <Text style={styles.b2bFeatureText}>Direct Farm Quality Guarantee on all lots</Text>
                </View>
                <View style={styles.b2bFeatureRow}>
                  <Ionicons name="checkmark-circle" size={scale(16)} color="#0A8754" />
                  <Text style={styles.b2bFeatureText}>Direct Negotiation & Transparent RFQ Pricing</Text>
                </View>
              </View>

              {/* Sign up prompt */}
              <View style={styles.signupWrap}>
                <Text style={styles.signupPrompt}>Need a new Buyer Account? </Text>
                <Pressable onPress={() => navigation.navigate("Signup")}>
                  <Text style={styles.signupLink}>Register Here</Text>
                </Pressable>
              </View>
            </View>

            {/* Terms info */}
            <Text style={styles.disclaimerText}>
              By signing in, you agree to KFPCL Exports{"\n"}Terms of Trade & Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;

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
    paddingBottom: scale(48),
    borderBottomLeftRadius: scale(32),
    borderBottomRightRadius: scale(32),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scale(20),
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
    letterSpacing: 0.3,
  },
  buyerPill: {
    backgroundColor: "#FEF08A",
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  buyerPillText: {
    fontSize: scale(10),
    fontWeight: "900",
    color: "#854D0E",
    letterSpacing: 0.6,
  },
  brandHero: {
    alignItems: "center",
    marginBottom: scale(20),
  },
  logoBadge: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: scale(12),
    overflow: "hidden",
  },
  brandLogo: {
    width: scale(66),
    height: scale(66),
  },
  heroTitle: {
    fontSize: scale(24),
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: scale(0.5),
    marginBottom: scale(4),
  },
  heroSubtitle: {
    fontSize: scale(12.5),
    fontWeight: "500",
    color: "#D1FAE5",
    textAlign: "center",
  },
  pillarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: scale(20),
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    gap: scale(8),
  },
  pillarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  pillarIcon: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  pillarText: {
    fontSize: scale(11),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pillarDot: {
    width: scale(3),
    height: scale(3),
    borderRadius: scale(2),
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  cardContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(-28),
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
    fontSize: scale(20),
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: scale(4),
  },
  cardHeaderDesc: {
    fontSize: scale(12.5),
    color: "#64748B",
    lineHeight: scale(17),
    marginBottom: scale(20),
  },
  phoneInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: scale(16),
    height: scale(56),
    paddingHorizontal: scale(12),
    marginBottom: scale(16),
  },
  phoneInputWrapFocused: {
    borderColor: "#0A8754",
    backgroundColor: "#FFFFFF",
  },
  phoneInputWrapValid: {
    borderColor: "#059669",
  },
  flagPrefix: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: scale(10),
    borderRightWidth: 1,
    borderRightColor: "#CBD5E1",
    marginRight: scale(10),
    gap: scale(4),
  },
  flagEmoji: {
    fontSize: scale(18),
  },
  countryCode: {
    fontSize: scale(15),
    fontWeight: "700",
    color: "#1E293B",
  },
  textInput: {
    flex: 1,
    fontSize: scale(16),
    fontWeight: "700",
    color: "#0F172A",
    paddingVertical: 0,
    letterSpacing: 0.5,
  },
  digitCounter: {
    fontSize: scale(12),
    fontWeight: "600",
    color: "#94A3B8",
    marginRight: scale(4),
  },
  validCheck: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(2),
  },
  submitBtn: {
    height: scale(54),
    borderRadius: scale(16),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(8),
    marginBottom: scale(14),
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
  quickDemoPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: scale(14),
    paddingVertical: scale(10),
    marginBottom: scale(16),
  },
  quickDemoText: {
    fontSize: scale(13),
    fontWeight: "700",
    color: "#065F46",
  },
  quickDemoHighlight: {
    fontWeight: "800",
    color: "#0A8754",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: scale(12),
  },
  b2bFeatures: {
    gap: scale(8),
    marginBottom: scale(18),
  },
  b2bFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  b2bFeatureText: {
    fontSize: scale(12),
    fontWeight: "500",
    color: "#475569",
  },
  signupWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: scale(4),
  },
  signupPrompt: {
    fontSize: scale(13.5),
    color: "#64748B",
  },
  signupLink: {
    fontSize: scale(13.5),
    fontWeight: "800",
    color: "#0A8754",
  },
  disclaimerText: {
    fontSize: scale(11),
    color: "#94A3B8",
    textAlign: "center",
    marginTop: scale(18),
    lineHeight: scale(16),
  },
  notRegisteredCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: scale(12),
    padding: scale(12),
    marginTop: scale(10),
    marginBottom: scale(8),
  },
  notRegisteredRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notRegisteredTitle: {
    fontSize: scale(13),
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: scale(2),
  },
  notRegisteredSubtitle: {
    fontSize: scale(11.5),
    color: "#7F1D1D",
    lineHeight: scale(16),
  },
  registerNowBtn: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(8),
    marginTop: scale(10),
    gap: scale(6),
  },
  registerNowBtnText: {
    color: "#FFFFFF",
    fontSize: scale(12.5),
    fontWeight: "700",
  },
  btnLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnRegister: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
  },
  registeredSuccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    marginTop: scale(8),
    gap: scale(6),
  },
  registeredSuccessText: {
    fontSize: scale(11.5),
    fontWeight: "600",
    color: "#065F46",
    flex: 1,
  },
});


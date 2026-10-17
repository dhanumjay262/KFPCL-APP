import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  Keyboard,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { scale } from "../../utils/responsive";

import type { RootStackParamList } from "../../navigation/RootStack";
import { useAuth } from "../../context/AuthContext";
export interface ReferralValidationResult {
  valid: boolean;
  selfReferral: boolean;
  referrerName?: string;
}
const validateReferralCode = async (..._args: any[]): Promise<ReferralValidationResult | null> => null;
import {
  normalizeReferralCode,
  savePendingReferralCode,
} from "../../services/referralStorage";
import {
  sendOtp,
  verifyOtp,
  signup,
  checkPhoneExists,
  markPhoneAsRegistered,
  firebaseLogin,
} from "../../services/api/auth";
import * as ImagePicker from "expo-image-picker";

type SignupScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Signup"
>;
type SignupScreenRouteProp = RouteProp<RootStackParamList, "Signup">;

const RESEND_INTERVAL = 60;

// Strict Regex Patterns
const REGEX_LETTERS_ONLY = /^[a-zA-Z\s]+$/;
const REGEX_COMPANY_NAME = /^[a-zA-Z0-9\s&.-]+$/;
const REGEX_INDIAN_PHONE = /^[6-9]\d{9}$/;
const REGEX_STRICT_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const REGEX_OTP_6_DIGITS = /^\d{6}$/;
const REGEX_PAN_CARD = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const REGEX_GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const cleanPhone = (num: string) => (num || "").replace(/\D/g, "").slice(-10);

interface BusinessTypeItem {
  id: string;
  name: string;
  value: string;
  desc: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const BUSINESS_TYPES: BusinessTypeItem[] = [
  { id: "1", name: "Retailer", value: "Retailer", desc: "Supermarket, Kirana, Retail Store", icon: "storefront-outline" },
  { id: "2", name: "Wholesaler", value: "Wholesaler", desc: "Mandi stockist, Bulk wholesaler", icon: "warehouse" },
  { id: "3", name: "Distributor", value: "Distributor", desc: "Regional supply chain distributor", icon: "truck-delivery-outline" },
  { id: "4", name: "Importer", value: "Importer", desc: "Overseas sourcing & import", icon: "ferry" },
  { id: "5", name: "Exporter", value: "Exporter", desc: "International commodity export", icon: "airplane-takeoff" },
  { id: "6", name: "Manufacturer", value: "Manufacturer", desc: "Food processor, industrial manufacturer", icon: "factory" },
  { id: "7", name: "Trader", value: "Trader", desc: "Commission agent, broker", icon: "handshake-outline" },
  { id: "8", name: "Other", value: "Other", desc: "Commercial & institutional buyer", icon: "briefcase-outline" },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Karnataka",
  "Tamil Nadu",
  "Gujarat",
  "Delhi NCR",
  "Punjab",
  "Uttar Pradesh",
  "Rajasthan",
  "Madhya Pradesh",
  "West Bengal",
  "Kerala",
  "Bihar",
  "Haryana",
  "Odisha",
  "Assam",
  "Chhattisgarh",
  "Jharkhand",
  "Uttarakhand",
  "Himachal Pradesh",
  "Goa",
];

const SignupScreen = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const route = useRoute<SignupScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  // Route initial data
  const routePhone =
    typeof route.params?.phone === "string"
      ? route.params.phone
      : typeof (route.params as any)?.phoneNumber === "string"
      ? (route.params as any).phoneNumber
      : "";
  const routeReferralCode = normalizeReferralCode(route.params?.referralCode);
  const routeVerificationToken =
    route.params?.verificationToken || (route.params as any)?.idToken || "";

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(() => cleanPhone(routePhone));
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [panImage, setPanImage] = useState<string | null>(null);
  const [panImageBase64, setPanImageBase64] = useState<string | null>(null);
  const [gstin, setGstin] = useState("");
  const [gstinImage, setGstinImage] = useState<string | null>(null);
  const [gstinImageBase64, setGstinImageBase64] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState(routeReferralCode);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Focus tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Field-Specific Real-Time Validation Error Messages
  const [fullNameError, setFullNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [businessTypeError, setBusinessTypeError] = useState("");
  const [stateError, setStateError] = useState("");
  const [cityError, setCityError] = useState("");
  const [panNumberError, setPanNumberError] = useState("");
  const [panImageError, setPanImageError] = useState("");
  const [gstinError, setGstinError] = useState("");
  const [termsError, setTermsError] = useState("");

  // OTP Verification States
  const [verificationToken, setVerificationToken] = useState(routeVerificationToken);
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(Boolean(routeVerificationToken));
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpTimer, setOtpTimer] = useState(RESEND_INTERVAL);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Form Submission
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Modals
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  // Referral states
  const [referralState, setReferralState] = useState<
    "idle" | "checking" | "valid" | "invalid" | "self" | "unavailable"
  >("idle");
  const [referralFeedback, setReferralFeedback] = useState("");

  const fullNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const companyNameInputRef = useRef<TextInput>(null);
  const cityInputRef = useRef<TextInput>(null);
  const panInputRef = useRef<TextInput>(null);
  const gstinInputRef = useRef<TextInput>(null);
  const referralInputRef = useRef<TextInput>(null);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const isMounted = useRef(true);
  const referralRequestId = useRef(0);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Phone number and verification token synchronization from route
  useEffect(() => {
    if (routePhone) {
      const clean = cleanPhone(routePhone);
      if (clean) setPhone(clean);
    }
  }, [routePhone]);

  useEffect(() => {
    if (routeVerificationToken) {
      setVerificationToken(routeVerificationToken);
      setIsOtpVerified(true);
    }
  }, [routeVerificationToken]);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (otpSent && !isOtpVerified && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpSent, isOtpVerified, otpTimer]);

  // ─────────────────────────────────────────────────────────────
  // STRICT VALIDATION HELPERS
  // ─────────────────────────────────────────────────────────────

  // 1. Full Name Validation (Letters & spaces only, min 2 chars)
  const handleFullNameChange = (val: string) => {
    if (/[^a-zA-Z\s]/.test(val)) {
      setFullNameError("Full Name: Only letters and spaces are allowed.");
    } else if (fullNameError === "Full Name: Only letters and spaces are allowed.") {
      setFullNameError("");
    }

    const sanitized = val.replace(/[^a-zA-Z\s]/g, "");
    setFullName(sanitized);

    if (sanitized.trim().length >= 2) {
      setFullNameError("");
    }
  };

  const isValidFullName = fullName.trim().length >= 2 && REGEX_LETTERS_ONLY.test(fullName.trim());

  // 2. City Validation (Letters & spaces only, min 2 chars)
  const handleCityChange = (val: string) => {
    if (/[^a-zA-Z\s]/.test(val)) {
      setCityError("City: Only letters and spaces are allowed.");
    } else if (cityError === "City: Only letters and spaces are allowed.") {
      setCityError("");
    }

    const sanitized = val.replace(/[^a-zA-Z\s]/g, "");
    setCity(sanitized);

    if (sanitized.trim().length >= 2) {
      setCityError("");
    }
  };

  const isValidCity = city.trim().length >= 2 && REGEX_LETTERS_ONLY.test(city.trim());

  // 3. Mobile Number Validation (Exactly 10 digits, Indian prefix)
  const handlePhoneChange = (val: string) => {
    if (/\D/.test(val)) {
      setPhoneError("Mobile Number: Numbers only.");
    } else if (phoneError === "Mobile Number: Numbers only.") {
      setPhoneError("");
    }

    const cleanNumber = val.replace(/\D/g, "").slice(0, 10);
    setPhone(cleanNumber);

    if (isOtpVerified) {
      setIsOtpVerified(false);
      setOtpSent(false);
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
    }

    if (cleanNumber.length === 10) {
      if (!REGEX_INDIAN_PHONE.test(cleanNumber)) {
        setPhoneError("Enter a valid Indian mobile number starting with 6-9.");
      } else {
        setPhoneError("");
      }
    } else if (touched.phone && cleanNumber.length > 0 && cleanNumber.length < 10) {
      setPhoneError("Mobile Number: Enter a valid 10-digit mobile number.");
    }
  };

  const isValidPhone = cleanPhone(phone).length === 10 && REGEX_INDIAN_PHONE.test(cleanPhone(phone));

  // 4. Email Address Validation (Strict RFC compliant)
  const handleEmailChange = (val: string) => {
    setEmail(val);
    const trimmed = val.trim();
    if (trimmed.length > 0 && REGEX_STRICT_EMAIL.test(trimmed)) {
      setEmailError("");
    }
  };

  const isValidEmail = email.trim().length > 0 && REGEX_STRICT_EMAIL.test(email.trim());

  // 5. Company / Business Name Validation (Letters, numbers, spaces, &, ., -)
  const handleCompanyNameChange = (val: string) => {
    if (/[^a-zA-Z0-9\s&.-]/.test(val)) {
      setCompanyError("Company Name: Only letters, numbers, spaces, &, ., - allowed.");
    } else if (companyError === "Company Name: Only letters, numbers, spaces, &, ., - allowed.") {
      setCompanyError("");
    }

    const sanitized = val.replace(/[^a-zA-Z0-9\s&.-]/g, "");
    setCompanyName(sanitized);

    if (sanitized.trim().length >= 2) {
      setCompanyError("");
    }
  };

  const isValidCompany = companyName.trim().length >= 2 && REGEX_COMPANY_NAME.test(companyName.trim());

  // 6. Business Type Validation
  const isValidBusinessType = businessType.trim().length > 0;

  // 7. State Validation
  const isValidState = state.trim().length > 0;

  // 8. PAN Card Validation
  const handlePanNumberChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setPanNumber(clean);

    if (clean.length === 10) {
      if (!REGEX_PAN_CARD.test(clean)) {
        setPanNumberError("Format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)");
      } else {
        setPanNumberError("");
      }
    } else if (touched.panNumber && clean.length > 0) {
      setPanNumberError("PAN Card must be 10 characters.");
    } else if (touched.panNumber && clean.length === 0) {
      setPanNumberError("Please enter your PAN Card Number.");
    }
  };

  const isValidPan = panNumber.trim().length === 10 && REGEX_PAN_CARD.test(panNumber.trim());

  // 9. GSTIN Validation
  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    setGstin(clean);

    if (clean.length > 0 && clean.length < 15) {
      setGstinError("GSTIN is usually 15 alphanumeric characters.");
    } else {
      setGstinError("");
    }
  };

  const isValidGstin = !gstin.trim() || gstin.trim().length === 15;

  // Document Image Picker (Camera or Gallery)
  const pickDocumentImage = (type: "pan" | "gstin") => {
    Alert.alert(
      type === "pan" ? "Upload PAN Card Document *" : "Upload GSTIN Certificate",
      "Select an option to upload your document:",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission Required", "Camera permission is required to capture documents.");
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.5,
                base64: true,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const base64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                if (type === "pan") {
                  setPanImage(asset.uri);
                  setPanImageBase64(base64);
                  setPanImageError("");
                } else {
                  setGstinImage(asset.uri);
                  setGstinImageBase64(base64);
                }
              }
            } catch (err: any) {
              console.warn("[SignupScreen] Camera picker error:", err);
              Alert.alert("Camera Error", "Could not open camera. Please try selecting the image from your gallery.");
            }
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission Required", "Gallery permission is required to upload documents.");
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.5,
                base64: true,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const base64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                if (type === "pan") {
                  setPanImage(asset.uri);
                  setPanImageBase64(base64);
                  setPanImageError("");
                } else {
                  setGstinImage(asset.uri);
                  setGstinImageBase64(base64);
                }
              }
            } catch (err: any) {
              console.warn("[SignupScreen] Gallery picker error:", err);
              Alert.alert("Gallery Error", "Could not open gallery. Please check app permissions and try again.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const removeDocumentImage = (type: "pan" | "gstin") => {
    if (type === "pan") {
      setPanImage(null);
      setPanImageBase64(null);
      if (touched.panImage) {
        setPanImageError("Please upload your PAN Card document image.");
      }
    } else {
      setGstinImage(null);
      setGstinImageBase64(null);
    }
  };

  // Form Fully Valid Check
  const isFormFullyValid =
    isValidFullName &&
    isValidPhone &&
    isOtpVerified &&
    isValidEmail &&
    isValidCompany &&
    isValidBusinessType &&
    isValidState &&
    isValidCity &&
    isValidPan &&
    Boolean(panImage) &&
    isValidGstin &&
    agreedToTerms &&
    !fullNameError &&
    !phoneError &&
    !emailError &&
    !companyError &&
    !cityError &&
    !panNumberError &&
    !panImageError &&
    !gstinError &&
    !termsError;

  // ─────────────────────────────────────────────────────────────
  // OTP HANDLERS
  // ─────────────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    if (!isValidPhone || otpSending) {
      setPhoneError("Mobile Number: Enter a valid 10-digit mobile number.");
      return;
    }

    setOtpSending(true);
    setOtpError("");
    setPhoneError("");

    try {
      const checkRes = await checkPhoneExists(cleanPhone(phone));
      if (checkRes?.exists || checkRes?.isRegistered || checkRes?.registered) {
        setPhoneError("This mobile number is already registered. Please login.");
        Alert.alert(
          "Account Already Registered",
          `+91 ${cleanPhone(phone)} is already registered with KFPCL Exports. Please login directly.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Login Now",
              onPress: () => {
                navigation.navigate("Login");
              },
            },
          ]
        );
        return;
      }

      const res = await sendOtp(cleanPhone(phone));

      if (isMounted.current) {
        if (res && res.success !== false) {
          setOtpSent(true);
          setIsOtpVerified(false);
          setOtpTimer(res.expiresInSeconds ? Math.min(res.expiresInSeconds, 60) : RESEND_INTERVAL);
          setCanResendOtp(false);
          setOtp(["", "", "", "", "", ""]);
          setTimeout(() => {
            otpInputRefs.current[0]?.focus();
          }, 200);
        } else {
          const msg = res?.message || "Failed to send OTP. Please try again.";
          setPhoneError(msg);
          Alert.alert("Could Not Send OTP", msg);
        }
      }
    } catch (e: any) {
      if (isMounted.current) {
        const msg = e?.message || "Failed to send OTP. Please try again.";
        setPhoneError(msg);
        Alert.alert("Could Not Send OTP", msg);
      }
    } finally {
      if (isMounted.current) {
        setOtpSending(false);
      }
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    await handleSendOtp();
  };

  const handleOtpBoxChange = (text: string, index: number) => {
    setOtpError("");
    const cleanText = text.replace(/\D/g, "");

    if (cleanText.length > 1) {
      const digits = cleanText.slice(0, 6).split("");
      const newOtp = ["", "", "", "", "", ""];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(digits.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanText;
    setOtp(newOtp);

    if (cleanText && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join("").trim();

    if (!enteredOtp || enteredOtp.length < 6 || !REGEX_OTP_6_DIGITS.test(enteredOtp)) {
      setOtpError("OTP: Enter a valid 6-digit OTP.");
      return;
    }

    setOtpVerifying(true);
    setOtpError("");

    try {
      const res = await verifyOtp(cleanPhone(phone), enteredOtp);

      if (res && (res.verified || res.success)) {
        if (res.isRegistered) {
          // If already registered, log in immediately and navigate to MainTabs
          const anyRes = res as any;
          const user = anyRes.user || {
            id: `buyer_${cleanPhone(phone)}`,
            phoneNumber: cleanPhone(phone),
            fullName: anyRes.fullName || "KFPCL Buyer",
          };
          const token = anyRes.accessToken || anyRes.verificationToken;
          const refreshToken = anyRes.refreshToken || token;
          await login(user, token, refreshToken);
          void markPhoneAsRegistered(cleanPhone(phone), user);
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs" }],
          });
          return;
        }

        if (res.verificationToken) {
          setVerificationToken(res.verificationToken);
        }
        setIsOtpVerified(true);
        setOtpError("");
      } else {
        setOtpError("OTP: Incorrect OTP. Please enter the 6-digit verification code.");
      }
    } catch (error: any) {
      setOtpError(error?.message || "OTP verification failed. Please try again.");
    } finally {
      if (isMounted.current) {
        setOtpVerifying(false);
      }
    }
  };

  // Referral code logic
  const applyReferralValidation = useCallback((validation: ReferralValidationResult) => {
    if (validation.selfReferral) {
      setReferralState("self");
      setReferralFeedback("You cannot use your own referral code.");
      return;
    }
    if (!validation.valid) {
      setReferralState("invalid");
      setReferralFeedback("Code not found. You can still register without it.");
      return;
    }
    setReferralState("valid");
    setReferralFeedback(
      validation.referrerName
        ? `Referred by ${validation.referrerName}`
        : "Referral code applied successfully.",
    );
  }, []);

  useEffect(() => {
    const normalizedCode = normalizeReferralCode(referralCode);
    if (!normalizedCode) {
      setReferralState("idle");
      setReferralFeedback("");
      return;
    }
    if (normalizedCode.length < 6) {
      setReferralState("idle");
      setReferralFeedback("Referral codes are 6 characters.");
      return;
    }

    const reqId = ++referralRequestId.current;
    setReferralState("checking");

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await validateReferralCode(normalizedCode);
          if (!isMounted.current || referralRequestId.current !== reqId) return;
          if (res) {
            applyReferralValidation(res);
          } else {
            setReferralState("unavailable");
            setReferralFeedback("Will verify referral during registration.");
          }
        } catch {
          if (!isMounted.current || referralRequestId.current !== reqId) return;
          setReferralState("unavailable");
        }
      })();
    }, 450);

    return () => clearTimeout(timer);
  }, [applyReferralValidation, referralCode]);

  // Form Submit Handler with Comprehensive Validation Checks
  const handleCreateAccount = async () => {
    setTouched({
      fullName: true,
      phone: true,
      email: true,
      companyName: true,
      businessType: true,
      state: true,
      city: true,
      panNumber: true,
      panImage: true,
      gstin: true,
      terms: true,
    });

    // 1. Full Name Check
    if (!fullName.trim()) {
      setFullNameError("Full Name is required.");
      Alert.alert("Validation Error", "Full Name: Only letters and spaces are allowed.");
      return;
    }
    if (!isValidFullName) {
      setFullNameError("Full Name: Only letters and spaces are allowed.");
      Alert.alert("Validation Error", "Full Name: Only letters and spaces are allowed (min 2 letters).");
      return;
    }

    // 2. Mobile Number Check
    if (!isValidPhone) {
      setPhoneError("Mobile Number: Enter a valid 10-digit mobile number.");
      Alert.alert("Validation Error", "Mobile Number: Enter a valid 10-digit mobile number.");
      return;
    }

    // 3. OTP Check
    const activeToken =
      verificationToken ||
      routeVerificationToken ||
      (route.params as any)?.verificationToken ||
      (route.params as any)?.idToken ||
      "";
    if (!isOtpVerified || !activeToken) {
      Alert.alert("OTP Required", "Please verify your mobile number with OTP before creating an account.");
      return;
    }

    // 4. Email Check
    if (!isValidEmail) {
      setEmailError("Email: Enter a valid email address.");
      Alert.alert("Validation Error", "Email: Enter a valid email address (e.g. user@gmail.com).");
      return;
    }

    // 5. Company Name Check
    if (!isValidCompany) {
      setCompanyError("Company Name: Enter a valid company/business name.");
      Alert.alert("Validation Error", "Company Name: Enter a valid company/business name (letters, numbers, &, ., - allowed).");
      return;
    }

    // 6. Business Type Check
    if (!isValidBusinessType) {
      setBusinessTypeError("Please select your Business Type.");
      Alert.alert("Validation Error", "Please select your Business Type from the dropdown.");
      return;
    }

    // 7. State Check
    if (!isValidState) {
      setStateError("Please select your State.");
      Alert.alert("Validation Error", "Please select your State from the dropdown.");
      return;
    }

    // 8. City Check
    if (!city.trim()) {
      setCityError("City is required.");
      Alert.alert("Validation Error", "City: Only letters and spaces are allowed.");
      return;
    }
    if (!isValidCity) {
      setCityError("City: Only letters and spaces are allowed.");
      Alert.alert("Validation Error", "City: Only letters and spaces are allowed.");
      return;
    }

    // 9. PAN Card Number Check
    if (!panNumber.trim()) {
      setPanNumberError("Please enter your PAN Card Number.");
      Alert.alert("Validation Error", "Please provide your PAN Card Number for wholesale account verification.");
      return;
    }
    if (!isValidPan) {
      setPanNumberError("Format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)");
      Alert.alert("Validation Error", "Please enter a valid 10-character PAN Card number (e.g. ABCDE1234F).");
      return;
    }

    // 10. PAN Card Document Image Check
    if (!panImage) {
      setPanImageError("Please upload your PAN Card document image.");
      Alert.alert("Validation Error", "Please upload your PAN Card document image.");
      return;
    }

    // 11. Terms Check
    if (!agreedToTerms) {
      setTermsError("Please accept the terms to create your account.");
      Alert.alert("Terms & Conditions", "Please accept the KFPCL Terms of Trade & Privacy Policy to proceed.");
      return;
    }

    setSubmitting(true);

    try {
      if (referralCode) {
        await savePendingReferralCode(referralCode);
      }

      let res: any = null;
      const tokenToUse =
        activeToken ||
        verificationToken ||
        routeVerificationToken ||
        (route.params as any)?.verificationToken ||
        (route.params as any)?.idToken ||
        "";
      const isFirebaseIdToken =
        tokenToUse.startsWith("ey") || tokenToUse.length > 60;

      const signupData = {
        phoneNumber: cleanPhone(phone),
        verificationToken: tokenToUse,
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        companyName: companyName.trim(),
        businessType: businessType.trim(),
        state: state.trim(),
        city: city.trim(),
        pancardNumber: panNumber.trim(),
        panNumber: panNumber.trim(),
        pancardImage: panImage || undefined,
        panImage: panImage || undefined,
        panImageBase64: panImageBase64 || undefined,
        gstin: gstin.trim() || undefined,
        gstinImage: gstinImage || undefined,
        gstinPhoto: gstinImage || undefined,
        gstinImageBase64: gstinImageBase64 || undefined,
      };

      if (isFirebaseIdToken) {
        try {
          res = await firebaseLogin({
            idToken: tokenToUse,
            ...signupData,
          });
        } catch (fbErr: any) {
          console.warn("[SignupScreen] firebaseLogin notice, falling back to signup:", fbErr);
          res = await signup(signupData);
        }
      } else {
        try {
          res = await signup(signupData);
        } catch (signupErr: any) {
          if (
            signupErr?.message?.includes("Invalid or expired verification token") &&
            tokenToUse.length > 30
          ) {
            console.warn("[SignupScreen] signup invalid token, trying firebaseLogin fallback:", signupErr);
            res = await firebaseLogin({
              idToken: tokenToUse,
              ...signupData,
            });
          } else {
            throw signupErr;
          }
        }
      }

      const sessionData = (res as any)?.data?.data || (res as any)?.data || res;
      const token = sessionData?.accessToken || sessionData?.token || sessionData?.jwt;

      if (sessionData && token) {
        const refreshToken = sessionData.refreshToken || token;
        const user = sessionData.user || sessionData.buyer || sessionData.profile || {
          id: sessionData.id || sessionData.userId || sessionData.uuid || `buyer_${cleanPhone(phone)}`,
          phoneNumber: cleanPhone(phone),
          fullName: fullName.trim(),
          companyName: companyName.trim(),
          businessType: businessType.trim(),
          state: state.trim(),
          city: city.trim(),
        };

        await login(user, token, refreshToken);
        void markPhoneAsRegistered(cleanPhone(phone), user);

        Alert.alert(
          "🎉 Registration Successful",
          `Welcome to KFPCL Exports, ${fullName.trim()}! Your wholesale buyer account is now active.`,
          [
            {
              text: "Explore Marketplace",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "MainTabs" }],
                });
              },
            },
          ]
        );
      } else {
        throw new Error("Registration failed. Please check your details and try again.");
      }
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.response?.data?.error ||
        err?.data?.error ||
        err?.message ||
        "Could not complete registration.";

      let errorMsg = serverMessage;
      // Sanitize raw Hibernate/database flush exceptions
      if (
        errorMsg.includes("com.project") ||
        errorMsg.includes("Hibernate") ||
        errorMsg.includes("flush the Session") ||
        errorMsg.includes("null id in") ||
        errorMsg.includes("rollback-only")
      ) {
        errorMsg = "We encountered a temporary server error while setting up your buyer account. Please try again.";
      }

      const lowerMsg = errorMsg.toLowerCase();

      // 1. Registration Duplicate Email Validation
      const isEmailDuplicate =
        lowerMsg.includes("email") &&
        (lowerMsg.includes("already registered") ||
          lowerMsg.includes("already exists") ||
          lowerMsg.includes("different email"));

      if (isEmailDuplicate) {
        setEmailError(errorMsg);
        setTouched((t) => ({ ...t, email: true }));
        Alert.alert(
          "Email Already Registered",
          errorMsg,
          [
            {
              text: "Try Different Email",
              onPress: () => {
                emailInputRef.current?.focus();
              },
            },
          ]
        );
        return;
      }

      // 2. Registration Duplicate PAN Validation
      const isPanDuplicate =
        lowerMsg.includes("pan") &&
        (lowerMsg.includes("already registered") || lowerMsg.includes("already exists"));

      if (isPanDuplicate) {
        setPanNumberError(errorMsg);
        setTouched((t) => ({ ...t, panNumber: true }));
        Alert.alert("PAN Already Registered", errorMsg);
        return;
      }

      // 3. Mobile Number or General Already Registered
      if (
        lowerMsg.includes("already registered") ||
        lowerMsg.includes("already exists") ||
        err?.status === 409
      ) {
        Alert.alert(
          "Already Registered",
          "This mobile number is already registered. Please log in instead.",
          [
            { text: "Log In", onPress: () => navigation.navigate("Login") },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        Alert.alert("Registration Failed", errorMsg);
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  const filteredStates = INDIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

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
          keyboardDismissMode="none"
          removeClippedSubviews={false}
        >
          {/* Top Hero Header */}
          <LinearGradient
            colors={["#064E3B", "#0A8754", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroHeader,
              { paddingTop: Math.max(insets.top + scale(8), scale(32)) },
            ]}
          >
            {/* Top Bar with Back Button */}
            <View style={styles.topBar}>
              <Pressable
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={scale(20)} color="#FFFFFF" />
              </Pressable>

              <View style={styles.topBarBadge}>
                <Ionicons name="shield-checkmark" size={scale(13)} color="#10B981" />
                <Text style={styles.topBarBadgeText}>Verified Sourcing Portal</Text>
              </View>

              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>BUYER APP</Text>
              </View>
            </View>

            {/* Brand Logo & Title */}
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
          </LinearGradient>

          {/* Elevated Main Form Card */}
          <View style={styles.cardContainer}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Buyer Registration</Text>
                <Text style={styles.formSubtitle}>
                  Fill in your commercial details to unlock direct farm wholesale pricing
                </Text>
              </View>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 1: CONTACT & AUTHENTICATION
                  ───────────────────────────────────────────────────────────── */}
              <View style={styles.sectionDivider}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionIconBadge}>
                    <Ionicons name="person-circle-outline" size={scale(16)} color="#0A8754" />
                  </View>
                  <Text style={styles.sectionHeading}>Contact & Verification</Text>
                </View>
              </View>

              {/* 1. Full Name (Strict: Letters & Spaces Only) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Full Name <Text style={styles.star}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === "fullName" && styles.inputFocused,
                    isValidFullName && styles.inputValid,
                    (fullNameError || (touched.fullName && !isValidFullName)) && styles.inputError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={scale(18)}
                    color={
                      fullNameError || (touched.fullName && !isValidFullName)
                        ? "#DC2626"
                        : focusedField === "fullName"
                        ? "#0A8754"
                        : "#94A3B8"
                    }
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    ref={fullNameInputRef}
                    placeholder="Enter full name (letters only)"
                    placeholderTextColor="#94A3B8"
                    value={fullName}
                    onChangeText={handleFullNameChange}
                    autoCapitalize="words"
                    keyboardType="default"
                    textContentType="name"
                    autoCorrect={false}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => phoneInputRef.current?.focus()}
                    onFocus={() => {
                      setFocusedField("fullName");
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      setTouched((t) => ({ ...t, fullName: true }));
                      const trimmed = fullName.trim();
                      if (!trimmed) {
                        setFullNameError("Full Name is required.");
                      } else if (trimmed.length < 2) {
                        setFullNameError("Full Name must have at least 2 letters.");
                      } else if (REGEX_LETTERS_ONLY.test(trimmed)) {
                        setFullNameError("");
                      }
                    }}
                    style={styles.textInput}
                  />
                  {isValidFullName && (
                    <Ionicons name="checkmark-circle" size={scale(18)} color="#0A8754" />
                  )}
                </View>
                {(fullNameError || (touched.fullName && !isValidFullName)) && (
                  <Text style={styles.errorMsg}>
                    {fullNameError || (touched.fullName && !fullName.trim() ? "Full Name is required." : "Full Name: Only letters and spaces are allowed.")}
                  </Text>
                )}
              </View>

              {/* 2. Mobile Number + Horizontal Send OTP */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Mobile Number <Text style={styles.star}>*</Text>
                </Text>

                <View
                  style={[
                    styles.mobileContainer,
                    focusedField === "phone" && styles.inputFocused,
                    isOtpVerified && styles.mobileContainerVerified,
                    (phoneError || (touched.phone && !isValidPhone)) && styles.inputError,
                  ]}
                >
                  {/* +91 Flag Prefix */}
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.countryFlag}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>

                  {/* Phone Input */}
                  <TextInput
                    ref={phoneInputRef}
                    placeholder="10-digit number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!isOtpVerified}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => emailInputRef.current?.focus()}
                    onFocus={() => {
                      setFocusedField("phone");
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      setTouched((t) => ({ ...t, phone: true }));
                      const clean = cleanPhone(phone);
                      if (!clean) {
                        setPhoneError("Mobile number is required.");
                      } else if (clean.length < 10) {
                        setPhoneError("Mobile Number: Enter a valid 10-digit mobile number.");
                      } else if (!REGEX_INDIAN_PHONE.test(clean)) {
                        setPhoneError("Enter a valid Indian mobile number starting with 6-9.");
                      } else {
                        setPhoneError("");
                      }
                    }}
                    selectionColor="#0A8754"
                    style={[
                      styles.mobileInput,
                      isOtpVerified && styles.mobileInputLocked,
                    ]}
                  />

                  {/* Send OTP / Verified Button */}
                  {isOtpVerified ? (
                    <TouchableOpacity
                      style={styles.verifiedBtnBadge}
                      activeOpacity={0.7}
                      onPress={() => {
                        Alert.alert(
                          "Change Mobile Number?",
                          "Changing your number will require OTP verification again.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Change",
                              style: "destructive",
                              onPress: () => {
                                setIsOtpVerified(false);
                                setOtpSent(false);
                                setOtp(["", "", "", "", "", ""]);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={scale(15)} color="#0A8754" />
                      <Text style={styles.verifiedBtnText}>Verified</Text>
                      <Feather name="edit-2" size={scale(11)} color="#0A8754" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.sendOtpButton,
                        (!isValidPhone || otpSending) && styles.sendOtpButtonDisabled,
                      ]}
                      disabled={!isValidPhone || otpSending}
                      onPress={handleSendOtp}
                      activeOpacity={0.8}
                    >
                      {otpSending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.sendOtpButtonText}>
                          {otpSent ? "Resend" : "Send OTP"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Error Banner for Phone */}
                {(phoneError || (touched.phone && !isValidPhone)) && (
                  <Text style={styles.errorMsg}>
                    <Ionicons name="alert-circle" size={scale(12)} color="#DC2626" />{" "}
                    {phoneError || "Mobile Number: Enter a valid 10-digit mobile number."}
                  </Text>
                )}

                {/* Verified Green Success Banner */}
                {isOtpVerified && (
                  <View style={styles.verifiedBanner}>
                    <Ionicons name="shield-checkmark" size={scale(16)} color="#0A8754" />
                    <Text style={styles.verifiedBannerText}>
                      ✓ Mobile Number Verified
                    </Text>
                  </View>
                )}
              </View>

              {/* 3. Inline 6-Digit OTP Box */}
              {otpSent && !isOtpVerified && (
                <View style={styles.otpInlineCard}>
                  <View style={styles.otpHeaderRow}>
                    <View>
                      <Text style={styles.otpCardTitle}>Enter OTP *</Text>
                      <Text style={styles.otpCardSub}>
                        Code sent to <Text style={styles.boldPhone}>+91 {phone}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* 6 Individual Square Inputs */}
                  <View style={styles.otpBoxesRow}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(r) => {
                          otpInputRefs.current[index] = r;
                        }}
                        value={digit}
                        onChangeText={(t) => handleOtpBoxChange(t, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        selectionColor="#0A8754"
                        style={[
                          styles.otpSquare,
                          digit ? styles.otpSquareFilled : null,
                          otpError ? styles.otpSquareError : null,
                        ]}
                      />
                    ))}
                  </View>

                  {/* OTP Error Message */}
                  {otpError ? (
                    <View style={styles.otpErrorNotice}>
                      <Ionicons name="alert-circle" size={scale(14)} color="#DC2626" />
                      <Text style={styles.otpErrorNoticeText}>{otpError}</Text>
                    </View>
                  ) : null}

                  {/* Verify Action & Resend Timer Row */}
                  <View style={styles.otpActions}>
                    <TouchableOpacity
                      style={[
                        styles.verifyBtn,
                        (otp.join("").length < 6 || otpVerifying) && styles.verifyBtnDisabled,
                      ]}
                      onPress={handleVerifyOtp}
                      disabled={otp.join("").length < 6 || otpVerifying}
                      activeOpacity={0.8}
                    >
                      {otpVerifying ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.verifyBtnText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>

                    {/* Resend Timer */}
                    <View style={styles.resendBlock}>
                      {canResendOtp ? (
                        <TouchableOpacity onPress={handleResendOtp}>
                          <Text style={styles.resendLink}>Resend OTP</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.resendWaitText}>
                          Resend in <Text style={styles.timerBold}>{otpTimer}s</Text>
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}


              {/* 4. Email Address (Strict Validation) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Email Address <Text style={styles.star}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === "email" && styles.inputFocused,
                    isValidEmail && styles.inputValid,
                    (emailError || (touched.email && !isValidEmail)) && styles.inputError,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={scale(18)}
                    color={
                      emailError || (touched.email && !isValidEmail)
                        ? "#DC2626"
                        : focusedField === "email"
                        ? "#0A8754"
                        : "#94A3B8"
                    }
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    ref={emailInputRef}
                    placeholder="e.g. user@gmail.com"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => companyNameInputRef.current?.focus()}
                    onFocus={() => {
                      setFocusedField("email");
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      setTouched((t) => ({ ...t, email: true }));
                      const trimmed = email.trim();
                      if (!trimmed) {
                        setEmailError("Email address is required.");
                      } else if (!REGEX_STRICT_EMAIL.test(trimmed)) {
                        setEmailError("Email: Enter a valid email address (e.g. user@gmail.com).");
                      } else {
                        setEmailError("");
                      }
                    }}
                    style={styles.textInput}
                  />
                  {isValidEmail && !emailError && (
                    <Ionicons name="checkmark-circle" size={scale(18)} color="#0A8754" />
                  )}
                </View>
                {(emailError || (touched.email && !isValidEmail)) && (
                  <Text style={styles.errorMsg}>
                    {emailError || "Email: Enter a valid email address."}
                  </Text>
                )}
              </View>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 2: BUSINESS INFORMATION
                  ───────────────────────────────────────────────────────────── */}
              <View style={styles.sectionDivider}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionIconBadge}>
                    <Ionicons name="business-outline" size={scale(16)} color="#0A8754" />
                  </View>
                  <Text style={styles.sectionHeading}>Business Information</Text>
                </View>
              </View>

              {/* 5. Company / Business Name (Letters, numbers, &, ., -) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Company / Business Name <Text style={styles.star}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === "companyName" && styles.inputFocused,
                    isValidCompany && styles.inputValid,
                    (companyError || (touched.companyName && !isValidCompany)) && styles.inputError,
                  ]}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={scale(18)}
                    color={
                      companyError || (touched.companyName && !isValidCompany)
                        ? "#DC2626"
                        : focusedField === "companyName"
                        ? "#0A8754"
                        : "#94A3B8"
                    }
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    ref={companyNameInputRef}
                    placeholder="e.g. ABC Traders Pvt Ltd"
                    placeholderTextColor="#94A3B8"
                    value={companyName}
                    onChangeText={handleCompanyNameChange}
                    keyboardType="default"
                    autoCorrect={false}
                    autoCapitalize="words"
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => cityInputRef.current?.focus()}
                    onFocus={() => {
                      setFocusedField("companyName");
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      setTouched((t) => ({ ...t, companyName: true }));
                      const trimmed = companyName.trim();
                      if (!trimmed) {
                        setCompanyError("Company / Business Name is required.");
                      } else if (trimmed.length < 2) {
                        setCompanyError("Company Name: Enter a valid company/business name (min 2 chars).");
                      } else if (REGEX_COMPANY_NAME.test(trimmed)) {
                        setCompanyError("");
                      }
                    }}
                    style={styles.textInput}
                  />
                  {isValidCompany && (
                    <Ionicons name="checkmark-circle" size={scale(18)} color="#0A8754" />
                  )}
                </View>
                {(companyError || (touched.companyName && !isValidCompany)) && (
                  <Text style={styles.errorMsg}>
                    {companyError || "Company Name: Enter a valid company/business name."}
                  </Text>
                )}
              </View>

              {/* 6. Business Type Dropdown */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Business Type <Text style={styles.star}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    isValidBusinessType && styles.selectBoxValid,
                    (businessTypeError || (touched.businessType && !isValidBusinessType)) && styles.inputError,
                  ]}
                  onPress={() => {
                    setTouched((t) => ({ ...t, businessType: true }));
                    setShowBusinessTypeModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectLeft}>
                    <MaterialCommunityIcons
                      name="storefront-outline"
                      size={scale(18)}
                      color={isValidBusinessType ? "#0A8754" : "#94A3B8"}
                    />
                    <Text
                      style={[
                        styles.selectText,
                        !businessType && styles.selectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {businessType || "Select Business Type"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={scale(18)} color="#64748B" />
                </TouchableOpacity>
                {(businessTypeError || (touched.businessType && !isValidBusinessType)) && (
                  <Text style={styles.errorMsg}>
                    {businessTypeError || "Please select your business type."}
                  </Text>
                )}
              </View>

              {/* 7. State & City (Side by Side Grid) */}
              <View style={styles.gridRow}>
                {/* State (Searchable Dropdown) */}
                <View style={[styles.fieldGroup, { flex: 1.1 }]}>
                  <Text style={styles.label}>
                    State <Text style={styles.star}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.selectBox,
                      isValidState && styles.selectBoxValid,
                      (stateError || (touched.state && !isValidState)) && styles.inputError,
                    ]}
                    onPress={() => {
                      setTouched((t) => ({ ...t, state: true }));
                      setShowStateModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        !state && styles.selectPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {state || "Select State"}
                    </Text>
                    <Ionicons name="chevron-down" size={scale(16)} color="#64748B" />
                  </TouchableOpacity>
                  {(stateError || (touched.state && !isValidState)) && (
                    <Text style={styles.errorMsg}>{stateError || "State required"}</Text>
                  )}
                </View>

                {/* City (Strict: Letters & Spaces Only) */}
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>
                    City <Text style={styles.star}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === "city" && styles.inputFocused,
                      isValidCity && styles.inputValid,
                      (cityError || (touched.city && !isValidCity)) && styles.inputError,
                    ]}
                  >
                    <TextInput
                      ref={cityInputRef}
                      placeholder="e.g. Hyderabad"
                      placeholderTextColor="#94A3B8"
                      value={city}
                      onChangeText={handleCityChange}
                      keyboardType="default"
                      autoCorrect={false}
                      autoCapitalize="words"
                      blurOnSubmit={false}
                      returnKeyType="next"
                      onSubmitEditing={() => panInputRef.current?.focus()}
                      onFocus={() => {
                        setFocusedField("city");
                      }}
                      onBlur={() => {
                        setFocusedField(null);
                        setTouched((t) => ({ ...t, city: true }));
                        const trimmed = city.trim();
                        if (!trimmed) {
                          setCityError("City is required.");
                        } else if (trimmed.length < 2) {
                          setCityError("City must have at least 2 letters.");
                        } else if (REGEX_LETTERS_ONLY.test(trimmed)) {
                          setCityError("");
                        }
                      }}
                      style={styles.textInput}
                    />
                  </View>
                  {(cityError || (touched.city && !isValidCity)) && (
                    <Text style={styles.errorMsg}>
                      {cityError || "City: Only letters and spaces are allowed."}
                    </Text>
                  )}
                </View>
              </View>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 3: KYC & TAX DOCUMENTS
                  ───────────────────────────────────────────────────────────── */}
              <View style={styles.sectionDivider}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionIconBadge}>
                    <Ionicons name="shield-checkmark-outline" size={scale(16)} color="#0A8754" />
                  </View>
                  <Text style={styles.sectionHeading}>KYC & Tax Documents</Text>
                </View>
              </View>

              {/* 8. PAN Card Number */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    PAN Card Number <Text style={styles.star}>*</Text>
                  </Text>
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === "panNumber" && styles.inputFocused,
                    isValidPan && styles.inputValid,
                    (panNumberError || (touched.panNumber && !isValidPan)) && styles.inputError,
                  ]}
                >
                  <Ionicons
                    name="card-outline"
                    size={scale(18)}
                    color={
                      panNumberError || (touched.panNumber && !isValidPan)
                        ? "#DC2626"
                        : focusedField === "panNumber"
                        ? "#0A8754"
                        : "#94A3B8"
                    }
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    ref={panInputRef}
                    placeholder="e.g. ABCDE1234F"
                    placeholderTextColor="#94A3B8"
                    value={panNumber}
                    onChangeText={handlePanNumberChange}
                    autoCapitalize="characters"
                    maxLength={10}
                    autoCorrect={false}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => gstinInputRef.current?.focus()}
                    onFocus={() => setFocusedField("panNumber")}
                    onBlur={() => {
                      setFocusedField(null);
                      setTouched((t) => ({ ...t, panNumber: true }));
                      if (!panNumber.trim()) {
                        setPanNumberError("Please enter your PAN Card Number.");
                      } else if (!REGEX_PAN_CARD.test(panNumber.trim())) {
                        setPanNumberError("Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)");
                      } else {
                        setPanNumberError("");
                      }
                    }}
                    style={[styles.textInput, { letterSpacing: 1.5, fontWeight: "700" }]}
                  />
                  {isValidPan && (
                    <Ionicons name="checkmark-circle" size={scale(18)} color="#0A8754" />
                  )}
                </View>
                {(panNumberError || (touched.panNumber && !isValidPan)) && (
                  <Text style={styles.errorMsg}>
                    {panNumberError || "Please enter a valid 10-character PAN (e.g. ABCDE1234F)."}
                  </Text>
                )}
              </View>

              {/* 9. PAN Card Document Image */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    PAN Card Image <Text style={styles.star}>*</Text>
                  </Text>
                </View>

                {panImage ? (
                  <View style={styles.docPreviewCard}>
                    <Image source={{ uri: panImage }} style={styles.docThumbnail} resizeMode="cover" />
                    <View style={styles.docPreviewInfo}>
                      <View style={styles.docVerifiedTag}>
                        <Ionicons name="checkmark-circle" size={scale(14)} color="#0A8754" />
                        <Text style={styles.docVerifiedTagText}>PAN Image Attached</Text>
                      </View>
                      <View style={styles.docActionRow}>
                        <TouchableOpacity
                          style={styles.docChangeBtn}
                          onPress={() => pickDocumentImage("pan")}
                          activeOpacity={0.7}
                        >
                          <Feather name="refresh-cw" size={scale(12)} color="#0A8754" />
                          <Text style={styles.docChangeBtnText}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.docRemoveBtn}
                          onPress={() => removeDocumentImage("pan")}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={scale(13)} color="#DC2626" />
                          <Text style={styles.docRemoveBtnText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.docUploadCard,
                      (panImageError || (touched.panImage && !panImage)) && styles.docUploadCardError,
                    ]}
                    onPress={() => {
                      setTouched((t) => ({ ...t, panImage: true }));
                      pickDocumentImage("pan");
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.docUploadIconWrap}>
                      <Ionicons name="cloud-upload-outline" size={scale(24)} color="#0A8754" />
                    </View>
                    <Text style={styles.docUploadTitle}>Upload PAN Card Photo *</Text>
                    <Text style={styles.docUploadSub}>Camera capture or gallery image (JPG, PNG)</Text>
                  </TouchableOpacity>
                )}

                {(panImageError || (touched.panImage && !panImage)) && (
                  <Text style={styles.errorMsg}>
                    {panImageError || "Please upload your PAN Card document image."}
                  </Text>
                )}
              </View>

              {/* 10. GSTIN Number */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>GSTIN Number</Text>
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === "gstin" && styles.inputFocused,
                    Boolean(gstin) && gstin.length === 15 && styles.inputValid,
                  ]}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={scale(18)}
                    color={focusedField === "gstin" ? "#0A8754" : "#94A3B8"}
                    style={styles.inputLeftIcon}
                  />
                  <TextInput
                    ref={gstinInputRef}
                    placeholder="e.g. 22AAAAA0000A1Z5 (15 chars)"
                    placeholderTextColor="#94A3B8"
                    value={gstin}
                    onChangeText={handleGstinChange}
                    autoCapitalize="characters"
                    maxLength={15}
                    autoCorrect={false}
                    blurOnSubmit={false}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    onFocus={() => setFocusedField("gstin")}
                    onBlur={() => setFocusedField(null)}
                    style={[styles.textInput, { letterSpacing: 1.2, fontWeight: "600" }]}
                  />
                  {Boolean(gstin) && gstin.length === 15 && (
                    <Ionicons name="checkmark-circle" size={scale(18)} color="#0A8754" />
                  )}
                </View>
                {gstinError ? (
                  <Text style={styles.hintMsg}>{gstinError}</Text>
                ) : null}
              </View>

              {/* 11. GSTIN Document Image */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>GSTIN Certificate Image</Text>
                </View>

                {gstinImage ? (
                  <View style={styles.docPreviewCard}>
                    <Image source={{ uri: gstinImage }} style={styles.docThumbnail} resizeMode="cover" />
                    <View style={styles.docPreviewInfo}>
                      <View style={styles.docVerifiedTag}>
                        <Ionicons name="checkmark-circle" size={scale(14)} color="#0A8754" />
                        <Text style={styles.docVerifiedTagText}>GST Certificate Attached</Text>
                      </View>
                      <View style={styles.docActionRow}>
                        <TouchableOpacity
                          style={styles.docChangeBtn}
                          onPress={() => pickDocumentImage("gstin")}
                          activeOpacity={0.7}
                        >
                          <Feather name="refresh-cw" size={scale(12)} color="#0A8754" />
                          <Text style={styles.docChangeBtnText}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.docRemoveBtn}
                          onPress={() => removeDocumentImage("gstin")}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={scale(13)} color="#DC2626" />
                          <Text style={styles.docRemoveBtnText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.docUploadCard}
                    onPress={() => pickDocumentImage("gstin")}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.docUploadIconWrap, { backgroundColor: "#F1F5F9" }]}>
                      <Ionicons name="document-attach-outline" size={scale(24)} color="#64748B" />
                    </View>
                    <Text style={styles.docUploadTitle}>Upload GST Certificate</Text>
                    <Text style={styles.docUploadSub}>Camera photo or gallery scan (JPG, PNG)</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Terms & Conditions */}
              <View style={{ marginTop: scale(10) }} />

              {/* 9. Terms & Conditions Checkbox */}
              <Pressable
                style={styles.termsBox}
                onPress={() => {
                  setAgreedToTerms(!agreedToTerms);
                  setTermsError("");
                }}
              >
                <View
                  style={[
                    styles.customCheckbox,
                    agreedToTerms && styles.customCheckboxChecked,
                    (termsError || (touched.terms && !agreedToTerms)) && styles.customCheckboxError,
                  ]}
                >
                  {agreedToTerms && (
                    <Ionicons name="checkmark" size={scale(14)} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.termsAgreementText}>
                  I confirm that I am a commercial buyer <Text style={styles.star}>*</Text>
                </Text>
              </Pressable>
              {(termsError || (touched.terms && !agreedToTerms)) && (
                <Text style={[styles.errorMsg, { marginTop: scale(-8), marginBottom: scale(14) }]}>
                  {termsError || "Please accept the terms to create your account."}
                </Text>
              )}

              {/* 10. Primary Submit CTA Button */}
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  (!isFormFullyValid || submitting) && styles.ctaButtonDisabled,
                ]}
                disabled={!isFormFullyValid || submitting}
                onPress={handleCreateAccount}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    isFormFullyValid && !submitting
                      ? ["#0A8754", "#047857"]
                      : ["#94A3B8", "#64748B"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={scale(19)} color="#FFFFFF" />
                      <Text style={styles.ctaButtonText}>Create Buyer Account</Text>
                      <Ionicons name="arrow-forward" size={scale(18)} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {!isOtpVerified && (
                <View style={styles.otpNoticeBanner}>
                  <Ionicons name="lock-closed" size={scale(13)} color="#B45309" />
                  <Text style={styles.otpNoticeText}>
                    Please verify your mobile number with OTP to enable registration
                  </Text>
                </View>
              )}

              {/* Sign In Footer Link */}
              <View style={styles.footerSignInRow}>
                <Text style={styles.footerQuestion}>Already registered as a Buyer?</Text>
                <Pressable onPress={() => navigation.navigate("Login")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.footerSignInAction}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Business Type Picker Modal */}
      <Modal
        visible={showBusinessTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBusinessTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowBusinessTypeModal(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Business Type</Text>
              <Pressable onPress={() => setShowBusinessTypeModal(false)}>
                <Ionicons name="close" size={scale(22)} color="#64748B" />
              </Pressable>
            </View>

            {BUSINESS_TYPES.map((item) => {
              const isSelected = businessType === item.value;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                  onPress={() => {
                    setBusinessType(item.value);
                    setBusinessTypeError("");
                    setShowBusinessTypeModal(false);
                  }}
                >
                  <View style={[styles.modalIconWrap, isSelected && styles.modalIconWrapSelected]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={scale(22)}
                      color={isSelected ? "#0A8754" : "#475569"}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: scale(12) }}>
                    <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleSelected]}>
                      {item.name}
                    </Text>
                    <Text style={styles.modalItemDesc}>{item.desc}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={scale(20)} color="#0A8754" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* State Picker Modal */}
      <Modal
        visible={showStateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowStateModal(false)} />
          <View style={[styles.modalCard, { maxHeight: "75%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <Pressable onPress={() => setShowStateModal(false)}>
                <Ionicons name="close" size={scale(22)} color="#64748B" />
              </Pressable>
            </View>

            {/* State Search Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={scale(16)} color="#94A3B8" />
              <TextInput
                placeholder="Search state..."
                placeholderTextColor="#94A3B8"
                value={stateSearch}
                onChangeText={setStateSearch}
                style={styles.searchBarInput}
              />
              {stateSearch ? (
                <Pressable onPress={() => setStateSearch("")}>
                  <Ionicons name="close-circle" size={scale(16)} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = state === item;
                return (
                  <TouchableOpacity
                    style={[styles.stateListItem, isSelected && styles.stateListItemSelected]}
                    onPress={() => {
                      setState(item);
                      setStateError("");
                      setShowStateModal(false);
                      setStateSearch("");
                    }}
                  >
                    <Text style={[styles.stateItemText, isSelected && styles.stateItemTextSelected]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={scale(18)} color="#0A8754" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  topBarBadgeText: {
    fontSize: scale(11),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rolePill: {
    backgroundColor: "#10B981",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
  },
  rolePillText: {
    fontSize: scale(10),
    fontWeight: "900",
    color: "#064E3B",
    letterSpacing: 0.5,
  },
  brandHero: {
    alignItems: "center",
    marginTop: scale(4),
  },
  logoBadge: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    marginBottom: scale(8),
    overflow: "hidden",
  },
  brandLogo: {
    width: scale(50),
    height: scale(50),
  },
  heroTitle: {
    fontSize: scale(20),
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  heroSubtitle: {
    fontSize: scale(12),
    color: "#D1FAE5",
    fontWeight: "500",
    marginTop: scale(2),
  },
  cardContainer: {
    paddingHorizontal: scale(16),
    marginTop: scale(-20),
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    paddingHorizontal: scale(18),
    paddingVertical: scale(22),
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.08,
    shadowRadius: scale(16),
  },
  formHeader: {
    marginBottom: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: scale(12),
  },
  formTitle: {
    fontSize: scale(21),
    fontWeight: "800",
    color: "#0F172A",
  },
  formSubtitle: {
    fontSize: scale(12),
    color: "#64748B",
    marginTop: scale(3),
    lineHeight: scale(17),
  },
  sectionDivider: {
    marginTop: scale(12),
    marginBottom: scale(14),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(7),
  },
  fieldGroup: {
    marginBottom: scale(14),
  },
  sectionIconBadge: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  inputValid: {
    borderColor: "#10B981",
    fontWeight: "800",
    color: "#1E293B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  label: {
    fontSize: scale(12),
    fontWeight: "700",
    color: "#334155",
    marginBottom: scale(6),
  },
  star: {
    color: "#DC2626",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: scale(12),
    height: scale(48),
  },
  inputFocused: {
    borderColor: "#0A8754",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorMsg: {
    fontSize: scale(11),
    color: "#EF4444",
    marginTop: scale(4),
    fontWeight: "500",
  },
  textInput: {
    flex: 1,
    fontSize: scale(14),
    color: "#0F172A",
    paddingVertical: scale(10),
  },
  inputLeftIcon: {
    marginRight: scale(8),
  },
  referralHintText: {
    fontSize: scale(11),
    color: "#64748B",
    marginTop: scale(4),
    fontWeight: "500",
  },
  referralSuccess: {
    color: "#059669",
  },
  referralError: {
    color: "#EF4444",
  },
  termsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: scale(16),
    marginBottom: scale(16),
  },
  customCheckbox: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(4),
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(10),
    marginTop: scale(2),
  },
  customCheckboxChecked: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  customCheckboxError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  termsAgreementText: {
    flex: 1,
    fontSize: scale(12),
    color: "#475569",
    lineHeight: scale(18),
  },
  termsAccent: {
    color: "#059669",
    fontWeight: "600",
  },
  mobileContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    height: scale(48),
    overflow: "hidden",
  },
  mobileContainerVerified: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  countryCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingHorizontal: scale(10),
    height: "100%",
    backgroundColor: "#F1F5F9",
    borderRightWidth: 1.5,
    borderRightColor: "#E2E8F0",
  },
  countryFlag: {
    fontSize: scale(15),
  },
  countryCodeText: {
    fontSize: scale(13),
    fontWeight: "800",
    color: "#0F172A",
  },
  mobileInput: {
    flex: 1,
    paddingHorizontal: scale(10),
    fontSize: scale(14),
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  mobileInputLocked: {
    color: "#065F46",
  },
  sendOtpButton: {
    backgroundColor: "#0A8754",
    paddingHorizontal: scale(12),
    height: scale(36),
    borderRadius: scale(8),
    marginRight: scale(6),
    justifyContent: "center",
    alignItems: "center",
    minWidth: scale(80),
  },
  sendOtpButtonDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },
  sendOtpButtonText: {
    color: "#FFFFFF",
    fontSize: scale(12),
    fontWeight: "800",
  },
  verifiedBtnBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: "#DCFCE7",
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    marginRight: scale(6),
  },
  verifiedBtnText: {
    color: "#0A8754",
    fontSize: scale(12),
    fontWeight: "800",
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: "#ECFDF5",
    paddingVertical: scale(7),
    paddingHorizontal: scale(10),
    borderRadius: scale(8),
    marginTop: scale(6),
  },
  verifiedBannerText: {
    color: "#0A8754",
    fontSize: scale(12),
    fontWeight: "700",
  },
  otpInlineCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    marginBottom: scale(16),
  },
  otpHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(12),
  },
  otpCardTitle: {
    fontSize: scale(13),
    fontWeight: "800",
    color: "#0F172A",
  },
  otpCardSub: {
    fontSize: scale(11),
    color: "#64748B",
    marginTop: scale(1),
  },
  boldPhone: {
    fontWeight: "700",
    color: "#0F172A",
  },
  demoFillPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(3),
    backgroundColor: "#ECFDF5",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  demoFillText: {
    fontSize: scale(10),
    fontWeight: "700",
    color: "#0A8754",
  },
  otpBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(6),
    marginBottom: scale(10),
  },
  otpSquare: {
    flex: 1,
    height: scale(46),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    textAlign: "center",
    fontSize: scale(18),
    fontWeight: "800",
    color: "#0F172A",
  },
  otpSquareFilled: {
    borderColor: "#0A8754",
    backgroundColor: "#F0FDF4",
  },
  otpSquareError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  otpErrorNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    marginBottom: scale(8),
  },
  otpErrorNoticeText: {
    fontSize: scale(11),
    color: "#DC2626",
    fontWeight: "600",
  },
  otpActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verifyBtn: {
    backgroundColor: "#0A8754",
    paddingHorizontal: scale(16),
    paddingVertical: scale(9),
    borderRadius: scale(8),
    justifyContent: "center",
    alignItems: "center",
    minWidth: scale(100),
  },
  verifyBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: scale(12),
    fontWeight: "800",
  },
  resendBlock: {
    alignItems: "flex-end",
  },
  resendLink: {
    color: "#0A8754",
    fontSize: scale(12),
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  resendWaitText: {
    color: "#64748B",
    fontSize: scale(12),
    fontWeight: "500",
  },
  timerBold: {
    color: "#0A8754",
    fontWeight: "800",
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: scale(12),
    height: scale(48),
  },
  selectBoxValid: {
    borderColor: "#10B981",
  },
  selectLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    flex: 1,
  },
  selectText: {
    fontSize: scale(13),
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  selectPlaceholder: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  gridRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  referralHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    marginTop: scale(4),
  },
  ctaButton: {
    borderRadius: scale(14),
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#0A8754",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  ctaButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    borderRadius: scale(14),
    gap: scale(8),
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "#F8FAFC",
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    height: scale(44),
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: scale(12),
  },
  searchBarInput: {
    flex: 1,
    fontSize: scale(14),
    color: "#0F172A",
    fontWeight: "600",
  },
  stateListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    borderRadius: scale(10),
    marginBottom: scale(4),
  },
  stateListItemSelected: {
    backgroundColor: "#ECFDF5",
  },
  stateItemText: {
    fontSize: scale(14),
    fontWeight: "600",
    color: "#334155",
  },
  stateItemTextSelected: {
    color: "#0A8754",
    fontWeight: "800",
  },
  root: {
    flex: 1,
    backgroundColor: "#0A8754",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: scale(40),
  },
  heroHeader: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(36),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
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
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(20),
  },
  sectionHeading: {
    fontSize: scale(14),
    fontWeight: "700",
    color: "#0F172A",
  },
  ctaButtonText: {
    fontSize: scale(16),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  otpNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
    marginTop: scale(10),
    paddingHorizontal: scale(12),
  },
  otpNoticeText: {
    fontSize: scale(11),
    color: "#B45309",
    fontWeight: "600",
    textAlign: "center",
  },
  footerSignInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(20),
    marginBottom: scale(10),
    gap: scale(6),
  },
  footerQuestion: {
    fontSize: scale(14),
    color: "#64748B",
    fontWeight: "500",
  },
  footerSignInAction: {
    fontSize: scale(14),
    color: "#0A8754",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(32),
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(16),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: scale(17),
    fontWeight: "700",
    color: "#0F172A",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalItemSelected: {
    borderColor: "#0A8754",
    backgroundColor: "#F0FDF4",
  },
  modalIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconWrapSelected: {
    backgroundColor: "#DCFCE7",
  },
  modalItemTitle: {
    fontSize: scale(14),
    fontWeight: "600",
    color: "#334155",
  },
  modalItemTitleSelected: {
    color: "#0A8754",
    fontWeight: "700",
  },
  modalItemDesc: {
    fontSize: scale(11),
    color: "#64748B",
    marginTop: scale(2),
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scale(6),
  },
  reqBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  reqBadgeText: {
    fontSize: scale(10),
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  optBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  optBadgeText: {
    fontSize: scale(10),
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  docUploadCard: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: scale(12),
    paddingVertical: scale(20),
    paddingHorizontal: scale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  docUploadCardError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  docUploadIconWrap: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scale(8),
  },
  docUploadTitle: {
    fontSize: scale(13),
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: scale(4),
  },
  docUploadSub: {
    fontSize: scale(11),
    color: "#64748B",
    textAlign: "center",
  },
  docPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
    borderRadius: scale(12),
    padding: scale(10),
    gap: scale(12),
  },
  docThumbnail: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(8),
    backgroundColor: "#E2E8F0",
  },
  docPreviewInfo: {
    flex: 1,
    justifyContent: "center",
    gap: scale(6),
  },
  docVerifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  docVerifiedTagText: {
    fontSize: scale(12),
    fontWeight: "700",
    color: "#0A8754",
  },
  docActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  docChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(6),
    backgroundColor: "#DCFCE7",
  },
  docChangeBtnText: {
    fontSize: scale(11),
    fontWeight: "600",
    color: "#0A8754",
  },
  docRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
    borderRadius: scale(6),
    backgroundColor: "#FEE2E2",
  },
  docRemoveBtnText: {
    fontSize: scale(11),
    fontWeight: "600",
    color: "#DC2626",
  },
  hintMsg: {
    fontSize: scale(11),
    color: "#64748B",
    marginTop: scale(4),
  },
});

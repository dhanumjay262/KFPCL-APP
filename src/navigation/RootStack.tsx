import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";

import BottomTabs from "./BottomTabs";

/* Core Screens */
import ProfileScreen from "../screens/profile/ProfileScreen";

/* Auth */
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import OtpScreen from "../screens/auth/OtpScreen";

/* Profile & Business */
import NotificationsScreen from "../screens/profile/NotificationsScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";

/* Product & Sourcing Flow */
import ProductDetailScreen from "../screens/product/ProductDetailScreen";
import CategoryProductsScreen from "../screens/categories/CategoryProductsScreen";

/* Address Flow */
import AddressScreen from "../screens/profile/AddressScreen";
import AddAddressScreen from "../screens/profile/AddAddressScreen";

/* Info */
import PrivacyScreen from "../screens/profile/PrivacyScreen";
import TermsScreen from "../screens/profile/TermsScreen";
import GeneralInfoScreen from "../screens/profile/GeneralInfoScreen";
import AboutScreen from "../screens/profile/AboutScreen";
import HelpScreen from "../screens/profile/HelpScreen";

/* ================= TYPES ================= */

export type RootStackParamList = {
  MainTabs: undefined;

  /* Product & Wholesale Sourcing Flow */
  ProductDetail: { product?: any; id?: string | number; productId?: string | number };
  CategoryProducts: { category: any; initialSubCategoryId?: string | number };
  SearchResults: { query: string };

  /* Address & Warehouse Location */
  Address: undefined;
  AddAddress: undefined;

  /* Core */
  Profile: undefined;
  Inquiries: {
    product?: any;
    commodity?: string;
    selectedVariant?: any;
    variantId?: string | number;
    variantName?: string;
  } | undefined;
  Notifications: undefined;
  EditProfile: undefined;

  /* Auth */
  Login: undefined;
  Signup: {
    phone?: string;
    phoneNumber?: string;
    verificationToken?: string;
    idToken?: string;
    referralCode?: string;
  } | undefined;
  Otp: {
    phone?: string;
    isRegistered?: boolean;
    verificationId?: string;
    signupData?: {
      name: string;
      email?: string;
      referralCode?: string;
    };
    source?: "login" | "signup";
  };

  /* Info */
  GeneralInfo: undefined;
  About: undefined;
  Privacy: undefined;
  Terms: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/* ================= NAVIGATION ================= */

const RootStack = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {!user ? (
        <>
          {/* AUTH */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : (
        <>
          {/* MAIN APP */}
          <Stack.Screen name="MainTabs" component={BottomTabs} />

          {/* WHOLESALE SOURCING FLOW */}
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
          />

          <Stack.Screen
            name="CategoryProducts"
            component={CategoryProductsScreen}
          />

          <Stack.Screen
            name="SearchResults"
            getComponent={() => require("../screens/home/SearchResultsScreen").default}
          />

          {/* INQUIRIES & RFQ */}
          <Stack.Screen
            name="Inquiries"
            getComponent={() => require("../screens/inquiries/InquiriesScreen").default}
          />

          {/* PROFILE & ADDRESSES */}
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
          />

          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
          />

          <Stack.Screen
            name="Address"
            component={AddressScreen}
          />

          <Stack.Screen
            name="AddAddress"
            component={AddAddressScreen}
          />

          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
          />

          {/* INFO & SUPPORT */}
          <Stack.Screen
            name="GeneralInfo"
            component={GeneralInfoScreen}
          />

          <Stack.Screen
            name="About"
            component={AboutScreen}
          />

          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
          />

          <Stack.Screen
            name="Terms"
            component={TermsScreen}
          />

          <Stack.Screen
            name="Help"
            component={HelpScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootStack;

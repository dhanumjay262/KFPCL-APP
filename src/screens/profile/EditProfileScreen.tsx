import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { updateProfile, getProfile } from "../../services/api/profile";

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

const EditProfileScreen = () => {
  const { user, jwtToken, login, logout } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone] = useState(user?.phoneNumber || user?.phone || "");
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [businessType, setBusinessType] = useState(user?.businessType || "");
  const [city, setCity] = useState(user?.city || "");
  const [state, setState] = useState(user?.state || "");

  const [saving, setSaving] = useState(false);
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  // Sync with backend profile data if available
  useEffect(() => {
    let isMounted = true;
    if (jwtToken) {
      getProfile(jwtToken)
        .then((profile) => {
          if (!isMounted || !profile) return;
          if (profile.fullName || profile.name) setName((prev) => prev || profile.fullName || profile.name || "");
          if (profile.email) setEmail((prev) => prev || profile.email || "");
          if (profile.companyName) setCompanyName((prev) => prev || profile.companyName || "");
          if (profile.businessType) setBusinessType((prev) => prev || profile.businessType || "");
          if (profile.city) setCity((prev) => prev || profile.city || "");
          if (profile.state) setState((prev) => prev || profile.state || "");
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [jwtToken]);

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return INDIAN_STATES;
    return INDIAN_STATES.filter((s) =>
      s.toLowerCase().includes(stateSearch.trim().toLowerCase())
    );
  }, [stateSearch]);

  const isValidEmail = (value: string) => {
    if (!value.trim()) return true; // Optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter your Full Name.");
      return;
    }

    if (email.trim() && !isValidEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    if (!companyName.trim()) {
      Alert.alert("Required Field", "Please enter your Company Name.");
      return;
    }

    if (!businessType.trim()) {
      Alert.alert("Required Field", "Please select your Business Type.");
      return;
    }

    if (!city.trim()) {
      Alert.alert("Required Field", "Please enter your City.");
      return;
    }

    if (!state.trim()) {
      Alert.alert("Required Field", "Please select your State.");
      return;
    }

    setSaving(true);

    try {
      let result: any = null;
      if (jwtToken) {
        result = await updateProfile(jwtToken, {
          name: name.trim(),
          fullName: name.trim(),
          email: email.trim() || undefined,
          companyName: companyName.trim(),
          businessType: businessType.trim(),
          city: city.trim(),
          state: state.trim(),
        });
      }

      await login(
        {
          ...user,
          name: result?.name || name.trim(),
          fullName: result?.fullName || name.trim(),
          phone: result?.phone || phone,
          email: result?.email !== undefined ? result.email : email.trim(),
          companyName: result?.companyName || companyName.trim(),
          businessType: result?.businessType || businessType.trim(),
          city: result?.city || city.trim(),
          state: result?.state || state.trim(),
          customerId: result?.id || user?.customerId,
        },
        jwtToken || ""
      );

      Alert.alert("Success", "Profile & Business Info updated successfully!");
      navigation.goBack();
    } catch (error: any) {
      console.error("Profile update error:", error);
      const serverMsg = error?.response?.data?.message || error?.message || "";
      const isAuthError =
        serverMsg.toLowerCase().includes("unauthorized") ||
        serverMsg.toLowerCase().includes("token") ||
        serverMsg.toLowerCase().includes("user not found");

      if (isAuthError) {
        // Persist updates locally so the user does not lose their typed information
        await login(
          {
            ...user,
            name: name.trim(),
            fullName: name.trim(),
            email: email.trim(),
            companyName: companyName.trim(),
            businessType: businessType.trim(),
            city: city.trim(),
            state: state.trim(),
          },
          jwtToken || ""
        );

        Alert.alert(
          "Session Expired",
          "Your login session has expired on the server. Your profile changes have been saved locally on this device. Please sign in again to sync changes with the server.",
          [
            {
              text: "Sign In Again",
              onPress: () => logout(),
            },
            {
              text: "Keep Local Changes",
              style: "cancel",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          "Update Failed",
          serverMsg ? `Could not update profile: ${serverMsg}` : "Could not update profile. Please check the details and try again."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Edit Profile & Business Info</Text>
          <Text style={styles.headerSubtitle}>Update your personal & trade credentials</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1: Personal Details */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="person" size={16} color="#0A8754" />
              </View>
              <Text style={styles.cardTitle}>Personal Details</Text>
            </View>

            <Text style={styles.label}>
              Full Name <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Supriya Sharma"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. contact@business.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.input, styles.disabledInput]}>
              <Ionicons name="lock-closed" size={15} color="#94A3B8" style={{ marginRight: 8 }} />
              <Text style={styles.disabledInputText}>
                {phone ? `+91 ${phone}` : "Not registered"}
              </Text>
            </View>
          </View>

          {/* Card 2: Business Info */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="business" size={16} color="#0A8754" />
              </View>
              <Text style={styles.cardTitle}>Business Info</Text>
            </View>

            <Text style={styles.label}>
              Company Name <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="e.g. Krishna Agro Exports Pvt Ltd"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>
              Business Type <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectBox}
              activeOpacity={0.8}
              onPress={() => setShowBusinessTypeModal(true)}
            >
              <Text style={businessType ? styles.selectText : styles.selectPlaceholder}>
                {businessType || "Select Business Type"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.label}>
              City <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Hyderabad"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>
              State <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selectBox}
              activeOpacity={0.8}
              onPress={() => {
                setStateSearch("");
                setShowStateModal(true);
              }}
            >
              <Text style={state ? styles.selectText : styles.selectPlaceholder}>
                {state || "Select State"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Business Type Modal */}
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
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {BUSINESS_TYPES.map((item) => {
                const isSelected = businessType === item.value;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => {
                      setBusinessType(item.value);
                      setShowBusinessTypeModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalIconWrap, isSelected && styles.modalIconWrapSelected]}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={20}
                        color={isSelected ? "#0A8754" : "#64748B"}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.modalItemDesc}>{item.desc}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#0A8754" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* State Modal */}
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
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            {/* State Search Bar */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                placeholder="Search state..."
                placeholderTextColor="#94A3B8"
                value={stateSearch}
                onChangeText={setStateSearch}
                style={styles.searchBarInput}
              />
              {Boolean(stateSearch) && (
                <Pressable onPress={() => setStateSearch("")}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              )}
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
                      setShowStateModal(false);
                      setStateSearch("");
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.stateItemText, isSelected && styles.stateItemTextSelected]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#0A8754" />
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

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 6,
  },
  requiredAsterisk: {
    color: "#EF4444",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    marginBottom: 10,
  },
  disabledInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  disabledInputText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
  },
  selectText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
  },
  selectPlaceholder: {
    fontSize: 14,
    color: "#94A3B8",
  },
  saveBtn: {
    backgroundColor: "#0A8754",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    elevation: 3,
    shadowColor: "#0A8754",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  saveBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 16,
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
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemSelected: {
    backgroundColor: "#ECFDF5",
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIconWrapSelected: {
    backgroundColor: "#D1FAE5",
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  modalItemTitleSelected: {
    color: "#0A8754",
    fontWeight: "700",
  },
  modalItemDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },
  stateListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  stateListItemSelected: {
    backgroundColor: "#ECFDF5",
  },
  stateItemText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  stateItemTextSelected: {
    color: "#0A8754",
    fontWeight: "700",
  },
});

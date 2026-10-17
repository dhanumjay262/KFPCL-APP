import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your wholesale account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
      ]
    );
  };

  const accountGroup = [
    {
      label: 'Edit Profile & Business Info',
      subtitle: 'Company details, contact info & GST',
      icon: 'person-outline',
      iconColor: '#0A8754',
      iconBg: '#ECFDF5',
      route: 'EditProfile',
    },
  ];

  const preferencesGroup = [
    {
      label: 'Notifications & Alerts',
      subtitle: 'Push notifications, quotes & price movements',
      icon: 'notifications-outline',
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
      route: 'Notifications',
    },
  ];

  const legalGroup = [
    {
      label: 'Terms of B2B Trade',
      subtitle: 'Wholesale procurement & dispatch terms',
      icon: 'shield-checkmark-outline',
      iconColor: '#4F46E5',
      iconBg: '#EEF2FF',
      route: 'Terms',
    },
    {
      label: 'Privacy & Data Policy',
      subtitle: 'Buyer data protection & privacy terms',
      icon: 'lock-closed-outline',
      iconColor: '#7C3AED',
      iconBg: '#F5F3FF',
      route: 'Privacy',
    },
    {
      label: 'Help & Export Support Desk',
      subtitle: 'Mandi desks, logistics help & FAQs',
      icon: 'help-circle-outline',
      iconColor: '#0D9488',
      iconBg: '#F0FDFA',
      route: 'Help',
    },
  ];

  const buyerName = user?.fullName || user?.name || 'Wholesale Buyer';
  const buyerInitial = (buyerName[0] || 'B').toUpperCase();
  const buyerPhone = user?.phoneNumber || user?.phone || 'Registered Trader';
  const buyerEmail = user?.email;
  const buyerCompany = user?.companyName || 'Verified B2B Agricultural Commodity Buyer';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topBarTitle}>Buyer Account</Text>
            <Text style={styles.topBarSubtitle}>Verified Wholesale Terminal</Text>
          </View>
          <View style={styles.verifiedTag}>
            <Ionicons name="shield-checkmark" size={13} color="#0A8754" />
            <Text style={styles.verifiedTagText}>APEDA VERIFIED</Text>
          </View>
        </View>

        {/* Executive Profile Hero Banner */}
        <LinearGradient
          colors={['#064E3B', '#065F46', '#0A8754']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Subtle Ambient Shapes */}
          <View style={styles.ambientCircle1} />
          <View style={styles.ambientCircle2} />

          <View style={styles.heroTopRow}>
            {/* Avatar with Glow Ring */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarRing}>
                <Text style={styles.avatarLetter}>{buyerInitial}</Text>
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark-sharp" size={11} color="#FFFFFF" />
              </View>
            </View>

            {/* Buyer Details */}
            <View style={styles.heroDetails}>
              <Text style={styles.heroName} numberOfLines={1}>
                {buyerName}
              </Text>
              <View style={styles.heroPhoneRow}>
                <Ionicons name="call-outline" size={12} color="#A7F3D0" />
                <Text style={styles.heroPhone}>+91 {buyerPhone}</Text>
              </View>
              {Boolean(buyerEmail) && (
                <View style={styles.heroEmailRow}>
                  <Ionicons name="mail-outline" size={12} color="#D1FAE5" />
                  <Text style={styles.heroEmail} numberOfLines={1}>
                    {buyerEmail}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Edit Icon */}
            <TouchableOpacity
              style={styles.heroEditBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Feather name="edit-2" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Business Company Card */}
          <TouchableOpacity
            style={styles.companyBanner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.companyIconWrap}>
              <Ionicons name="business" size={15} color="#34D399" />
            </View>
            <Text style={styles.companyNameText} numberOfLines={1}>
              {buyerCompany}
            </Text>
            <Feather name="chevron-right" size={14} color="#6EE7B7" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Wholesale Trust Indicators */}
        <View style={styles.trustRow}>
          <View style={styles.trustCard}>
            <View style={[styles.trustIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="shield-checkmark" size={15} color="#0A8754" />
            </View>
            <Text style={styles.trustValue}>GST VERIFIED</Text>
            <Text style={styles.trustLabel}>B2B Trader</Text>
          </View>

          <View style={styles.trustCard}>
            <View style={[styles.trustIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="truck-fast-outline" size={15} color="#2563EB" />
            </View>
            <Text style={styles.trustValue}>PAN-INDIA</Text>
            <Text style={styles.trustLabel}>FTL Logistics</Text>
          </View>
        </View>

        {/* Settings Group 1: Account */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>
          </View>
          <View style={styles.menuContainer}>
            {accountGroup.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.menuItem,
                  idx === accountGroup.length - 1 && styles.menuItemLast,
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon as any} size={19} color={item.iconColor} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.chevronBox}>
                  <Feather name="chevron-right" size={17} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Settings Group 2: Preferences */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
          </View>
          <View style={styles.menuContainer}>
            {preferencesGroup.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.menuItem,
                  idx === preferencesGroup.length - 1 && styles.menuItemLast,
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon as any} size={19} color={item.iconColor} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.chevronBox}>
                  <Feather name="chevron-right" size={17} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Settings Group 3: Compliance & Legal */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>COMPLIANCE & LEGAL</Text>
          </View>
          <View style={styles.menuContainer}>
            {legalGroup.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.menuItem,
                  idx === legalGroup.length - 1 && styles.menuItemLast,
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon as any} size={19} color={item.iconColor} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.chevronBox}>
                  <Feather name="chevron-right" size={17} color="#94A3B8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Out Action Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <View style={styles.logoutIconBox}>
            <Feather name="log-out" size={16} color="#DC2626" />
          </View>
          <Text style={styles.logoutText}>Sign Out of Wholesale Account</Text>
        </TouchableOpacity>

        {/* Footer Brand & Version */}
        <View style={styles.footerWrap}>
          <View style={styles.footerShieldRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#94A3B8" />
            <Text style={styles.versionText}>
              KFPCL Exports Mobile v1.0.4 • B2B Agro Trade Network
            </Text>
          </View>
          <Text style={styles.subVersionText}>
            Authorized Wholesale Buyer Operating Terminal
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  topBarSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0A8754',
    letterSpacing: 0.3,
  },

  /* Hero Banner Card */
  heroCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#064E3B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ambientCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ambientCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#042F2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#34D399',
  },
  avatarLetter: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#064E3B',
  },
  heroDetails: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  heroPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  heroPhone: {
    fontSize: 13,
    color: '#D1FAE5',
    fontWeight: '600',
  },
  heroEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  heroEmail: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: '400',
  },
  heroEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  /* Company Banner inside Hero */
  companyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  companyIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ECFDF5',
    flex: 1,
  },

  /* Trust Indicators Row */
  trustRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  trustCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  trustIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  trustValue: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  trustLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },

  /* Section Groups */
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionDot: {
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#0A8754',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '400',
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  /* Sign Out Button */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 6,
    marginBottom: 16,
  },
  logoutIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },

  /* Footer Version */
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  footerShieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  versionText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  subVersionText: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '500',
  },
});

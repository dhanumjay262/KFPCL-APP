import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome } from '@expo/vector-icons';

const SUPPORT_PHONE = '6309981444';
const SUPPORT_EMAIL = 'kfpclexports@gmail.com';

export default function HelpScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleCall = () => {
    Linking.openURL(`tel:+91${SUPPORT_PHONE}`).catch(() => {
      Alert.alert('Error', 'Unable to place call. Please dial +91 ' + SUPPORT_PHONE);
    });
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      'Hello KFPCL Exports Support Desk, I need assistance with wholesale commodity trade.'
    );
    const url = `https://wa.me/91${SUPPORT_PHONE}?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp. Please ensure WhatsApp is installed.');
    });
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
      Alert.alert('Error', 'Unable to open email app. Contact us at ' + SUPPORT_EMAIL);
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name='arrow-back' size={22} color='#0F172A' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Export Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Contact Support Desk</Text>
        <Text style={styles.subheading}>
          Connect with our dedicated agricultural export and mandi desk executives for inquiries, quotations, and order assistance.
        </Text>

        {/* 1. Call Support */}
        <TouchableOpacity style={styles.supportCard} onPress={handleCall} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Feather name='phone-call' size={20} color='#0A8754' />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.supportTitle}>Call Support</Text>
              <View style={styles.activeTag}>
                <View style={styles.greenDot} />
                <Text style={styles.activeTagText}>AVAILABLE</Text>
              </View>
            </View>
            <Text style={styles.supportDetail}>+91 {SUPPORT_PHONE}</Text>
            <Text style={styles.supportNote}>Mon – Sat • 9:00 AM to 7:00 PM IST</Text>
          </View>
          <Feather name='chevron-right' size={18} color='#94A3B8' />
        </TouchableOpacity>

        {/* 2. WhatsApp Support */}
        <TouchableOpacity style={styles.supportCard} onPress={handleWhatsApp} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: '#E8FBF0' }]}>
            <FontAwesome name='whatsapp' size={22} color='#25D366' />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.supportTitle}>WhatsApp Support</Text>
              <View style={[styles.activeTag, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.activeTagText, { color: '#16A34A' }]}>QUICK CHAT</Text>
              </View>
            </View>
            <Text style={styles.supportDetail}>+91 {SUPPORT_PHONE}</Text>
            <Text style={styles.supportNote}>Instant commodity quotes & mandi updates</Text>
          </View>
          <Feather name='chevron-right' size={18} color='#94A3B8' />
        </TouchableOpacity>

        {/* 3. Email Support */}
        <TouchableOpacity style={styles.supportCard} onPress={handleEmail} activeOpacity={0.75}>
          <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
            <Feather name='mail' size={20} color='#2563EB' />
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.supportTitle}>Email Support</Text>
              <View style={[styles.activeTag, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Text style={[styles.activeTagText, { color: '#2563EB' }]}>OFFICIAL</Text>
              </View>
            </View>
            <Text style={styles.supportDetail}>{SUPPORT_EMAIL}</Text>
            <Text style={styles.supportNote}>Trade documents, contracts & export queries</Text>
          </View>
          <Feather name='chevron-right' size={18} color='#94A3B8' />
        </TouchableOpacity>

        {/* Trust info note */}
        <View style={styles.infoBox}>
          <Ionicons name='shield-checkmark-outline' size={18} color='#0A8754' />
          <Text style={styles.infoBoxText}>
            KFPCL Exports Trade Desk connects wholesale buyers directly to FPO farm aggregators with verified mandi logistics.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 18,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0A8754',
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0A8754',
    letterSpacing: 0.3,
  },
  supportDetail: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  supportNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 12,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
});

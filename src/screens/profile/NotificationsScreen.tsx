import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  getNotifications,
  markNotificationAsRead,
  NotificationItem,
} from '../../services/api/notifications';
import { useNotifications } from '../../context/NotificationsContext';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { markAllAsRead, fetchNotifications, unreadCount } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifs = async () => {
    try {
      const items = await getNotifications();
      setNotifications(items);
    } catch (err) {
      console.warn('[NotificationsScreen] Error loading notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifs();
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.warn('[NotificationsScreen] Error marking all as read:', err);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.isRead && item.id) {
      markNotificationAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      fetchNotifications();
    }

    // If notification is about an RFQ / quotation, jump straight to Inquiries tab/screen
    if (
      item.type === 'RFQ_RESPONSE_RECEIVED' ||
      item.type === 'RFQ_ACCEPTED' ||
      item.type === 'RFQ_REJECTED' ||
      item.referenceType === 'RFQ' ||
      /rfq|quotation|quote/i.test(item.title) ||
      /rfq|quotation|quote/i.test(item.message)
    ) {
      navigation.navigate('Inquiries');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    // Backend generates and returns timestamps in IST; display directly without timezone conversion
    const str = String(dateStr).trim();
    if (str.includes('T')) {
      const [datePart, timePart] = str.split('T');
      const cleanTime = (timePart || '').split('.')[0];
      return cleanTime ? `${datePart} ${cleanTime}` : datePart;
    }
    return str;
  };

  const hasUnread = notifications.some((n) => !n.isRead) || unreadCount > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications & Alerts</Text>
        {hasUnread ? (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markReadBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.markReadText}>Mark as read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0A8754" />
          <Text style={styles.loadingText}>Fetching wholesale alerts...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, idx) => String(item.id || idx)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0A8754']}
            />
          }
          renderItem={({ item }) => {
            const isRfqQuote =
              item.type === 'RFQ_RESPONSE_RECEIVED' ||
              /quotation|quote/i.test(item.title) ||
              /quotation|quote/i.test(item.message);

            return (
              <TouchableOpacity
                style={[
                  styles.notifCard,
                  !item.isRead && styles.unreadCard,
                  isRfqQuote && styles.quoteNotifCard,
                ]}
                activeOpacity={0.8}
                onPress={() => handleNotificationPress(item)}
              >
                <View
                  style={[
                    styles.iconBox,
                    isRfqQuote ? styles.quoteIconBox : styles.generalIconBox,
                  ]}
                >
                  <Ionicons
                    name={isRfqQuote ? 'document-text' : 'notifications'}
                    size={20}
                    color={isRfqQuote ? '#0A8754' : '#64748B'}
                  />
                </View>

                <View style={styles.textWrap}>
                  <View style={styles.topRow}>
                    <Text style={[styles.title, !item.isRead && styles.boldTitle]}>
                      {item.title}
                    </Text>
                    <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
                  </View>

                  <Text style={styles.messageText} numberOfLines={3}>
                    {item.message}
                  </Text>

                  {isRfqQuote && (
                    <View style={styles.viewQuoteAction}>
                      <Text style={styles.viewQuoteText}>View Official Quotation</Text>
                      <Feather name="arrow-right" size={13} color="#0A8754" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={54} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No New Notifications</Text>
              <Text style={styles.emptyDesc}>
                Wholesale price quotes, APMC mandi rates, and dispatch alerts will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  markReadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A8754',
  },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: '#64748B' },
  listContent: { padding: 16, paddingBottom: 40 },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    gap: 12,
  },
  unreadCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  quoteNotifCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#0A8754',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteIconBox: {
    backgroundColor: '#ECFDF5',
  },
  generalIconBox: {
    backgroundColor: '#F1F5F9',
  },
  textWrap: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  boldTitle: {
    fontWeight: '800',
  },
  timeText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  messageText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  viewQuoteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  viewQuoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A8754',
  },
  emptyWrap: {
    paddingVertical: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});

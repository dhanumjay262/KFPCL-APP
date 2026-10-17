import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Linking,
  Keyboard,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  getInquiries,
  submitRFQ,
  acceptQuotation,
  rejectQuotation,
  SubmittedRFQ,
} from '../../services/api/inquiries';

const SUPPORT_PHONE = '6309981444';

const generateEnquiryId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ENQ-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const formatDate = () => {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export default function InquiriesScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Modal state
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquiryProduct, setEnquiryProduct] = useState<any>(null);
  const [enquiryId, setEnquiryId] = useState('');
  const formScrollRef = useRef<ScrollView>(null);
  const isMessageFocused = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height || 0;
      setKeyboardHeight(height);
      if (isMessageFocused.current) {
        setTimeout(() => {
          formScrollRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Form Fields
  const [customCommodity, setCustomCommodity] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [variantId, setVariantId] = useState<number | string | undefined>(undefined);
  const [variantName, setVariantName] = useState<string | undefined>(undefined);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inquiries History
  const [inquiries, setInquiries] = useState<SubmittedRFQ[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load inquiries from storage / backend
  const loadInquiries = async () => {
    try {
      const list = await getInquiries();
      setInquiries(list);
    } catch (e) {
      console.warn('[InquiriesScreen] Error loading inquiries:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInquiries();
  };

  const [processingQuoteId, setProcessingQuoteId] = useState<string | number | null>(null);

  const handleAccept = async (rfq: SubmittedRFQ) => {
    const idToUse = rfq.numericId || rfq.id;
    Alert.alert(
      "Accept Quotation",
      `Are you sure you want to accept the official quotation of ₹${rfq.quotedPrice || rfq.targetPrice} for ${rfq.commodity}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Accept",
          onPress: async () => {
            setProcessingQuoteId(rfq.id);
            const res = await acceptQuotation(idToUse);
            setProcessingQuoteId(null);
            Alert.alert(res.success ? "Quotation Accepted" : "Notice", res.message);
            loadInquiries();
          },
        },
      ]
    );
  };

  const handleReject = async (rfq: SubmittedRFQ) => {
    const idToUse = rfq.numericId || rfq.id;
    Alert.alert(
      "Decline Quotation",
      `Do you want to decline this quote and request revision from the mandi desk?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setProcessingQuoteId(rfq.id);
            const res = await rejectQuotation(idToUse);
            setProcessingQuoteId(null);
            Alert.alert("Quotation Declined", res.message);
            loadInquiries();
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  // Show enquiry form when navigated with a product or commodity
  useEffect(() => {
    const product = route.params?.product;
    const commodity = route.params?.commodity;
    const v = route.params?.selectedVariant;
    const vId = route.params?.variantId || v?.id;
    const vName = route.params?.variantName || v?.variantName || v?.name || v?.value;

    if (product || commodity) {
      const baseName = product?.title || product?.name || commodity || '';
      const fullCommodityName = vName ? `${baseName} (${vName})` : baseName;
      setEnquiryProduct(product || (commodity ? { title: commodity } : null));
      setSelectedVariant(v || null);
      setVariantId(vId);
      setVariantName(vName);
      setCustomCommodity(fullCommodityName);
      setEnquiryId(generateEnquiryId());
      setBuyerName(user?.fullName || user?.name || '');
      setBuyerPhone(user?.phoneNumber || user?.phone || '');
      setSubject(`Price enquiry for ${fullCommodityName || 'wholesale commodity'}`);
      setQuantity('');
      setDeliveryLocation('');
      setMessage('');
      setShowEnquiryForm(true);
    }
  }, [route.params?.product, route.params?.commodity, route.params?.selectedVariant, route.params?.variantId, route.params?.variantName]);

  const handleSubmitEnquiry = async () => {
    const commodityName = enquiryProduct?.title || enquiryProduct?.name || customCommodity.trim() || subject.trim();
    if (!commodityName) {
      Alert.alert('Required', 'Please enter the commodity or product name.');
      return;
    }
    if (!buyerName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    const cleanPhone = buyerPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!quantity.trim()) {
      Alert.alert('Required', 'Please enter the quantity.');
      return;
    }
    if (!deliveryLocation.trim()) {
      Alert.alert('Required', 'Please enter delivery location.');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject.');
      return;
    }

    setSubmitting(true);
    try {
      const targetPriceVal = selectedVariant?.price || enquiryProduct?.price ? `₹${selectedVariant?.price || enquiryProduct.price}` : undefined;
      const targetUnit = selectedVariant?.variantName || selectedVariant?.name || selectedVariant?.value || enquiryProduct?.unit || 'Quintals';

      const res = await submitRFQ({
        id: enquiryId,
        productId: enquiryProduct?.id,
        variantId: variantId,
        variantName: variantName,
        commodity: commodityName,
        quantity: quantity.trim(),
        unit: targetUnit,
        destination: deliveryLocation.trim(),
        targetPrice: targetPriceVal,
        buyerName: buyerName.trim(),
        buyerPhone: cleanPhone,
        subject: subject.trim(),
        message: message.trim(),
      });

      // Reload list so newly created RFQ is immediately reflected
      await loadInquiries();
      setShowEnquiryForm(false);
      setKeyboardHeight(0);
      isMessageFocused.current = false;

      // Clear route params so form doesn't reopen
      navigation.setParams({
        product: undefined,
        commodity: undefined,
        selectedVariant: undefined,
        variantId: undefined,
        variantName: undefined,
      });

      Alert.alert(
        'Enquiry Sent!',
        `Your enquiry ${res.id} for "${commodityName}" has been submitted. Our team will review and contact you shortly.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEnquiry = () => {
    Keyboard.dismiss();
    setKeyboardHeight(0);
    isMessageFocused.current = false;
    setShowEnquiryForm(false);
    navigation.setParams({
      product: undefined,
      commodity: undefined,
      selectedVariant: undefined,
      variantId: undefined,
      variantName: undefined,
    });
  };

  const productName = enquiryProduct?.title || enquiryProduct?.name || customCommodity || 'Wholesale Commodity';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.mainWrap, { paddingTop: insets.top }]}>
        {/* Screen Header */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Wholesale Inquiries</Text>
            <Text style={styles.headerSubtitle}>
              Your inquiry & quotation history
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newRfqBtn}
            activeOpacity={0.8}
            onPress={() => {
              setEnquiryProduct(null);
              setCustomCommodity('');
              setEnquiryId(generateEnquiryId());
              setBuyerName(user?.fullName || user?.name || '');
              setBuyerPhone(user?.phoneNumber || user?.phone || '');
              setSubject('Price enquiry for wholesale commodity');
              setQuantity('');
              setDeliveryLocation('');
              setMessage('');
              setShowEnquiryForm(true);
            }}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newRfqBtnText}>New RFQ</Text>
          </TouchableOpacity>
        </View>

        {/* Inquiries History */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0A8754']}
            />
          }
        >
          {inquiries.length > 0 ? (
            <View style={styles.historyWrap}>
              {inquiries.map((rfq) => (
                <View key={rfq.id} style={styles.rfqHistoryCard}>
                  <View style={styles.rfqCardHeader}>
                    <View>
                      <Text style={styles.rfqIdText}>{rfq.id}</Text>
                      <Text style={styles.rfqDateText}>{rfq.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        rfq.status === 'Quoted' || rfq.status === 'Accepted'
                          ? styles.statusQuoted
                          : rfq.status === 'Rejected'
                          ? styles.statusRejected
                          : styles.statusReviewing,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          rfq.status === 'Quoted' || rfq.status === 'Accepted'
                            ? styles.statusQuotedText
                            : rfq.status === 'Rejected'
                            ? styles.statusRejectedText
                            : styles.statusReviewingText,
                        ]}
                      >
                        {rfq.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.rfqCommodityTitle}>{rfq.commodity}</Text>

                  <View style={styles.rfqDetailsGrid}>
                    <View style={styles.rfqDetailItem}>
                      <Text style={styles.rfqDetailLabel}>Quantity</Text>
                      <Text style={styles.rfqDetailVal}>
                        {rfq.quantity} {rfq.unit}
                      </Text>
                    </View>
                    <View style={styles.rfqDetailItem}>
                      <Text style={styles.rfqDetailLabel}>Destination</Text>
                      <Text style={styles.rfqDetailVal}>{rfq.destination}</Text>
                    </View>
                    {rfq.targetPrice && (
                      <View style={styles.rfqDetailItem}>
                        <Text style={styles.rfqDetailLabel}>Target Rate</Text>
                        <Text style={styles.rfqDetailVal}>{rfq.targetPrice}</Text>
                      </View>
                    )}
                  </View>

                  {/* WHOLESALE QUOTATION SECTION (DISPLAYED WHEN ADMIN SENDS QUOTE) */}
                  {Boolean(rfq.hasQuotation || rfq.quotedPrice || rfq.status === 'Quoted' || rfq.status === 'Accepted') && (
                    <View style={styles.quoteCardBox}>
                      <View style={styles.quoteCardHeader}>
                        <View style={styles.quoteBadgeWrap}>
                          <Ionicons name="checkmark-circle" size={15} color="#0A8754" />
                          <Text style={styles.quoteBadgeTitle}>OFFICIAL WHOLESALE QUOTATION</Text>
                        </View>
                        {Boolean(rfq.quoteDate) && (
                          <Text style={styles.quoteDateText}>{rfq.quoteDate}</Text>
                        )}
                      </View>

                      <View style={styles.quotePriceBanner}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.quotePriceLabel}>OFFICIAL QUOTED RATE</Text>
                          <Text style={styles.quotePriceVal}>
                            ₹{rfq.quotedPrice || 'Rates Available'}
                            {rfq.unit ? <Text style={styles.quotePriceUnit}> /{rfq.unit}</Text> : ''}
                          </Text>
                        </View>
                        {Boolean(rfq.totalAmount) && (
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.quotePriceLabel}>ESTIMATED LOT VALUE</Text>
                            <Text style={styles.quoteTotalVal}>
                              ₹{Number(rfq.totalAmount).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        )}
                      </View>

                      {Boolean(rfq.deliveryTime || rfq.availableQuantity) && (
                        <View style={styles.quoteSpecsRow}>
                          {Boolean(rfq.deliveryTime) && (
                            <View style={styles.quoteSpecItem}>
                              <Feather name="truck" size={12} color="#0A8754" />
                              <Text style={styles.quoteSpecText}>Dispatch: {rfq.deliveryTime}</Text>
                            </View>
                          )}
                          {Boolean(rfq.availableQuantity) && (
                            <View style={styles.quoteSpecItem}>
                              <Ionicons name="cube-outline" size={12} color="#0A8754" />
                              <Text style={styles.quoteSpecText}>
                                Lot Available: {rfq.availableQuantity} {rfq.unit}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {Boolean(rfq.adminNotes) && (
                        <View style={styles.quoteNotesBox}>
                          <Text style={styles.quoteNotesLabel}>MANDI DESK REMARKS & SPECS:</Text>
                          <Text style={styles.quoteNotesText}>{rfq.adminNotes}</Text>
                        </View>
                      )}

                      {/* Quotation Status & Action Buttons */}
                      <View style={styles.quoteActionRow}>
                        {rfq.status === 'Quoted' && (
                          <>
                            <TouchableOpacity
                              style={styles.quoteAcceptBtn}
                              activeOpacity={0.85}
                              onPress={() => handleAccept(rfq)}
                              disabled={processingQuoteId === rfq.id}
                            >
                              <Ionicons name="checkmark-sharp" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.quoteAcceptText}>
                                {processingQuoteId === rfq.id ? 'Processing...' : 'Accept Quote'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.quoteRejectBtn}
                              activeOpacity={0.8}
                              onPress={() => handleReject(rfq)}
                              disabled={processingQuoteId === rfq.id}
                            >
                              <Text style={styles.quoteRejectText}>Decline</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {rfq.status === 'Accepted' && (
                          <View style={styles.acceptedBanner}>
                            <Ionicons name="checkmark-done-circle" size={17} color="#0A8754" />
                            <Text style={styles.acceptedBannerText}>
                              Quotation Accepted • Mandi Logistics In Progress
                            </Text>
                          </View>
                        )}

                        {rfq.status === 'Rejected' && (
                          <View style={styles.rejectedBanner}>
                            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                            <Text style={styles.rejectedBannerText}>Quotation Declined</Text>
                          </View>
                        )}
                      </View>

                      {/* Direct WhatsApp & Call to discuss or confirm */}
                      <View style={styles.quoteContactRow}>
                        <TouchableOpacity
                          style={styles.quoteWhatsappBtn}
                          activeOpacity={0.85}
                          onPress={() => {
                            const text = `Hello KFPCL Exports, regarding Quotation for ${rfq.commodity} (${rfq.rfqCode || rfq.id}) at ₹${rfq.quotedPrice || ''}${rfq.unit ? ` / ${rfq.unit}` : ''}, I want to discuss order confirmation and delivery.`;
                            Linking.openURL(`https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`);
                          }}
                        >
                          <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.quoteContactText}>Discuss on WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.quoteCallBtn}
                          activeOpacity={0.85}
                          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
                        >
                          <Ionicons name="call" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.quoteContactText}>Call</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No inquiries yet</Text>
              <Text style={styles.emptySubText}>
                Browse products and tap RFQ to send an inquiry.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ==================== ENQUIRY FORM MODAL ==================== */}
      <Modal
        visible={showEnquiryForm}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEnquiry}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                paddingTop: insets.top,
                paddingBottom: keyboardHeight,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconWrap}>
                  <Ionicons name="document-text" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.modalHeaderTitle}>ENQUIRY TO SUPPLIER</Text>
                  <Text style={styles.modalHeaderSubtitle} numberOfLines={1}>
                    {productName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={handleCancelEnquiry}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Enquiry Info Bar */}
            <View style={styles.enquiryInfoBar}>
              <View style={styles.enquiryInfoRow}>
                <View style={styles.enquiryInfoItem}>
                  <Text style={styles.enquiryInfoLabel}>ENQUIRY ID</Text>
                  <Text style={styles.enquiryInfoValue}>{enquiryId}</Text>
                </View>
                <View style={styles.enquiryInfoItem}>
                  <Text style={styles.enquiryInfoLabel}>DATE</Text>
                  <Text style={styles.enquiryInfoValue}>{formatDate()}</Text>
                </View>
                <View style={[styles.enquiryInfoItem, { flex: 1.2 }]}>
                  <Text style={styles.enquiryInfoLabel}>PRODUCT</Text>
                  <Text style={styles.enquiryInfoValue} numberOfLines={1}>
                    {productName}
                  </Text>
                </View>
              </View>
              {Boolean(variantName) && (
                <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="pricetag-outline" size={12} color="#0A8754" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0A8754' }}>
                    Selected Variant / Pack: {variantName}
                  </Text>
                </View>
              )}
              {(buyerName || buyerPhone) && (
                <View style={styles.buyerQuickInfo}>
                  {buyerName ? (
                    <View style={styles.buyerQuickItem}>
                      <Ionicons name="person-outline" size={12} color="#64748B" />
                      <Text style={styles.buyerQuickText}>Buyer: {buyerName}</Text>
                    </View>
                  ) : null}
                  {buyerPhone ? (
                    <View style={styles.buyerQuickItem}>
                      <Ionicons name="call-outline" size={12} color="#64748B" />
                      <Text style={styles.buyerQuickText}>Mobile: +91 {buyerPhone}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            {/* Scrollable Form */}
            <ScrollView
              ref={formScrollRef}
              contentContainerStyle={[
                styles.formScrollContent,
                keyboardHeight > 0 && { paddingBottom: 40 },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Commodity / Product Name if not launched from a specific product */}
              {!enquiryProduct?.title && (
                <View style={[styles.formFieldFull, { marginBottom: 14 }]}>
                  <Text style={styles.fieldLabel}>
                    <Ionicons name="leaf-outline" size={12} color="#064E3B" /> COMMODITY / PRODUCT NAME <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Sona Masoori Rice, Red Chilli, Turmeric"
                    placeholderTextColor="#94A3B8"
                    value={customCommodity}
                    onChangeText={setCustomCommodity}
                  />
                </View>
              )}

              {/* Row 1: Buyer Name + Mobile */}
              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>
                    <Ionicons name="person-outline" size={12} color="#064E3B" /> BUYER NAME <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={user?.fullName || user?.name || 'Your full name'}
                    placeholderTextColor="#94A3B8"
                    value={buyerName}
                    onChangeText={setBuyerName}
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>
                    <Ionicons name="call-outline" size={12} color="#064E3B" /> BUYER MOBILE NUMBER <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View style={styles.phoneInputWrap}>
                    <Text style={styles.phonePrefix}>+91</Text>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1, borderWidth: 0 }]}
                      placeholder="9XXXXXXXXX"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      value={buyerPhone}
                      onChangeText={setBuyerPhone}
                    />
                  </View>
                </View>
              </View>

              {/* Row 2: Quantity + Delivery Location */}
              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>
                    QUANTITY <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 500 kg, 5 MT"
                    placeholderTextColor="#94A3B8"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>
                    DELIVERY LOCATION <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Mumbai, Dubai Port"
                    placeholderTextColor="#94A3B8"
                    value={deliveryLocation}
                    onChangeText={setDeliveryLocation}
                  />
                </View>
              </View>

              {/* Subject */}
              <View style={styles.formFieldFull}>
                <Text style={styles.fieldLabel}>
                  SUBJECT <Text style={styles.reqStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Price enquiry for bulk export order"
                  placeholderTextColor="#94A3B8"
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              {/* Message */}
              <View style={styles.formFieldFull}>
                <Text style={styles.fieldLabel}>MESSAGE</Text>
                <TextInput
                  style={[styles.fieldInput, styles.textArea]}
                  placeholder="Describe your requirements: destination port, packaging, certifications, delivery timeline..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                  onFocus={() => {
                    isMessageFocused.current = true;
                    setTimeout(() => {
                      formScrollRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                    setTimeout(() => {
                      formScrollRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                  onBlur={() => {
                    isMessageFocused.current = false;
                  }}
                  onContentSizeChange={() => {
                    if (isMessageFocused.current) {
                      formScrollRef.current?.scrollToEnd({ animated: false });
                    }
                  }}
                />
              </View>
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelEnquiry}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmitEnquiry}
                activeOpacity={0.85}
                disabled={submitting}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.sendBtnText}>
                  {submitting ? 'Sending...' : 'Send Enquiry'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  mainWrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  newRfqBtn: {
    backgroundColor: '#0A8754',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newRfqBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  scrollContent: { padding: 16, paddingBottom: 36 },

  /* History */
  historyWrap: { gap: 12 },
  rfqHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  rfqCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rfqIdText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  rfqDateText: { fontSize: 11, color: '#94A3B8' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  statusQuoted: { backgroundColor: '#ECFDF5' },
  statusQuotedText: { color: '#0A8754', fontSize: 10, fontWeight: '800' },
  statusReviewing: { backgroundColor: '#FEF3C7' },
  statusReviewingText: { color: '#D97706', fontSize: 10, fontWeight: '800' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusRejectedText: { color: '#DC2626', fontSize: 10, fontWeight: '800' },

  /* Official Wholesale Quotation Card Box */
  quoteCardBox: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    padding: 12,
  },
  quoteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    paddingBottom: 6,
  },
  quoteBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quoteBadgeTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0A8754',
    letterSpacing: 0.5,
  },
  quoteDateText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  quotePriceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 8,
  },
  quotePriceLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  quotePriceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0A8754',
    marginTop: 2,
  },
  quotePriceUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  quoteTotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  quoteSpecsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quoteSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quoteSpecText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#064E3B',
  },
  quoteNotesBox: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  quoteNotesLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  quoteNotesText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 16,
  },
  quoteActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quoteAcceptBtn: {
    flex: 2,
    backgroundColor: '#0A8754',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    elevation: 1,
  },
  quoteAcceptText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quoteRejectBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quoteRejectText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  acceptedBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  acceptedBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A8754',
    flex: 1,
  },
  rejectedBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rejectedBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  quoteContactRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quoteWhatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 7,
    borderRadius: 7,
  },
  quoteCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 7,
    borderRadius: 7,
  },
  quoteContactText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  rfqCommodityTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  rfqDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 12,
  },
  rfqDetailItem: { minWidth: '28%' },
  rfqDetailLabel: { fontSize: 10, color: '#64748B', fontWeight: '500' },
  rfqDetailVal: { fontSize: 12, fontWeight: '700', color: '#1E293B', marginTop: 2 },

  /* Empty */
  emptyWrap: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  emptySubText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },

  /* ==================== MODAL ==================== */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Modal Header */
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#064E3B',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#A7F3D0',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Enquiry Info Bar */
  enquiryInfoBar: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  enquiryInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  enquiryInfoItem: {
    flex: 1,
  },
  enquiryInfoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  enquiryInfoValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  buyerQuickInfo: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  buyerQuickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buyerQuickText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  /* Form */
  formScrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  formFieldHalf: {
    flex: 1,
  },
  formFieldFull: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  reqStar: {
    color: '#DC2626',
  },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingLeft: 10,
  },
  phonePrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
    marginRight: 6,
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  /* Footer Buttons */
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  sendBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Linking,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAT_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 16) / 3);
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 160;
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import {
  getCategories,
  getProducts,
  getBanners,
  normalizeImageUrl,
  Category,
  Product,
  Banner,
} from '../../services/api/catalog';

const SUPPORT_PHONE = '6309981444';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount, fetchNotifications } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [failedCatImages, setFailedCatImages] = useState<Record<number, boolean>>({});
  const bannerScrollRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBannerIdx((prev) => {
        const next = (prev + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({
          x: next * BANNER_WIDTH,
          animated: true,
        });
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const loadBanners = useCallback(async () => {
    try {
      const bannerList = await getBanners();
      if (Array.isArray(bannerList) && bannerList.length > 0) {
        const sorted = [...bannerList].sort((a, b) => {
          const posA = a.position ? Number(a.position) : 999;
          const posB = b.position ? Number(b.position) : 999;
          return posA - posB;
        });
        setBanners(sorted);
      }
    } catch (err) {
      console.warn('[HomeScreen] Error loading banners:', err);
    } finally {
      setLoadingBanners(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.allSettled([
        getCategories(),
        getProducts(),
      ]);
      if (catRes.status === 'fulfilled' && catRes.value) {
        setCategories(catRes.value);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value) {
        setProducts(prodRes.value);
      }
    } catch (e) {
      console.warn('[HomeScreen] Error loading catalog data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadData = useCallback(() => {
    loadBanners();
    loadCatalog();
  }, [loadBanners, loadCatalog]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const callDesk = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  // Category display logic: first 6 live categories by default
  const displayedCategories = categories.slice(0, 6);

  // Active and trending products (filtered live by search query on homepage)
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const activeAndTrendingProducts = normalizedQuery
    ? products.filter((p) => {
        if (!p || p.active === false) return false;
        const title = (p.title || p.name || '').toLowerCase();
        const cat = (p.categoryName || '').toLowerCase();
        const sub = (p.subcategoryName || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const store = (p.storeName || '').toLowerCase();
        return (
          title.includes(normalizedQuery) ||
          cat.includes(normalizedQuery) ||
          sub.includes(normalizedQuery) ||
          desc.includes(normalizedQuery) ||
          store.includes(normalizedQuery)
        );
      })
    : products.filter((p) => p.active !== false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user?.fullName || user?.name || 'Wholesale Buyer'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={22} color="#0F172A" />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Mandi Search Bar (Interactive on Homepage) */}
      <View style={styles.searchBar}>
        <Feather name="search" size={18} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search wholesale commodities, grains, pulses..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {Boolean(searchQuery.length > 0) && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

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
        {/* Admin Banners Carousel & Categories (Hidden during live search) */}
        {!searchQuery.trim() && (
          <>
            {banners.length > 0 ? (
          <View style={styles.bannerCarouselContainer}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={BANNER_WIDTH}
              snapToAlignment="center"
              style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT }}
              contentContainerStyle={{ alignItems: 'center' }}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / BANNER_WIDTH
                );
                setActiveBannerIdx(idx);
              }}
            >
              {banners.map((b) => (
                <View
                  key={b.id}
                  style={styles.bannerCardWrapper}
                >
                  <View style={styles.dynamicBannerCard}>
                    {b.imageUrl ? (
                      <Image
                        source={{ uri: b.imageUrl }}
                        style={styles.bannerImage}
                        resizeMode="cover"
                      />
                    ) : null}
                    {Boolean(b.title) && (
                      <View style={styles.bannerImageCaptionStrip}>
                        <Text style={styles.bannerImageCaptionText} numberOfLines={1}>
                          {b.title}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>

            {banners.length > 1 && (
              <View style={styles.bannerDotsRow}>
                {banners.map((b, i) => (
                  <View
                    key={b.id || i}
                    style={[
                      styles.bannerDot,
                      activeBannerIdx === i ? styles.bannerDotActive : null,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : loadingBanners ? (
          <View style={[styles.dynamicBannerCard, { justifyContent: 'center', alignItems: 'center', marginBottom: 20 }]}>
            <ActivityIndicator size="small" color="#0A8754" />
          </View>
        ) : null}

        {/* Section 1: CATEGORIES (FIRST 6 ON HOMEPAGE, BROWSE ALL NAVIGATES TO CATEGORIES) */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Wholesale Categories</Text>
            <Text style={styles.sectionSubtitle}>
              Direct farm-to-mandi sourced commodities
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => {
              try {
                navigation.navigate('Categories', { category: null, initialSubCategoryId: null });
              } catch {
                navigation.navigate('MainTabs', { screen: 'Categories', params: { category: null, initialSubCategoryId: null } });
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>Browse All</Text>
            <Feather
              name="chevron-right"
              size={14}
              color="#0A8754"
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#0A8754" />
            <Text style={styles.loadingText}>Loading wholesale catalog...</Text>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {displayedCategories.map((cat, index) => {
              const catImg = normalizeImageUrl(cat.imageUrl || cat.image);
              const isCatFailed = failedCatImages[cat.id];
              return (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('CategoryProducts', { category: cat })
                }
              >
                <View style={styles.catImageWrap}>
                  {catImg && !isCatFailed ? (
                    <Image
                      source={{ uri: catImg }}
                      style={styles.catImage}
                      resizeMode="cover"
                      onError={() =>
                        setFailedCatImages((prev) => ({
                          ...prev,
                          [cat.id]: true,
                        }))
                      }
                    />
                  ) : (
                    <View style={styles.catPlaceholder}>
                      <Ionicons
                        name={
                          index % 3 === 0
                            ? 'leaf'
                            : index % 3 === 1
                            ? 'nutrition'
                            : 'cube'
                        }
                        size={26}
                        color="#0A8754"
                      />
                    </View>
                  )}
                  {Boolean(cat.discount && cat.discount > 0) && (
                    <View style={styles.catDiscountBadge}>
                      <Text style={styles.catDiscountText}>{cat.discount}%</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.catName} numberOfLines={2}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
              );
            })}
          </View>
        )}
          </>
        )}

        {/* Section 2: ACTIVE & TRENDING PRODUCTS (OR LIVE SEARCH RESULTS) */}
        <View style={[styles.sectionHeader, { marginTop: searchQuery.trim() ? 8 : 24 }]}>
          <View>
            <View style={styles.trendingHeaderRow}>
              <Text style={styles.sectionTitle}>
                {searchQuery.trim()
                  ? `Search Results (${activeAndTrendingProducts.length})`
                  : 'Active & Trending Products'}
              </Text>
              {!searchQuery.trim() && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>MANDI ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionSubtitle}>
              {searchQuery.trim()
                ? `Showing commodities matching "${searchQuery.trim()}"`
                : 'Verified wholesale rates from farmers and FPOs'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#0A8754" />
            <Text style={styles.loadingText}>Loading trending commodities...</Text>
          </View>
        ) : activeAndTrendingProducts.length === 0 && Boolean(searchQuery.trim()) ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, width: '100%' }}>
            <Ionicons name="search-outline" size={40} color="#CBD5E1" />
            <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '700', color: '#475569' }}>
              No commodities found
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: '#94A3B8' }}>
              No wholesale items match "{searchQuery.trim()}"
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {activeAndTrendingProducts.map((prod) => (
              <TouchableOpacity
                key={prod.id}
                style={styles.productCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('ProductDetail', { product: prod })
                }
              >
                {/* Product Image */}
                <View style={styles.productImageWrap}>
                  {prod.imageUrl ? (
                    <Image
                      source={{ uri: prod.imageUrl }}
                      style={styles.productImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="cube-outline" size={36} color="#0A8754" />
                  )}
                  {prod.trending && (
                    <View style={styles.trendingBadge}>
                      <Text style={styles.trendingBadgeText}>TRENDING</Text>
                    </View>
                  )}
                  {Boolean(prod.stock && prod.stock > 0) && (
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>In Stock ({prod.stock})</Text>
                    </View>
                  )}
                </View>

                {/* Product Info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {prod.title}
                  </Text>

                  {Boolean(prod.subcategoryName) && (
                    <Text style={styles.subcatTag} numberOfLines={1}>
                      {prod.subcategoryName}
                    </Text>
                  )}

                  {Boolean(prod.storeName) && (
                    <View style={styles.storeRow}>
                      <Feather name="shield" size={11} color="#0A8754" />
                      <Text style={styles.storeText} numberOfLines={1}>
                        {prod.storeName}
                      </Text>
                    </View>
                  )}

                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>
                      ₹{prod.price}
                      {prod.unit ? (
                        <Text style={styles.unitText}> / {prod.unit}</Text>
                      ) : (
                        ''
                      )}
                    </Text>
                    {Boolean(
                      prod.originalPrice &&
                        prod.originalPrice !== prod.price
                    ) && (
                      <Text style={styles.originalPriceText}>
                        ₹{prod.originalPrice}
                      </Text>
                    )}
                  </View>

                  {/* RFQ Direct Button */}
                  <TouchableOpacity
                    style={styles.quoteBtn}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('Inquiries', { product: prod })
                    }
                  >
                    <Ionicons name="document-text-outline" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
                    <Text style={styles.quoteBtnText}>RFQ</Text>
                  </TouchableOpacity>

                  {/* Direct WhatsApp & Call for this product */}
                  <View style={styles.productContactRow}>
                    <TouchableOpacity
                      style={styles.productWhatsappBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        const text = `Hello KFPCL Exports, I want to inquire about wholesale ${prod.title} (₹${prod.price}${prod.unit ? ` / ${prod.unit}` : ''}).`;
                        Linking.openURL(`https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`);
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                      <Text style={styles.productContactBtnText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.productCallBtn}
                      activeOpacity={0.85}
                      onPress={callDesk}
                    >
                      <Ionicons name="call" size={12} color="#FFFFFF" />
                      <Text style={styles.productContactBtnText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  welcomeText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  userName: { fontSize: 18, color: '#0F172A', fontWeight: '700' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchPlaceholder: { color: '#94A3B8', fontSize: 13, flex: 1 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  bannerCarouselContainer: {
    width: BANNER_WIDTH,
    marginBottom: 20,
    alignSelf: 'center',
  },
  bannerCardWrapper: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  dynamicBannerCard: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#064E3B',
    position: 'relative',
  },
  bannerImage: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  bannerImageCaptionStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bannerImageCaptionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bannerDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  bannerDotActive: {
    width: 18,
    backgroundColor: '#0A8754',
  },
  banner: {
    backgroundColor: '#064E3B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  bannerBadgeWrap: {
    backgroundColor: '#0A8754',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  bannerBadge: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 22,
  },
  bannerSubtitle: { color: '#A7F3D0', fontSize: 12, lineHeight: 17 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0A8754',
  },
  liveBadgeText: {
    color: '#0A8754',
    fontSize: 9,
    fontWeight: '800',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  sectionSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  seeAllText: { fontSize: 12, fontWeight: '600', color: '#0A8754' },
  loadingWrap: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingText: { color: '#64748B', fontSize: 13 },

  /* 3 Categories Per Line Horizontally (All 16 Categories) */
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryCard: {
    width: CAT_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    marginBottom: 4,
  },
  catImageWrap: {
    width: '100%',
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  catImage: {
    width: '100%',
    height: '100%',
  },
  catPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catDiscountBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#DC2626',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  catDiscountText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  catName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 14,
    minHeight: 28,
  },

  /* Products 2-column Grid */
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productImageWrap: {
    width: '100%',
    height: 120,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  trendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  stockBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  stockBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  productInfo: {
    padding: 10,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    minHeight: 34,
    lineHeight: 17,
  },
  subcatTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0A8754',
    marginTop: 2,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  storeText: {
    fontSize: 10,
    color: '#64748B',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A8754',
  },
  unitText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  originalPriceText: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  quoteBtn: {
    backgroundColor: '#0A8754',
    borderRadius: 6,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  quoteBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  productContactRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  productWhatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 5,
    borderRadius: 6,
    gap: 2,
  },
  productCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 5,
    borderRadius: 6,
    gap: 2,
  },
  productContactBtnText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
});

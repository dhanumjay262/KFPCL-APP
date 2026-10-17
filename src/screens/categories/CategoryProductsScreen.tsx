import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  getCategories,
  getSubcategories,
  getProducts,
  normalizeImageUrl,
  Category,
  Subcategory,
  Product,
} from '../../services/api/catalog';

// Comprehensive category-to-subcategory mapping for backend items
const SUBCATEGORY_CATEGORY_MAP: Record<number, number> = {
  25: 17, 26: 17, 31: 19, 32: 19, 33: 22, 34: 19, 35: 20, 36: 20,
  37: 21, 39: 6, 40: 21, 41: 22, 42: 22, 43: 23, 44: 23, 45: 23,
  46: 24, 47: 24, 48: 24, 52: 23, 53: 3,
};

const SUPPORT_PHONE = '6309981444';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLS = 3;
const GRID_GAP = 10;
const GRID_PADDING = 16;
const CAT_CARD_W = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

export default function CategoryProductsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [failedSubcatImages, setFailedSubcatImages] = useState<Record<number, boolean>>({});
  const [failedCatImages, setFailedCatImages] = useState<Record<number, boolean>>({});

  // null = show all categories grid; non-null = show split view
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    route.params?.category || null
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(
    route.params?.initialSubCategoryId ? Number(route.params.initialSubCategoryId) : null
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sync route param when navigated with new category
  useEffect(() => {
    if (route.params && 'category' in route.params) {
      setSelectedCategory(route.params.category || null);
      setSelectedSubcategoryId(
        route.params?.initialSubCategoryId ? Number(route.params.initialSubCategoryId) : null
      );
    }
  }, [route.params?.category, route.params?.initialSubCategoryId]);

  // When tab is focused (e.g. Browse All from homepage), reset to all-categories grid
  useFocusEffect(
    useCallback(() => {
      if (!route.params?.category) {
        setSelectedCategory(null);
        setSelectedSubcategoryId(null);
      }
    }, [route.params?.category])
  );

  const loadData = useCallback(async () => {
    try {
      const [cats, subcats, prods] = await Promise.all([
        getCategories(),
        getSubcategories(),
        getProducts(),
      ]);
      setCategories(cats);
      setSubcategories(subcats);
      setProducts(prods);
    } catch (e) {
      console.warn('[CategoryProductsScreen] Error loading catalog:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Subcategories belonging to the active category
  const activeSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const map = new Map<number, Subcategory>();

    subcategories.forEach((s) => {
      if (s.categoryId === selectedCategory.id) {
        map.set(s.id, s);
      } else if (SUBCATEGORY_CATEGORY_MAP[s.id] === selectedCategory.id) {
        map.set(s.id, s);
      }
    });

    products.forEach((p) => {
      if (p.categoryId === selectedCategory.id && p.subcategoryId) {
        const found = subcategories.find((s) => s.id === p.subcategoryId);
        if (found) map.set(found.id, found);
      }
    });

    return Array.from(map.values());
  }, [selectedCategory, subcategories, products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter((p) => {
      const matchCat = p.categoryId === selectedCategory.id;
      if (!matchCat) return false;
      if (selectedSubcategoryId !== null) {
        return p.subcategoryId === selectedSubcategoryId;
      }
      return true;
    });
  }, [selectedCategory, selectedSubcategoryId, products]);

  const callDesk = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const canGoBack = navigation.canGoBack();

  // ==================== RENDER: ALL CATEGORIES GRID ====================
  const renderAllCategoriesGrid = () => (
    <ScrollView
      contentContainerStyle={styles.gridScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0A8754']} />
      }
    >
      <Text style={styles.gridSectionTitle}>All Wholesale Categories</Text>
      <Text style={styles.gridSectionSubtitle}>
        Tap a category to explore products & subcategories
      </Text>

      <View style={styles.allCategoriesGrid}>
        {categories.map((cat) => {
          const catImg = normalizeImageUrl(cat.imageUrl || cat.image);
          const isCatFailed = failedCatImages[cat.id];

          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.gridCatCard}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedCategory(cat);
                setSelectedSubcategoryId(null);
              }}
            >
              <View style={styles.gridCatImageWrap}>
                {catImg && !isCatFailed ? (
                  <Image
                    source={{ uri: catImg }}
                    style={styles.gridCatImage}
                    resizeMode="cover"
                    onError={() =>
                      setFailedCatImages((prev) => ({ ...prev, [cat.id]: true }))
                    }
                  />
                ) : (
                  <View style={styles.gridCatPlaceholder}>
                    <Ionicons name="cube-outline" size={28} color="#0A8754" />
                  </View>
                )}
                {Boolean(cat.discount && cat.discount > 0) && (
                  <View style={styles.gridCatDiscountBadge}>
                    <Text style={styles.gridCatDiscountText}>{cat.discount}%</Text>
                  </View>
                )}
              </View>
              <Text style={styles.gridCatName} numberOfLines={2}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  // ==================== RENDER: SPLIT VIEW (SUBCATS LEFT + PRODUCTS RIGHT) ====================
  const renderSplitView = () => (
    <View style={styles.splitLayout}>
      {/* Left Sidebar: Subcategories */}
      <View style={styles.leftSidebar}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sidebarContent}
        >
          {/* "All" option */}
          <TouchableOpacity
            style={[
              styles.sidebarItem,
              selectedSubcategoryId === null && styles.sidebarItemActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setSelectedSubcategoryId(null)}
          >
            <View
              style={[
                styles.sidebarIconWrap,
                selectedSubcategoryId === null && styles.sidebarIconWrapActive,
              ]}
            >
              <Ionicons
                name="grid-outline"
                size={18}
                color={selectedSubcategoryId === null ? '#FFFFFF' : '#0A8754'}
              />
            </View>
            <Text
              style={[
                styles.sidebarText,
                selectedSubcategoryId === null && styles.sidebarTextActive,
              ]}
              numberOfLines={2}
            >
              All
            </Text>
          </TouchableOpacity>

          {/* Subcategory Items */}
          {activeSubcategories.map((subcat) => {
            const isActive = selectedSubcategoryId === subcat.id;
            const rawImg =
              subcat.imageUrl ||
              subcat.image ||
              products.find((p) => p.subcategoryId === subcat.id && (p.imageUrl || p.image))?.imageUrl;
            const subcatImg = normalizeImageUrl(rawImg);
            const isFailed = failedSubcatImages[subcat.id];

            return (
              <TouchableOpacity
                key={subcat.id}
                style={[
                  styles.sidebarItem,
                  isActive && styles.sidebarItemActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedSubcategoryId(subcat.id)}
              >
                <View
                  style={[
                    styles.sidebarIconWrap,
                    isActive && styles.sidebarIconWrapActive,
                  ]}
                >
                  {subcatImg && !isFailed ? (
                    <Image
                      source={{ uri: subcatImg }}
                      style={styles.sidebarThumb}
                      resizeMode="cover"
                      onError={() =>
                        setFailedSubcatImages((prev) => ({ ...prev, [subcat.id]: true }))
                      }
                    />
                  ) : (
                    <Ionicons
                      name="leaf-outline"
                      size={18}
                      color={isActive ? '#FFFFFF' : '#0A8754'}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.sidebarText,
                    isActive && styles.sidebarTextActive,
                  ]}
                  numberOfLines={2}
                >
                  {subcat.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {activeSubcategories.length === 0 && (
            <View style={styles.noSubcatsWrap}>
              <Ionicons name="layers-outline" size={20} color="#94A3B8" />
              <Text style={styles.noSubcatsText}>No subcategories</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Right Side: Products */}
      <View style={styles.rightProducts}>
        <ScrollView
          contentContainerStyle={styles.productsScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0A8754']} />
          }
        >
          {filteredProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {filteredProducts.map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.productCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ProductDetail', { product: prod })}
                >
                  <View style={styles.productImageWrap}>
                    {prod.imageUrl ? (
                      <Image
                        source={{ uri: prod.imageUrl }}
                        style={styles.productImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name="cube-outline" size={32} color="#0A8754" />
                    )}
                    {Boolean(prod.stock && prod.stock > 0) && (
                      <View style={styles.stockBadge}>
                        <Text style={styles.stockBadgeText}>Stock: {prod.stock}</Text>
                      </View>
                    )}
                  </View>
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
                        <Feather name="shield" size={10} color="#0A8754" />
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
                      {Boolean(prod.originalPrice && prod.originalPrice !== prod.price) && (
                        <Text style={styles.originalPriceText}>₹{prod.originalPrice}</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.quoteBtn}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('Inquiries', { product: prod })}
                    >
                      <Ionicons name="document-text-outline" size={11} color="#FFFFFF" />
                      <Text style={styles.quoteBtnText}>RFQ</Text>
                    </TouchableOpacity>

                    <View style={styles.productContactRow}>
                      <TouchableOpacity
                        style={styles.productWhatsappBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          const text = `Hello KFPCL Exports, I want to inquire about wholesale ${prod.title} (₹${prod.price}${prod.unit ? ` / ${prod.unit}` : ''}).`;
                          Linking.openURL(`https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`);
                        }}
                      >
                        <Ionicons name="logo-whatsapp" size={12} color="#FFFFFF" />
                        <Text style={styles.contactBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.productCallBtn}
                        activeOpacity={0.85}
                        onPress={callDesk}
                      >
                        <Ionicons name="call" size={11} color="#FFFFFF" />
                        <Text style={styles.contactBtnText}>Call</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyText}>No Products</Text>
              <Text style={styles.emptySubText}>No products found in this category</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {selectedCategory ? (
          // Back to all categories grid
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory(null);
              setSelectedSubcategoryId(null);
              navigation.setParams({ category: null, initialSubCategoryId: null });
            }}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        ) : canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIcon}>
            <Ionicons name="grid" size={20} color="#0A8754" />
          </View>
        )}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedCategory?.name || 'Wholesale Categories'}
          </Text>
          {Boolean(selectedCategory) && (
            <Text style={styles.headerSubtitle}>
              Browse subcategories & products
            </Text>
          )}
        </View>
        {selectedCategory && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate('Inquiries', { commodity: selectedCategory?.name })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={18} color="#0A8754" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0A8754" />
          <Text style={styles.loadingText}>Fetching wholesale commodities...</Text>
        </View>
      ) : selectedCategory ? (
        renderSplitView()
      ) : (
        renderAllCategoriesGrid()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: { flex: 1, marginLeft: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },

  /* Loading */
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 13 },

  /* ==================== ALL CATEGORIES GRID ==================== */
  gridScrollContent: {
    padding: GRID_PADDING,
    paddingBottom: 32,
  },
  gridSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  gridSectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  allCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCatCard: {
    width: CAT_CARD_W,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    marginBottom: 2,
  },
  gridCatImageWrap: {
    width: '100%',
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gridCatImage: {
    width: '100%',
    height: '100%',
  },
  gridCatPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCatDiscountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  gridCatDiscountText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  gridCatName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
    minHeight: 28,
  },

  /* ==================== SPLIT LAYOUT ==================== */
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },

  /* Left Sidebar */
  leftSidebar: {
    width: 95,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  sidebarContent: {
    paddingVertical: 6,
  },
  sidebarItem: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarItemActive: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#0A8754',
  },
  sidebarIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  sidebarIconWrapActive: {
    backgroundColor: '#0A8754',
  },
  sidebarThumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  sidebarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 13,
  },
  sidebarTextActive: {
    color: '#0A8754',
    fontWeight: '800',
  },
  noSubcatsWrap: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 6,
  },
  noSubcatsText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },

  /* Right Products */
  rightProducts: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  productsScrollContent: {
    padding: 8,
    paddingBottom: 32,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    marginBottom: 4,
  },
  productImageWrap: {
    height: 100,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productImage: { width: '100%', height: '100%' },
  stockBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  stockBadgeText: { color: '#0A8754', fontSize: 8, fontWeight: '700' },
  productInfo: { padding: 7 },
  productTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    minHeight: 28,
    lineHeight: 14,
  },
  subcatTag: { fontSize: 9, color: '#0A8754', fontWeight: '600', marginTop: 2 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  storeText: { fontSize: 9, color: '#64748B', flex: 1 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
    marginBottom: 6,
  },
  priceText: { fontSize: 13, fontWeight: '800', color: '#0A8754' },
  unitText: { fontSize: 9, fontWeight: '500', color: '#64748B' },
  originalPriceText: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  quoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A8754',
    borderRadius: 6,
    paddingVertical: 5,
    gap: 3,
  },
  quoteBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
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
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  productCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  emptySubText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

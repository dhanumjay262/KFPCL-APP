import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getProductById,
  getRelatedProducts,
  normalizeProductPrices,
  Product,
  ProductVariant,
} from '../../services/api/catalog';
import { RelatedProductCard } from '../../components/pdp/RelatedProductCard';

const SUPPORT_PHONE = '6309981444';

export default function ProductDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const initialProduct = route.params?.product
    ? { ...route.params.product, ...normalizeProductPrices(route.params.product) }
    : null;
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    initialProduct?.variants && initialProduct.variants.length > 0
      ? initialProduct.variants[0]
      : null
  );
  const [loading, setLoading] = useState(!route.params?.product);
  const scrollRef = React.useRef<ScrollView>(null);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    route.params?.product?.imageUrl ||
      route.params?.product?.mainImageUrl ||
      route.params?.product?.image
  );
  const [imgError, setImgError] = useState(false);

  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Sync initial product if param changes
  useEffect(() => {
    if (route.params?.product) {
      const norm = normalizeProductPrices(route.params.product);
      const updatedProduct = { ...route.params.product, ...norm };
      setProduct(updatedProduct);
      if (Array.isArray(updatedProduct.variants) && updatedProduct.variants.length > 0) {
        setSelectedVariant(updatedProduct.variants[0]);
      }
      setSelectedImage(
        route.params.product.imageUrl ||
          route.params.product.mainImageUrl ||
          route.params.product.image
      );
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [route.params?.product]);

  // Fetch full details if needed
  useEffect(() => {
    const pId = route.params?.productId || route.params?.product?.id || route.params?.id;
    if (pId) {
      let isCurrent = true;
      getProductById(pId)
        .then((live) => {
          if (live && isCurrent) {
            setProduct(live);
            if (Array.isArray(live.variants) && live.variants.length > 0) {
              setSelectedVariant((prev) => {
                if (prev) {
                  const match = live.variants?.find((v) => v.id === prev.id);
                  if (match) return match;
                }
                return live.variants ? live.variants[0] : null;
              });
            }
            setSelectedImage(live.imageUrl || live.mainImageUrl || live.image);
          }
        })
        .finally(() => {
          if (isCurrent) setLoading(false);
        });
      return () => {
        isCurrent = false;
      };
    } else {
      setLoading(false);
    }
  }, [route.params?.productId, route.params?.product?.id, route.params?.id]);

  // Fetch related products based on the current product
  useEffect(() => {
    if (!product?.id) return;
    let isCurrent = true;
    setLoadingRelated(true);

    getRelatedProducts(product, 8)
      .then((items) => {
        if (isCurrent) {
          setRelatedProducts(items);
        }
      })
      .catch((err) => {
        console.warn('[ProductDetail] Error fetching related products:', err);
      })
      .finally(() => {
        if (isCurrent) setLoadingRelated(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [product?.id, product?.subcategoryId, product?.categoryId]);

  const title = product?.title || product?.name || 'Wholesale Commodity';
  const variants = product?.variants || [];
  const hasVariants = variants.length > 0;

  // Dynamic price & MRP & stock based on selected variant
  const activePrice = selectedVariant
    ? (selectedVariant.discountPrice !== undefined && selectedVariant.discountPrice !== null && selectedVariant.discountPrice > 0
        ? selectedVariant.discountPrice
        : selectedVariant.price)
    : product?.price;

  const activeMrp = selectedVariant
    ? (selectedVariant.mrp || selectedVariant.originalPrice || selectedVariant.price)
    : (product?.mrp || product?.originalPrice);

  const activeStock = selectedVariant
    ? (selectedVariant.stockQuantity !== undefined ? selectedVariant.stockQuantity : selectedVariant.stock)
    : (product?.stockQuantity !== undefined ? product?.stockQuantity : product?.stock);

  const activeUnit = selectedVariant
    ? (selectedVariant.variantName || selectedVariant.name || selectedVariant.value || product?.unit)
    : product?.unit;

  const isOutOfStock = typeof activeStock === 'number' && activeStock <= 0;

  // Navigate to a related product (push to stack for proper back-button experience)
  const handleSelectRelatedProduct = (relProd: Product) => {
    if (!relProd) return;
    if (typeof navigation.push === 'function') {
      navigation.push('ProductDetail', { product: relProd });
    } else {
      navigation.navigate('ProductDetail', { product: relProd });
    }
  };

  // Direct RFQ Inquiry with variant parameters
  const handleInquire = (targetProduct?: Product | null) => {
    const p = targetProduct || product;
    navigation.navigate('Inquiries', {
      product: p || undefined,
      selectedVariant: selectedVariant || undefined,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.variantName || selectedVariant?.name || selectedVariant?.value,
    });
  };

  const handleWhatsApp = (targetProduct?: Product | null) => {
    const p = targetProduct || product;
    const pTitle = p?.title || p?.name || 'Wholesale Commodity';
    const vName = selectedVariant?.variantName || selectedVariant?.name || selectedVariant?.value;
    const variantTag = vName ? ` [Variant: ${vName}]` : '';
    const priceStr = activePrice ? `₹${activePrice}` : 'Spot Mandi Rate';
    const unitStr = activeUnit ? ` / ${activeUnit}` : '';
    const text = `Hello KFPCL Exports, I want to inquire about wholesale ${pTitle}${variantTag} (${priceStr}${unitStr}).`;
    Linking.openURL(`https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  // View all in category
  const handleViewCategory = () => {
    if (product?.categoryId) {
      navigation.navigate('CategoryProducts', {
        category: {
          id: product.categoryId,
          name: product.categoryName || 'Category Commodities',
        },
        initialSubCategoryId: product.subcategoryId,
      });
    }
  };

  const rawImages = Array.isArray(product?.images)
    ? product.images.map((img) => img?.imageUrl).filter((u): u is string => Boolean(u))
    : [];
  const allImages = [
    ...(product?.imageUrl ? [product.imageUrl] : []),
    ...rawImages,
  ].filter((url, idx, self) => self.indexOf(url) === idx);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          style={styles.inquireHeaderBtn}
          onPress={() => handleInquire(product)}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={18} color="#0A8754" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0A8754" />
          <Text style={styles.loadingText}>Loading commodity details...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Commodity Imagery */}
          <View style={styles.imageCard}>
            {selectedImage && !imgError ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.image}
                resizeMode="contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="leaf" size={64} color="#0A8754" />
                <Text style={styles.imagePlaceholderText}>KFPCL Verified Lot</Text>
              </View>
            )}
          </View>

          {/* Alternate Image Thumbnails (if multiple available) */}
          {allImages.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailsContainer}
            >
              {allImages.map((uri, i) => {
                const isActive = uri === selectedImage;
                return (
                  <TouchableOpacity
                    key={`thumb-${i}`}
                    onPress={() => setSelectedImage(uri)}
                    style={[styles.thumbnail, isActive && styles.thumbnailActive]}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={styles.thumbnailImage} resizeMode="contain" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Commodity Details Card */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              {Boolean(product?.subcategoryName) && (
                <View style={styles.subcatPill}>
                  <Text style={styles.subcatText}>{product?.subcategoryName}</Text>
                </View>
              )}
              {Boolean(product?.categoryName) && (
                <Text style={styles.catNameText}>• {product?.categoryName}</Text>
              )}
            </View>

            <Text style={styles.title}>{title}</Text>

            {Boolean(product?.storeName) && (
              <View style={styles.storeRow}>
                <Feather name="shield" size={14} color="#0A8754" />
                <Text style={styles.storeText}>{product?.storeName}</Text>
                <View style={styles.verifiedDot} />
                <Text style={styles.verifiedText}>Verified FPO</Text>
              </View>
            )}

            {/* VARIANT SELECTOR SECTION */}
            {hasVariants && (
              <View style={styles.variantContainer}>
                <View style={styles.variantHeaderRow}>
                  <Text style={styles.variantLabel}>Select Pack / Variety</Text>
                  {Boolean(selectedVariant) && (
                    <Text style={styles.variantSelectedBadge}>
                      Selected: {selectedVariant?.variantName || selectedVariant?.name || selectedVariant?.value}
                    </Text>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.variantPillsRow}
                >
                  {variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const vLabel = v.variantName || v.name || v.value || 'Option';
                    const vStock = v.stockQuantity !== undefined ? v.stockQuantity : v.stock;
                    const vIsOut = typeof vStock === 'number' && vStock <= 0;

                    return (
                      <TouchableOpacity
                        key={`variant-${v.id}`}
                        style={[
                          styles.variantPill,
                          isSelected && styles.variantPillActive,
                          vIsOut && styles.variantPillOutOfStock,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setSelectedVariant(v)}
                      >
                        <Text
                          style={[
                            styles.variantPillText,
                            isSelected && styles.variantPillTextActive,
                            vIsOut && styles.variantPillTextOutOfStock,
                          ]}
                        >
                          {vLabel}
                        </Text>
                        {vIsOut ? (
                          <View style={styles.outPillBadge}>
                            <Text style={styles.outPillBadgeText}>Out of stock</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Pricing */}
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>
                ₹{activePrice !== undefined && activePrice !== null ? activePrice : 'Spot Mandi Rate'}
                {activeUnit ? <Text style={styles.unitText}> / {activeUnit}</Text> : ''}
              </Text>
              {Boolean(activeMrp && activePrice && Number(activeMrp) > Number(activePrice)) && (
                <Text style={styles.origPriceText}>₹{activeMrp}</Text>
              )}
              {isOutOfStock && (
                <View style={styles.outOfStockTag}>
                  <Text style={styles.outOfStockTagText}>OUT OF STOCK</Text>
                </View>
              )}
            </View>

            {/* Mandi Specifications Summary */}
            <View style={styles.specsGrid}>
              <View style={styles.specItem}>
                <MaterialCommunityIcons name="scale-bathroom" size={16} color="#0A8754" />
                <Text style={styles.specLabel}>Packaging / Lot</Text>
                <Text style={styles.specValue} numberOfLines={1}>{activeUnit || 'Metric Ton'}</Text>
              </View>
              <View style={styles.specItem}>
                <Ionicons name="cube-outline" size={16} color="#0A8754" />
                <Text style={styles.specLabel}>Stock Lot</Text>
                <Text style={styles.specValue}>
                  {activeStock !== undefined && activeStock !== null
                    ? activeStock > 0
                      ? `${activeStock} Units`
                      : '0 Units'
                    : 'Available'}
                </Text>
              </View>
              <View style={styles.specItem}>
                <Feather name="truck" size={16} color="#0A8754" />
                <Text style={styles.specLabel}>Logistics</Text>
                <Text style={styles.specValue}>FTL Mandi</Text>
              </View>
            </View>

            <Text style={styles.descTitle}>Commodity Grading & Specification</Text>
            <Text style={styles.desc}>
              {product?.description ||
                'Export standard grading with complete Certificate of Analysis (COA) available upon inquiry. Full truckload (FTL) delivery and containerized export packing available directly from APMC mandi.'}
            </Text>
          </View>

          {/* RFQ & Direct Contact Actions */}
          <View style={styles.mainActionsContainer}>
            <TouchableOpacity
              style={[styles.inquireBtn, isOutOfStock && styles.inquireBtnDisabled]}
              activeOpacity={isOutOfStock ? 0.9 : 0.88}
              disabled={isOutOfStock}
              onPress={() => handleInquire(product)}
            >
              <Ionicons
                name={isOutOfStock ? "ban-outline" : "document-text-outline"}
                size={19}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.inquireText}>
                {isOutOfStock ? "Out of Stock" : "RFQ"}
              </Text>
            </TouchableOpacity>

            <View style={styles.pdpContactRow}>
              <TouchableOpacity
                style={styles.pdpWhatsappBtn}
                activeOpacity={0.85}
                onPress={() => handleWhatsApp(product)}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.pdpContactBtnText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdpCallBtn}
                activeOpacity={0.85}
                onPress={handleCall}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.pdpContactBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RELATED PRODUCTS SECTION */}
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <View style={styles.relatedHeaderLeft}>
                <View style={styles.relatedIconWrap}>
                  <Ionicons name="grid-outline" size={16} color="#0A8754" />
                </View>
                <View>
                  <Text style={styles.relatedTitle}>Related Commodities</Text>
                  <Text style={styles.relatedSubtitle}>
                    {product?.subcategoryName
                      ? `Similar lots in ${product.subcategoryName}`
                      : 'Explore similar wholesale varieties'}
                  </Text>
                </View>
              </View>

              {Boolean(product?.categoryId) && (
                <TouchableOpacity
                  onPress={handleViewCategory}
                  style={styles.viewAllBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>See All</Text>
                  <Ionicons name="chevron-forward" size={14} color="#0A8754" />
                </TouchableOpacity>
              )}
            </View>

            {loadingRelated ? (
              <View style={styles.relatedLoadingWrap}>
                <ActivityIndicator size="small" color="#0A8754" />
                <Text style={styles.relatedLoadingText}>Finding related commodities...</Text>
              </View>
            ) : relatedProducts.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedScrollList}
              >
                {relatedProducts.map((item) => (
                  <RelatedProductCard
                    key={`rel-${item.id}`}
                    product={item}
                    onPress={handleSelectRelatedProduct}
                    onInquire={handleInquire}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noRelatedBox}>
                <Ionicons name="leaf-outline" size={24} color="#94A3B8" />
                <Text style={styles.noRelatedText}>
                  No other commodities in this variety right now.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 13 },
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
  backBtn: { width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, marginHorizontal: 8 },
  inquireHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 16, paddingBottom: 48 },
  imageCard: {
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#0A8754',
  },
  certBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#0A8754',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  certBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  mandiActiveTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  mandiActiveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  thumbnailActive: {
    borderColor: '#0A8754',
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  subcatPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  subcatText: { fontSize: 11, fontWeight: '700', color: '#0A8754', textTransform: 'uppercase' },
  catNameText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 6, lineHeight: 26 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  storeText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  verifiedDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#94A3B8' },
  verifiedText: { fontSize: 11, color: '#0A8754', fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 16 },
  priceText: { fontSize: 24, fontWeight: '800', color: '#0A8754' },
  unitText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  origPriceText: { fontSize: 14, color: '#94A3B8', textDecorationLine: 'line-through' },
  specsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'space-around',
  },
  specItem: {
    alignItems: 'center',
    gap: 3,
  },
  specLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  descTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  desc: { color: '#64748B', fontSize: 13, lineHeight: 21 },
  mainActionsContainer: {
    marginBottom: 24,
  },
  inquireBtn: {
    backgroundColor: '#0A8754',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#0A8754',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    marginBottom: 10,
  },
  inquireText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  pdpContactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pdpWhatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pdpCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  pdpContactBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Related Section */
  relatedSection: {
    marginTop: 6,
    marginBottom: 12,
  },
  relatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  relatedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  relatedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  relatedSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A8754',
  },
  relatedLoadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  relatedLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  relatedScrollList: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  noRelatedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  noRelatedText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  /* Variant Selector Styles */
  variantContainer: {
    marginBottom: 16,
    paddingTop: 4,
  },
  variantHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  variantLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  variantSelectedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A8754',
  },
  variantPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  variantPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  variantPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#0A8754',
  },
  variantPillOutOfStock: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    opacity: 0.7,
  },
  variantPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  variantPillTextActive: {
    color: '#0A8754',
    fontWeight: '800',
  },
  variantPillTextOutOfStock: {
    color: '#94A3B8',
  },
  outPillBadge: {
    marginTop: 2,
  },
  outPillBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  outOfStockTag: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  outOfStockTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  inquireBtnDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
    shadowOpacity: 0,
  },
});

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getProducts, Product, normalizeImageUrl } from '../../services/api/catalog';

export default function SearchResultsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const initialQuery = route.params?.query || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getProducts()
      .then((data) => {
        if (mounted) {
          setProducts(data || []);
        }
      })
      .catch((err) => {
        console.warn('[SearchResultsScreen] Error fetching products:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const title = (p.title || p.name || '').toLowerCase();
      const cat = (p.categoryName || '').toLowerCase();
      const sub = (p.subcategoryName || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const store = (p.storeName || '').toLowerCase();
      return (
        title.includes(q) ||
        cat.includes(q) ||
        sub.includes(q) ||
        desc.includes(q) ||
        store.includes(q)
      );
    });
  }, [products, searchQuery]);

  const renderProductItem = ({ item }: { item: Product }) => {
    const imgUrl = normalizeImageUrl(item.imageUrl || item.image || item.mainImageUrl);

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('ProductDetail', {
            product: item,
            productId: item.id,
          })
        }
      >
        <View style={styles.productImageWrap}>
          {imgUrl ? (
            <Image
              source={{ uri: imgUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="cube-outline" size={32} color="#0A8754" />
          )}
          {Boolean(item.trending) && (
            <View style={styles.trendingBadge}>
              <Text style={styles.trendingBadgeText}>TRENDING</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>

          {Boolean(item.subcategoryName || item.categoryName) && (
            <Text style={styles.subcatTag} numberOfLines={1}>
              {item.subcategoryName || item.categoryName}
            </Text>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              ₹{item.price}
              {item.unit ? (
                <Text style={styles.unitText}> / {item.unit}</Text>
              ) : (
                ''
              )}
            </Text>
            {Boolean(item.originalPrice && item.originalPrice !== item.price) && (
              <Text style={styles.originalPriceText}>₹{item.originalPrice}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <Feather name="search" size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search wholesale commodities, grains..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Header Info */}
      <View style={styles.resultInfoRow}>
        <Text style={styles.resultCountText}>
          {loading
            ? 'Searching catalog...'
            : `${filteredProducts.length} commodities found`}
        </Text>
      </View>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#0A8754" />
          <Text style={styles.loadingText}>Loading commodities...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No commodities found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching for wheat, rice, pulses, or spices
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProductItem}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  resultInfoRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  productImageWrap: {
    width: '100%',
    height: 120,
    backgroundColor: '#F1F5F9',
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
    top: 6,
    left: 6,
    backgroundColor: '#0A8754',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  productInfo: {
    padding: 10,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 17,
  },
  subcatTag: {
    fontSize: 11,
    color: '#0A8754',
    fontWeight: '600',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A8754',
  },
  originalPriceText: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

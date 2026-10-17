import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Product } from '../../services/api/catalog';

const SUPPORT_PHONE = '6309981444';

interface RelatedProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  onInquire?: (product: Product) => void;
}

export const RelatedProductCard: React.FC<RelatedProductCardProps> = ({
  product,
  onPress,
  onInquire,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const title = product?.title || product?.name || 'Wholesale Commodity';
  const imgUrl = product?.imageUrl || product?.mainImageUrl || product?.image;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => onPress(product)}
    >
      {/* Image Wrap */}
      <View style={styles.imageWrap}>
        {imgUrl && !imgError ? (
          <Image
            source={{ uri: imgUrl }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.placeholderWrap}>
            <Ionicons name="cube-outline" size={32} color="#0A8754" />
          </View>
        )}

        {/* Stock / Mandi Badge */}
        {Boolean(product.stock && product.stock > 0) ? (
          <View style={styles.stockBadge}>
            <Text style={styles.stockBadgeText}>In Stock ({product.stock})</Text>
          </View>
        ) : product.trending ? (
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingBadgeText}>POPULAR</Text>
          </View>
        ) : null}
      </View>

      {/* Info Wrap */}
      <View style={styles.infoWrap}>
        {Boolean(product.subcategoryName) && (
          <Text style={styles.subcatText} numberOfLines={1}>
            {product.subcategoryName}
          </Text>
        )}

        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {Boolean(product.storeName) && (
          <View style={styles.storeRow}>
            <Feather name="shield" size={11} color="#0A8754" />
            <Text style={styles.storeText} numberOfLines={1}>
              {product.storeName}
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>
            ₹{product.price || 'Mandi Rate'}
          </Text>
          {Boolean(product.unit) && (
            <Text style={styles.unitText}>/{product.unit}</Text>
          )}
          {Boolean(product.originalPrice && product.originalPrice !== product.price) && (
            <Text style={styles.originalPriceText}>₹{product.originalPrice}</Text>
          )}
        </View>

        {/* RFQ Action */}
        <TouchableOpacity
          style={styles.rfqBtn}
          activeOpacity={0.8}
          onPress={() => (onInquire ? onInquire(product) : onPress(product))}
        >
          <Ionicons name="document-text-outline" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
          <Text style={styles.rfqBtnText}>RFQ</Text>
        </TouchableOpacity>

        {/* WhatsApp & Call Action Row */}
        <View style={styles.productContactRow}>
          <TouchableOpacity
            style={styles.productWhatsappBtn}
            activeOpacity={0.85}
            onPress={() => {
              const text = `Hello KFPCL Exports, I want to inquire about wholesale ${title} (₹${product.price || 'Mandi Rate'}${product.unit ? ` / ${product.unit}` : ''}).`;
              Linking.openURL(`https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent(text)}`);
            }}
          >
            <Ionicons name="logo-whatsapp" size={11} color="#FFFFFF" />
            <Text style={styles.contactBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.productCallBtn}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          >
            <Ionicons name="call" size={10} color="#FFFFFF" />
            <Text style={styles.contactBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  imageWrap: {
    width: '100%',
    height: 110,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  stockBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0A8754',
  },
  trendingBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trendingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  infoWrap: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  subcatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A8754',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
    marginBottom: 6,
    minHeight: 34,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  storeText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  priceText: {
    fontSize: 15,
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
    marginLeft: 2,
  },
  rfqBtn: {
    backgroundColor: '#0A8754',
    borderRadius: 7,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 2,
  },
  rfqBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  productContactRow: {
    flexDirection: 'row',
    gap: 4,
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
  contactBtnText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
});

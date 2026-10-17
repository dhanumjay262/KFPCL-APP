import http from "./httpClient";
import { API_CONFIG } from "../../config/api.config";

export interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  image?: string;
  discount?: number;
  active?: boolean;
  displayOrder?: number;
}

export interface Banner {
  id: number;
  title?: string;
  imageUrl?: string;
  targetUrl?: string | null;
  position?: string | number;
  active?: boolean;
  createdAt?: string;
}

export interface Subcategory {
  id: number;
  name: string;
  description?: string;
  categoryId?: number;
  categoryName?: string | null;
  imageUrl?: string;
  image?: string;
  active?: boolean;
  displayOrder?: number;
}

export interface ProductImage {
  id?: number;
  imageUrl?: string;
  image?: string;
  isPrimary?: boolean;
}

export interface ProductStore {
  id?: number;
  name?: string;
  city?: string;
  state?: string | null;
  country?: string;
}

export interface ProductVariant {
  id: number;
  name: string;
  variantName?: string;
  value?: string;
  sku?: string;
  price?: number;
  discountPrice?: number;
  mrp?: number;
  originalPrice?: number;
  stock?: number;
  stockQuantity?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface Product {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  mrp?: number;
  stock?: number;
  stockQuantity?: number;
  unit?: string;
  categoryId?: number;
  categoryName?: string;
  subcategoryId?: number;
  subcategoryName?: string;
  storeId?: number;
  storeName?: string;
  store?: ProductStore;
  imageUrl?: string;
  image?: string;
  mainImageUrl?: string;
  rating?: number;
  reviewCount?: number;
  trending?: boolean;
  active?: boolean;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export const normalizeImageUrl = (url?: string | null): string | undefined => {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = (API_CONFIG.BASE_URL || "https://api.kfpclexports.com")
    .trim()
    .replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
};

/**
 * Fetch all categories from GET /api/categories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const list = await http.get<Category[]>("/api/categories");
    if (!Array.isArray(list)) return [];
    return list
      .filter((c) => c && c.active !== false)
      .map((c) => {
        const norm = normalizeImageUrl(c.imageUrl || c.image);
        return {
          ...c,
          imageUrl: norm,
          image: norm,
        };
      });
  } catch (err) {
    console.warn("[catalog] Error fetching categories:", err);
    return [];
  }
}

/**
 * Fetch all subcategories from GET /api/subcategories
 */
export async function getSubcategories(): Promise<Subcategory[]> {
  try {
    const list = await http.get<Subcategory[]>("/api/subcategories");
    if (!Array.isArray(list)) return [];
    return list
      .filter((s) => s && s.active !== false)
      .map((s) => {
        const norm = normalizeImageUrl(s.imageUrl || s.image);
        return {
          ...s,
          imageUrl: norm,
          image: norm,
        };
      });
  } catch (err) {
    console.warn("[catalog] Error fetching subcategories:", err);
    return [];
  }
}

/**
 * Normalizes product prices:
 * Ensures `price` is always the active discounted selling price (displayed in green),
 * and `originalPrice` is always the higher original MRP (striked out).
 */
export const normalizeProductPrices = (p: Partial<Product>): { price?: number; originalPrice?: number } => {
  const p1 = Number(p.price);
  const p2 = Number(p.originalPrice || (p as any).mrp);

  const hasP1 = !isNaN(p1) && p1 > 0;
  const hasP2 = !isNaN(p2) && p2 > 0;

  if (hasP1 && hasP2 && p1 !== p2) {
    return {
      price: Math.min(p1, p2),
      originalPrice: Math.max(p1, p2),
    };
  }

  return {
    price: hasP1 ? p1 : p.price,
    originalPrice: hasP2 ? p2 : (p.originalPrice || (p as any).mrp),
  };
};

/**
 * Fetch products from GET /api/products
 * Optional filters: categoryId, subcategoryId
 */
export async function getProducts(params?: {
  categoryId?: number;
  subcategoryId?: number;
}): Promise<Product[]> {
  try {
    const queryParts: string[] = [];
    if (params?.categoryId) queryParts.push(`categoryId=${params.categoryId}`);
    if (params?.subcategoryId) queryParts.push(`subcategoryId=${params.subcategoryId}`);
    const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

    const res = await http.get<any>(`/api/products${query}`);
    const list: Product[] = Array.isArray(res) ? res : res?.content || res?.data || [];
    if (!Array.isArray(list)) return [];
    let items = list.filter((p) => p && p.active !== false);

    // Client-side filter fallback in case backend ignores query params
    if (params?.categoryId !== undefined) {
      items = items.filter((p) => Number(p.categoryId) === Number(params.categoryId));
    }
    if (params?.subcategoryId !== undefined) {
      items = items.filter((p) => Number(p.subcategoryId) === Number(params.subcategoryId));
    }

    // Sort newest first by default so newly added products are at top
    items.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

    return items.map((p) => {
      const norm = normalizeImageUrl(p.mainImageUrl || p.imageUrl || p.image);
      const prices = normalizeProductPrices(p);
      const variants: ProductVariant[] = Array.isArray(p.variants)
        ? p.variants.map((v: any) => ({
            id: v.id,
            name: v.name || v.variantName || v.value || "",
            variantName: v.variantName || v.name || v.value,
            value: v.value || v.name || v.variantName,
            sku: v.sku,
            price: v.discountPrice !== undefined && v.discountPrice !== null && v.discountPrice > 0 ? Number(v.discountPrice) : Number(v.price),
            discountPrice: v.discountPrice !== undefined && v.discountPrice !== null ? Number(v.discountPrice) : undefined,
            mrp: v.mrp !== undefined && v.mrp !== null ? Number(v.mrp) : (v.originalPrice !== undefined ? Number(v.originalPrice) : (v.price !== undefined ? Number(v.price) : undefined)),
            originalPrice: v.originalPrice !== undefined && v.originalPrice !== null ? Number(v.originalPrice) : (v.mrp !== undefined ? Number(v.mrp) : undefined),
            stock: v.stockQuantity !== undefined && v.stockQuantity !== null ? Number(v.stockQuantity) : (v.stock !== undefined ? Number(v.stock) : 0),
            stockQuantity: v.stockQuantity !== undefined && v.stockQuantity !== null ? Number(v.stockQuantity) : (v.stock !== undefined ? Number(v.stock) : 0),
            displayOrder: v.displayOrder,
            isActive: v.isActive !== false,
          }))
        : [];

      return {
        ...p,
        title: p.title || p.name || "Wholesale Commodity",
        price: prices.price,
        originalPrice: prices.originalPrice,
        mrp: p.mrp || prices.originalPrice,
        stock: p.stockQuantity !== undefined ? p.stockQuantity : p.stock,
        stockQuantity: p.stockQuantity !== undefined ? p.stockQuantity : p.stock,
        imageUrl: norm,
        image: norm,
        mainImageUrl: norm,
        images: (p.images || []).map((img) => ({
          ...img,
          imageUrl: normalizeImageUrl(img.imageUrl || img.image),
        })),
        variants,
      };
    });
  } catch (err) {
    console.warn("[catalog] Error fetching products:", err);
    return [];
  }
}

/**
 * Fetch single product details:
 * Tries GET /api/buyer/products/:id first (contains populated variants & stock),
 * falls back to GET /api/products/:id and /api/products/:id/variants.
 */
export async function getProductById(id: number | string): Promise<Product | null> {
  try {
    let p: any = null;
    try {
      p = await http.get<any>(`/api/buyer/products/${id}`);
    } catch {
      // Fallback
    }

    if (!p || !p.id) {
      p = await http.get<any>(`/api/products/${id}`);
    }

    if (!p) return null;

    // Fallback for variants if not present or empty
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      try {
        const vList = await http.get<any[]>(`/api/products/${id}/variants`);
        if (Array.isArray(vList) && vList.length > 0) {
          p.variants = vList;
        }
      } catch {
        // Fallback silently
      }
    }

    const prices = normalizeProductPrices(p);
    const parsedVariants: ProductVariant[] = Array.isArray(p.variants)
      ? p.variants.map((v: any) => ({
          id: v.id,
          name: v.name || v.variantName || v.value || "",
          variantName: v.variantName || v.name || v.value,
          value: v.value || v.name || v.variantName,
          sku: v.sku,
          price: v.discountPrice !== undefined && v.discountPrice !== null && v.discountPrice > 0 ? Number(v.discountPrice) : Number(v.price),
          discountPrice: v.discountPrice !== undefined && v.discountPrice !== null ? Number(v.discountPrice) : undefined,
          mrp: v.mrp !== undefined && v.mrp !== null ? Number(v.mrp) : (v.originalPrice !== undefined ? Number(v.originalPrice) : (v.price !== undefined ? Number(v.price) : undefined)),
          originalPrice: v.originalPrice !== undefined && v.originalPrice !== null ? Number(v.originalPrice) : (v.mrp !== undefined ? Number(v.mrp) : undefined),
          stock: v.stockQuantity !== undefined && v.stockQuantity !== null ? Number(v.stockQuantity) : (v.stock !== undefined ? Number(v.stock) : 0),
          stockQuantity: v.stockQuantity !== undefined && v.stockQuantity !== null ? Number(v.stockQuantity) : (v.stock !== undefined ? Number(v.stock) : 0),
          displayOrder: v.displayOrder,
          isActive: v.isActive !== false,
        }))
      : [];

    return {
      ...p,
      title: p.title || p.name || "Wholesale Commodity",
      name: p.name || p.title,
      price: prices.price,
      originalPrice: prices.originalPrice,
      mrp: p.mrp || prices.originalPrice,
      stock: p.stockQuantity !== undefined ? p.stockQuantity : p.stock,
      stockQuantity: p.stockQuantity !== undefined ? p.stockQuantity : p.stock,
      imageUrl: normalizeImageUrl(p.mainImageUrl || p.imageUrl || p.image),
      images: (p.images || p.galleryImages || []).map((img: any) => ({
        ...img,
        imageUrl: normalizeImageUrl(typeof img === "string" ? img : img.imageUrl || img.image),
      })),
      variants: parsedVariants,
    };
  } catch (err) {
    console.warn(`[catalog] Error fetching product ${id}:`, err);
    return null;
  }
}

/**
 * Fetch banners from GET /api/banners (uploaded from Admin Panel)
 */
export async function getBanners(): Promise<Banner[]> {
  try {
    const res = await http.get<any>("/api/banners");
    const raw = Array.isArray(res) ? res : res?.data || res?.banners || [];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((b) => b && b.active !== false)
      .map((b) => ({
        id: b.id,
        title: b.title || "",
        imageUrl: normalizeImageUrl(b.imageUrl || b.image),
        targetUrl: b.targetUrl,
        position: b.position,
        active: b.active,
        createdAt: b.createdAt,
      }));
  } catch (err) {
    console.warn("[catalog] Error fetching banners:", err);
    return [];
  }
}

/**
 * Fetch related products for a given commodity/product.
 * Prioritizes matching subcategoryId, falls back to categoryId,
 * excludes current product id, and falls back to general products if needed.
 */
export async function getRelatedProducts(
  product: Product,
  limit: number = 8
): Promise<Product[]> {
  try {
    if (!product || !product.id) return [];
    const all = await getProducts();
    if (!Array.isArray(all)) return [];
    const otherProducts = all.filter((p) => p && Number(p.id) !== Number(product.id));

    // 1. Commodities in the exact same subcategory
    const sameSubcategory = product.subcategoryId
      ? otherProducts.filter(
          (p) => Number(p.subcategoryId) === Number(product.subcategoryId)
        )
      : [];

    // 2. Commodities in the same parent category (not already added)
    const sameCategory = product.categoryId
      ? otherProducts.filter(
          (p) =>
            Number(p.categoryId) === Number(product.categoryId) &&
            !sameSubcategory.some((s) => Number(s.id) === Number(p.id))
        )
      : [];

    // 3. Fallback other active mandi commodities if more are needed
    const others = otherProducts.filter(
      (p) =>
        !sameSubcategory.some((s) => Number(s.id) === Number(p.id)) &&
        !sameCategory.some((c) => Number(c.id) === Number(p.id))
    );

    const related = [...sameSubcategory, ...sameCategory, ...others];
    return related.slice(0, limit);
  } catch (err) {
    console.warn("[catalog] Error fetching related products:", err);
    return [];
  }
}


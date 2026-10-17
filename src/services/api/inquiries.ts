import http from "./httpClient";

export interface CreateRFQPayload {
  productId?: number | string;
  productName?: string;
  title?: string;
  commodity?: string;
  variantId?: number | string;
  variantName?: string;
  quantity: string | number;
  unit?: string;
  targetPrice?: string | number;
  deliveryLocation?: string;
  destination?: string;
  buyerName: string;
  buyerPhone: string;
  subject?: string;
  buyerMessage?: string;
  message?: string;
  id?: string;
}

export interface SubmittedRFQ {
  id: string;
  numericId?: number | string;
  rfqCode?: string;
  commodity: string;
  quantity: string;
  unit: string;
  destination: string;
  targetPrice?: string;
  status: "Pending" | "Reviewing" | "Quoted" | "Accepted" | "Rejected";
  date: string;
  buyerName?: string;
  buyerPhone?: string;
  subject?: string;
  message?: string;
  imageUrl?: string;
  // Quotation details from admin
  hasQuotation?: boolean;
  quotedPrice?: number | string;
  totalAmount?: number | string;
  availableQuantity?: string | number;
  deliveryTime?: string;
  adminNotes?: string;
  quoteStatus?: string;
  quoteDate?: string;
}

/**
 * Fetch live inquiries directly from backend: GET /api/buyer/rfqs
 * (No local storage, strictly live server data)
 */
export async function getInquiries(): Promise<SubmittedRFQ[]> {
  try {
    const res = await http.get<any>("/api/buyer/rfqs");
    const rawList = Array.isArray(res)
      ? res
      : res?.data?.content || res?.content || res?.data || [];

    if (Array.isArray(rawList)) {
      return rawList.map((item: any) => {
        const commodityName =
          item.productName ||
          item.product?.name ||
          item.product?.title ||
          item.title ||
          "Wholesale Commodity";

        const resp = item.response || item.quotation;
        const hasQuote = Boolean(
          resp ||
          item.quotedPrice ||
          item.status === "QUOTED" ||
          item.status === "ACCEPTED"
        );

        const statusMap: Record<string, "Pending" | "Reviewing" | "Quoted" | "Accepted" | "Rejected"> = {
          ACCEPTED: "Accepted",
          QUOTED: "Quoted",
          REJECTED: "Rejected",
          PENDING: "Reviewing",
          OPEN: "Reviewing",
        };

        const quotedPriceVal =
          resp?.quotedPrice ??
          resp?.offeredPrice ??
          item.quotedPrice ??
          undefined;

        const totalAmountVal =
          resp?.totalAmount ??
          (quotedPriceVal && item.quantity && !isNaN(Number(quotedPriceVal)) && !isNaN(Number(item.quantity))
            ? Number(quotedPriceVal) * Number(item.quantity)
            : undefined);

        // Backend returns quotation and inquiry timestamps in IST; display directly without timezone conversion
        const formatDirectDate = (rawDate?: string): string | undefined => {
          if (!rawDate) return undefined;
          const str = String(rawDate).trim();
          if (str.includes("T")) {
            const [datePart, timePart] = str.split("T");
            const cleanTime = (timePart || "").split(".")[0];
            return cleanTime ? `${datePart} ${cleanTime}` : datePart;
          }
          return str;
        };

        const dateStr = formatDirectDate(item.createdAt) || "Recent";
        const quoteDateStr = formatDirectDate(resp?.createdAt);

        let derivedStatus: "Pending" | "Reviewing" | "Quoted" | "Accepted" | "Rejected" =
          statusMap[item.status] || (hasQuote ? "Quoted" : "Reviewing");

        if (item.status === "ACCEPTED" || resp?.status === "ACCEPTED") {
          derivedStatus = "Accepted";
        } else if (item.status === "REJECTED" || resp?.status === "REJECTED") {
          derivedStatus = "Rejected";
        }

        return {
          id: item.rfqCode || `RFQ-${item.id}`,
          numericId: item.id || item.rfqId,
          rfqCode: item.rfqCode,
          commodity: commodityName,
          quantity: String(item.quantity || ""),
          unit: item.unit || "",
          destination: item.deliveryLocation || "",
          targetPrice: item.price || item.targetPrice ? `₹${item.price || item.targetPrice}` : undefined,
          status: derivedStatus,
          date: dateStr,
          buyerName: item.buyerName,
          buyerPhone: item.buyerPhone,
          message: item.buyerMessage,
          imageUrl: item.product?.imageUrl || item.productImage || item.mainImageUrl,
          hasQuotation: hasQuote,
          quotedPrice: quotedPriceVal,
          totalAmount: totalAmountVal,
          availableQuantity: resp?.availableQuantity,
          deliveryTime: resp?.deliveryTime || resp?.leadTime,
          adminNotes: resp?.notes || resp?.responseMessage,
          quoteStatus: resp?.status || item.status,
          quoteDate: quoteDateStr,
        };
      });
    }
  } catch (err) {
    console.warn("[inquiries] Error fetching /api/buyer/rfqs from backend:", err);
  }

  return [];
}

/**
 * Accept admin quotation: POST /api/buyer/rfqs/{rfqId}/accept
 */
export async function acceptQuotation(
  rfqId: number | string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await http.post<any>(`/api/buyer/rfqs/${rfqId}/accept`, {});
    return {
      success: true,
      message: res?.message || "Quotation accepted successfully. Mandi desk notified.",
    };
  } catch (err: any) {
    console.warn("[inquiries] Error accepting quotation:", err);
    return {
      success: false,
      message: err?.message || "Failed to accept quotation. Please try again.",
    };
  }
}

/**
 * Reject/decline admin quotation: POST /api/buyer/rfqs/{rfqId}/reject
 */
export async function rejectQuotation(
  rfqId: number | string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await http.post<any>(`/api/buyer/rfqs/${rfqId}/reject`, {
      reason: reason || "Price negotiation needed",
    });
    return {
      success: true,
      message: res?.message || "Quotation declined.",
    };
  } catch (err: any) {
    console.warn("[inquiries] Error rejecting quotation:", err);
    return {
      success: false,
      message: err?.message || "Failed to decline quotation.",
    };
  }
}

/**
 * Submit RFQ directly to real backend endpoint: POST /api/buyer/rfqs
 * (No local storage, strictly live server submission)
 */
export async function submitRFQ(
  payload: CreateRFQPayload
): Promise<{ success: boolean; id: string; message: string }> {
  const parsedProductId = payload.productId ? Number(payload.productId) : 30;
  const commodityTitle =
    payload.commodity || payload.title || payload.productName || "Wholesale Commodity";

  const backendBody: Record<string, any> = {
    productId: !isNaN(parsedProductId) && parsedProductId > 0 ? parsedProductId : 30,
    productName: commodityTitle,
    title: commodityTitle,
    quantity: String(payload.quantity).trim(),
    deliveryLocation: (payload.deliveryLocation || payload.destination || "").trim(),
    buyerName: payload.buyerName.trim(),
    buyerPhone: payload.buyerPhone.replace(/\D/g, "").slice(-10),
    buyerMessage: (payload.message || payload.buyerMessage || payload.subject || "").trim(),
  };

  if (payload.unit) {
    backendBody.unit = payload.unit.trim();
  }
  if (payload.variantId) {
    backendBody.variantId = payload.variantId;
  }
  if (payload.variantName) {
    backendBody.variantName = payload.variantName;
  }
  if (payload.targetPrice) {
    const numPrice = String(payload.targetPrice).replace(/[^\d.]/g, "");
    if (numPrice) backendBody.targetPrice = numPrice;
  }

  const res = await http.post<any>("/api/buyer/rfqs", backendBody);
  const serverRfq = res?.data || res;
  const rfqCode = serverRfq?.rfqCode || `RFQ-${serverRfq?.id || Date.now()}`;

  return {
    success: true,
    id: rfqCode,
    message: res?.message || "RFQ submitted to KFPCL Exports successfully.",
  };
}

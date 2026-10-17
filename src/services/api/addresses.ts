import http from "./httpClient";

export interface AddressPayload {
  id?: number | string;
  customerId?: number | string;
  addressType?: string;
  type?: string;
  houseNo?: string;
  flatNumber?: string;
  streetDetails?: string;
  addressLine1?: string;
  street?: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state?: string;
  postalCode?: string;
  pincode?: string;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  label?: string;
  address?: string;
  mobile?: string;
}

/**
 * 12. Get Addresses
 * GET /api/addresses
 */
export const getAddresses = async (
  _token?: string | null,
  _customerId?: number | string
): Promise<AddressPayload[]> => {
  try {
    const list = await http.get<AddressPayload[]>("/api/addresses");
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn("[addresses.ts] Error fetching addresses:", error);
    return [];
  }
};

/**
 * 13. Create Address
 * POST /api/addresses
 */
export const addAddress = async (
  _token: string | null,
  data: AddressPayload
): Promise<AddressPayload | null> => {
  try {
    const payload = {
      addressType: data.addressType || data.type || "Warehouse",
      houseNo: data.houseNo || data.flatNumber || data.addressLine1 || "",
      streetDetails: data.streetDetails || data.street || data.addressLine2 || "",
      landmark: data.landmark || "",
      city: data.city || "",
      state: data.state || "",
      pincode: data.pincode || data.postalCode || "",
      isDefault: data.isDefault ?? false,
    };
    return await http.post<AddressPayload>("/api/addresses", payload);
  } catch (error) {
    console.error("[addresses.ts] Error creating address:", error);
    throw error;
  }
};

/**
 * 14. Update Address
 * PUT /api/addresses/{id}
 */
export const updateAddress = async (
  _token: string | null,
  id: number | string,
  data: Partial<AddressPayload>
): Promise<AddressPayload | null> => {
  try {
    const payload = {
      addressType: data.addressType || data.type,
      houseNo: data.houseNo || data.flatNumber || data.addressLine1,
      streetDetails: data.streetDetails || data.street || data.addressLine2,
      landmark: data.landmark,
      city: data.city,
      state: data.state,
      pincode: data.pincode || data.postalCode,
      isDefault: data.isDefault,
    };
    return await http.put<AddressPayload>(`/api/addresses/${id}`, payload);
  } catch (error) {
    console.error(`[addresses.ts] Error updating address ${id}:`, error);
    throw error;
  }
};

/**
 * 15. Delete Address
 * DELETE /api/addresses/{id}
 */
export const deleteAddress = async (
  _token: string | null,
  id: number | string
): Promise<boolean> => {
  try {
    await http.delete(`/api/addresses/${id}`);
    return true;
  } catch (error) {
    console.error(`[addresses.ts] Error deleting address ${id}:`, error);
    return false;
  }
};

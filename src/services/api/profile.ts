import http from "./httpClient";

export interface UserProfile {
  id?: number | string;
  phoneNumber?: string;
  phone?: string;
  mobile?: string;
  fullName?: string;
  name?: string;
  email?: string;
  companyName?: string;
  businessType?: string;
  state?: string;
  city?: string;
  address?: string;
  gstNumber?: string;
  panNumber?: string;
  tradeLicense?: string;
  pincode?: string;
  district?: string;
  mandiLicenseNumber?: string;
  isVerified?: boolean;
  isActive?: boolean;
  [key: string]: any;
}

/**
 * 9. Get Customer Profile
 * GET /api/customer/profile
 */
export const getProfile = async (token?: string | null): Promise<UserProfile | null> => {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const profile = await http.get<UserProfile>("/api/customer/profile", { headers });
    if (!profile) return null;
    return {
      ...profile,
      name: profile.fullName || profile.name || "",
      fullName: profile.fullName || profile.name || "",
      phone: profile.phoneNumber || profile.phone || profile.mobile || "",
      phoneNumber: profile.phoneNumber || profile.phone || profile.mobile || "",
    };
  } catch (error) {
    console.warn("[profile.ts] Error fetching customer profile:", error);
    return null;
  }
};

/**
 * 10. Update Customer Profile
 * PUT /api/customer/profile
 */
export const updateProfile = async (
  token: string | null,
  data: Partial<UserProfile>
): Promise<UserProfile | null> => {
  try {
    const payload = {
      fullName: data.fullName || data.name,
      email: data.email,
      companyName: data.companyName,
      businessType: data.businessType,
      state: data.state,
      city: data.city,
    };
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const updated = await http.put<UserProfile>("/api/customer/profile", payload, { headers });
    if (!updated) return null;
    return {
      ...updated,
      name: updated.fullName || updated.name || payload.fullName || "",
      fullName: updated.fullName || updated.name || payload.fullName || "",
      phone: updated.phoneNumber || updated.phone || updated.mobile || "",
      phoneNumber: updated.phoneNumber || updated.phone || updated.mobile || "",
      companyName: updated.companyName || payload.companyName || "",
      businessType: updated.businessType || payload.businessType || "",
      state: updated.state || payload.state || "",
      city: updated.city || payload.city || "",
    };
  } catch (error) {
    console.error("[profile.ts] Error updating customer profile:", error);
    throw error;
  }
};

/**
 * 11. Soft-Delete Customer Profile
 * DELETE /api/customer/profile?refreshToken={refreshToken}
 */
export const deleteProfile = async (
  refreshToken?: string
): Promise<{ success: boolean; message: string }> => {
  const query = refreshToken ? `?refreshToken=${encodeURIComponent(refreshToken)}` : "";
  return http.delete<{ success: boolean; message: string }>(`/api/customer/profile${query}`);
};


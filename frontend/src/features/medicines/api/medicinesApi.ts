import apiClient from "@/shared/lib/apiClient";

// ── Shared ────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export const MEDICINE_FORMS = [
  "tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler", "other",
] as const;
export type MedicineForm = (typeof MEDICINE_FORMS)[number];

// ── Generic medicine types ────────────────────────────────────────────────────

export interface GenericMedicine {
  id: string;
  generic_name: string;
  drug_class: string;
  contraindications: string[];
  brand_count: number;
}

export interface CreateGenericPayload {
  generic_name: string;
  drug_class: string;
  contraindications?: string[];
}

export interface UpdateGenericPayload {
  generic_name?: string;
  drug_class?: string;
  contraindications?: string[];
}

// ── Brand medicine types ──────────────────────────────────────────────────────

export interface BrandMedicine {
  id: string;
  generic_id: string;
  brand_name: string;
  manufacturer: string;
  strength: string;
  form: string;
  is_active: boolean;
}

export interface CreateBrandPayload {
  generic_id: string;
  brand_name: string;
  manufacturer: string;
  strength: string;
  form: string;
  is_active?: boolean;
}

export interface UpdateBrandPayload {
  brand_name?: string;
  manufacturer?: string;
  strength?: string;
  form?: string;
  is_active?: boolean;
}

// ── Manufacturer types ────────────────────────────────────────────────────────

export interface Manufacturer {
  id: string;
  name: string;
  country: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateManufacturerPayload {
  name: string;
  country?: string;
}

export interface UpdateManufacturerPayload {
  name?: string;
  country?: string;
  is_active?: boolean;
}

// ── Search result (used in prescription autocomplete) ─────────────────────────

export interface MedicineSearchResult {
  id: string;
  brand_name: string;
  strength: string;
  form: string;
  manufacturer: string;
  generic_id: string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const medicinesApi = {

  /** GET /medicines/search/?q= — typeahead for prescription forms */
  search: (q: string, limit = 10) =>
    apiClient
      .get<{ results: MedicineSearchResult[] }>("/medicines/search/", { params: { q, limit } })
      .then((r) => r.data.results),

  // ── Generics ────────────────────────────────────────────────────────────────

  listGenerics: (params: { search?: string; drug_class?: string; limit?: number; offset?: number } = {}) =>
    apiClient
      .get<PaginatedResponse<GenericMedicine>>("/medicines/generics/", { params })
      .then((r) => r.data),

  getGeneric: (id: string) =>
    apiClient
      .get<GenericMedicine>(`/medicines/generics/${id}/`)
      .then((r) => r.data),

  createGeneric: (payload: CreateGenericPayload) =>
    apiClient
      .post<GenericMedicine>("/medicines/generics/", payload)
      .then((r) => r.data),

  updateGeneric: (id: string, payload: UpdateGenericPayload) =>
    apiClient
      .patch<GenericMedicine>(`/medicines/generics/${id}/`, payload)
      .then((r) => r.data),

  deleteGeneric: (id: string) =>
    apiClient.delete(`/medicines/generics/${id}/`),

  // ── Brands ──────────────────────────────────────────────────────────────────

  listBrands: (params: {
    search?: string;
    generic_id?: string;
    form?: string;
    active_only?: boolean;
    limit?: number;
    offset?: number;
  } = {}) =>
    apiClient
      .get<PaginatedResponse<BrandMedicine>>("/medicines/brands/", { params })
      .then((r) => r.data),

  getBrand: (id: string) =>
    apiClient
      .get<BrandMedicine>(`/medicines/brands/${id}/`)
      .then((r) => r.data),

  createBrand: (payload: CreateBrandPayload) =>
    apiClient
      .post<BrandMedicine>("/medicines/brands/", payload)
      .then((r) => r.data),

  updateBrand: (id: string, payload: UpdateBrandPayload) =>
    apiClient
      .patch<BrandMedicine>(`/medicines/brands/${id}/`, payload)
      .then((r) => r.data),

  /** Soft-delete: sets is_active = false */
  deactivateBrand: (id: string) =>
    apiClient
      .delete<BrandMedicine>(`/medicines/brands/${id}/`)
      .then((r) => r.data),

  // ── Manufacturers ────────────────────────────────────────────────────────────

  listManufacturers: (params: { search?: string; active_only?: boolean; limit?: number } = {}) =>
    apiClient
      .get<PaginatedResponse<Manufacturer>>("/medicines/manufacturers/", { params })
      .then((r) => r.data),

  createManufacturer: (payload: CreateManufacturerPayload) =>
    apiClient
      .post<Manufacturer>("/medicines/manufacturers/", payload)
      .then((r) => r.data),

  updateManufacturer: (id: string, payload: UpdateManufacturerPayload) =>
    apiClient
      .patch<Manufacturer>(`/medicines/manufacturers/${id}/`, payload)
      .then((r) => r.data),

  /** Soft-delete: sets is_active = false */
  deactivateManufacturer: (id: string) =>
    apiClient
      .delete<Manufacturer>(`/medicines/manufacturers/${id}/`)
      .then((r) => r.data),
};

import apiClient from "@/shared/lib/apiClient";

export interface MedicineSearchResult {
  id: string;
  brand_name: string;
  strength: string;
  form: string;
  manufacturer: string;
  generic_id: string;
}

export const medicinesApi = {
  search: (q: string, limit = 10) =>
    apiClient
      .get<{ results: MedicineSearchResult[] }>("/medicines/search/", {
        params: { q, limit },
      })
      .then((r) => r.data.results),
};

/**
 * Waybill durumlarının tek kaynağı. StatusFilter, EditWaybillModal ve
 * ileride ihtiyaç duyulacak her yer buradan import etmeli -- iki ayrı
 * yerde tanımlanıp zamanla tutarsızlaşmasını önler.
 */
export const STATUS_OPTIONS = [
  { value: "PENDING", label: "Beklemede", color: "#f0ad4e" },
  { value: "IN_TRANSIT", label: "Yolda", color: "#3498db" },
  { value: "DELIVERED", label: "Teslim Edildi", color: "#2ecc71" },
  { value: "CANCELLED", label: "İptal Edildi", color: "#e74c3c" },
];
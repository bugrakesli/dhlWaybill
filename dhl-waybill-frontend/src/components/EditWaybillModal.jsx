import { useState, useEffect } from "react";
import apiClient from "../api/axiosConfig";
import { STATUS_OPTIONS } from "../constants/statusOptions";

/**
 * Tekil bir Waybill kaydını düzenlemek için modal.
 * waybill=null ise modal kapalı kabul edilir (App.jsx bu şekilde kontrol ediyor).
 */
function EditWaybillModal({ waybill, onClose, onSaved }) {
  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // waybill prop'u her değiştiğinde (yeni bir kayıt düzenlenmeye başlandığında) formu doldur
  useEffect(() => {
    if (waybill) {
      setFormData({
        waybill_number: waybill.waybill_number,
        shipment_date: waybill.shipment_date,
        status: waybill.status,
        sender: waybill.sender,
        receiver: waybill.receiver,
        // weight null olabilir (VERİ YOK) -- input'ta boş string olarak göster
        weight: waybill.weight !== null ? waybill.weight : "",
      });
      setError(null);
    }
  }, [waybill]);

  if (!waybill || !formData) {
    return null;
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Boş string olarak bırakılan weight -> backend'e null olarak gönderilsin
      const payload = {
        ...formData,
        weight: formData.weight === "" ? null : parseFloat(formData.weight),
      };

      await apiClient.patch(`waybills/${waybill.id}/`, payload);

      onSaved(); // App.jsx tabloyu yenileyecek
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        (err.response?.data ? JSON.stringify(err.response.data) : "Güncelleme sırasında bir hata oluştu.");
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation: modal içine tıklayınca overlay'e tıklanmış gibi kapanmasın */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Konşimento Düzenle: {waybill.waybill_number}</h3>

        <div className="modal-form">
          <label>
            Konşimento No (10 haneli)
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{10}"
              maxLength={10}
              value={formData.waybill_number}
              onChange={(e) => {
                // Sadece rakam karakterlerine izin ver, 10 haneyi aşamaz
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                handleChange("waybill_number", digitsOnly);
              }}
            />
          </label>

          <label>
            Sevkiyat Tarihi
            <input
              type="date"
              lang="tr"
              value={formData.shipment_date}
              onChange={(e) => handleChange("shipment_date", e.target.value)}
            />
          </label>

          <label>
            Durum
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Gönderici
            <input
              type="text"
              value={formData.sender}
              onChange={(e) => handleChange("sender", e.target.value)}
            />
          </label>

          <label>
            Alıcı
            <input
              type="text"
              value={formData.receiver}
              onChange={(e) => handleChange("receiver", e.target.value)}
            />
          </label>

          <label>
            Ağırlık (kg) — boş bırakılırsa "VERİ YOK" olur
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.weight}
              onChange={(e) => handleChange("weight", e.target.value)}
            />
          </label>
        </div>

        {error && <p className="status-error">{error}</p>}

        <div className="modal-actions">
          <button onClick={onClose} disabled={isSaving} className="modal-cancel-button">
            İptal
          </button>
          <button onClick={handleSave} disabled={isSaving} className="modal-save-button">
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditWaybillModal;
import { useState, useEffect } from "react";
import apiClient from "../api/axiosConfig";

/**
 * Tekil bir Waybill kaydını düzenlemek için modal.
 */
function EditWaybillModal({ waybill, onClose, onSaved }) {
  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [rateInfo, setRateInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (waybill) {
      setFormData({
        waybill_number: waybill.waybill_number || "",
        shipment_date:
          waybill.shipment_date && waybill.shipment_date !== "1900-01-01"
            ? waybill.shipment_date
            : "",
        sender: waybill.sender || "",
        destination: waybill.destination || "",
        piece_count:
          waybill.piece_count !== null && waybill.piece_count !== undefined
            ? waybill.piece_count
            : "",
        weight:
          waybill.weight !== null && waybill.weight !== undefined
            ? waybill.weight
            : "",
        collected_by: waybill.collected_by || "",
        delivered: Boolean(waybill.delivered),
        receiver: waybill.receiver || "",
        euro_amount:
          waybill.euro_amount !== null && waybill.euro_amount !== undefined
            ? waybill.euro_amount
            : "",
        exchange_rate:
          waybill.exchange_rate !== null && waybill.exchange_rate !== undefined
            ? waybill.exchange_rate
            : "",
      });
      setRateInfo(null);
      setError(null);
    }
  }, [waybill]);

  if (!waybill || !formData) {
    return null;
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFetchRate = async () => {
    if (!formData.shipment_date) {
      setError("Döviz kurunu otomatik çekmek için lütfen önce geçerli bir tarih seçin.");
      return;
    }

    setIsFetchingRate(true);
    setError(null);

    try {
      const response = await apiClient.get("waybills/exchange-rate/", {
        params: {
          date: formData.shipment_date,
          currency: "EUR",
        },
      });

      const data = response.data;
      if (data && data.rate) {
        setFormData((prev) => ({
          ...prev,
          exchange_rate: data.rate,
        }));
        setRateInfo({
          source: data.source,
          actualDate: data.actual_date,
        });
      }
    } catch (err) {
      const detail = err.response?.data?.detail || "Döviz kuru servisine ulaşılamadı.";
      setError(detail);
    } finally {
      setIsFetchingRate(false);
    }
  };

  const calculatedPayment = (() => {
    const euro = parseFloat(formData.euro_amount);
    const rate = parseFloat(formData.exchange_rate);
    if (!isNaN(euro) && !isNaN(rate) && euro >= 0 && rate >= 0) {
      return (
        (euro * rate).toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " ₺"
      );
    }
    return "-";
  })();

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        waybill_number: formData.waybill_number.trim(),
        shipment_date: formData.shipment_date || "1900-01-01",
        sender: formData.sender.trim() || "-",
        destination: formData.destination.trim() || "-",
        piece_count: formData.piece_count === "" ? null : parseInt(formData.piece_count, 10),
        weight: formData.weight === "" ? null : parseFloat(formData.weight),
        collected_by: formData.collected_by.trim() || "-",
        delivered: Boolean(formData.delivered),
        receiver: formData.receiver.trim() || "-",
        euro_amount: formData.euro_amount === "" ? null : parseFloat(formData.euro_amount),
        exchange_rate: formData.exchange_rate === "" ? null : parseFloat(formData.exchange_rate),
      };

      await apiClient.patch(`waybills/${waybill.id}/`, payload);

      onSaved();
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        (err.response?.data
          ? JSON.stringify(err.response.data)
          : "Güncelleme sırasında bir hata oluştu.");
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <h3>Konşimento Düzenle: {waybill.waybill_number}</h3>

        <div className="modal-form modal-grid">
          <label>
            AWB / Konşimento No
            <input
              type="text"
              value={formData.waybill_number}
              onChange={(e) => handleChange("waybill_number", e.target.value)}
              required
            />
          </label>

          <label>
            Tarih
            <input
              type="date"
              lang="tr"
              value={formData.shipment_date}
              onChange={(e) => {
                handleChange("shipment_date", e.target.value);
                setRateInfo(null);
              }}
            />
          </label>

          <label>
            Gönderici Firma/Şahıs
            <input
              type="text"
              value={formData.sender}
              onChange={(e) => handleChange("sender", e.target.value)}
            />
          </label>

          <label>
            Alıcı Firma/Şahıs
            <input
              type="text"
              value={formData.receiver}
              onChange={(e) => handleChange("receiver", e.target.value)}
            />
          </label>

          <label>
            Ülke - Varış Noktası
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => handleChange("destination", e.target.value)}
            />
          </label>

          <label>
            Parça Sayısı
            <input
              type="number"
              min="0"
              value={formData.piece_count}
              onChange={(e) => handleChange("piece_count", e.target.value)}
            />
          </label>

          <label>
            Ağırlık (kg)
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.weight}
              onChange={(e) => handleChange("weight", e.target.value)}
            />
          </label>

          <label>
            Toplayan (Kurye)
            <input
              type="text"
              value={formData.collected_by}
              onChange={(e) => handleChange("collected_by", e.target.value)}
            />
          </label>

          <label className="checkbox-label">
            <span style={{ marginBottom: "0.4rem", display: "block" }}>Teslim Edildi</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={formData.delivered}
                onChange={(e) => handleChange("delivered", e.target.checked)}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
              <span>{formData.delivered ? "Evet (Teslim Edildi)" : "Hayır (Teslim Edilmedi)"}</span>
            </div>
          </label>

          <label>
            Euro Tutarı (€)
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.euro_amount}
              onChange={(e) => handleChange("euro_amount", e.target.value)}
            />
          </label>

          <div className="rate-field-group">
            <label>
              <div className="rate-label-header">
                <span>Döviz Kuru</span>
                <button
                  type="button"
                  className="fetch-rate-btn"
                  onClick={handleFetchRate}
                  disabled={isFetchingRate || !formData.shipment_date}
                  title="Seçili tarihin TCMB resmi kurunu otomatik getir"
                >
                  {isFetchingRate ? "Çekiliyor..." : "⚡ Kuru Getir"}
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={formData.exchange_rate}
                onChange={(e) => {
                  handleChange("exchange_rate", e.target.value);
                  setRateInfo(null);
                }}
              />
            </label>
            {rateInfo && (
              <span className="rate-source-badge">
                ✓ {rateInfo.source} Bülteni ({rateInfo.actualDate})
              </span>
            )}
          </div>

          <div className="computed-preview-box">
            <span>Hesaplanan Tutar (TL):</span>
            <strong>{calculatedPayment}</strong>
          </div>
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
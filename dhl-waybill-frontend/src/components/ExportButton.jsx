import { useState } from "react";
import apiClient from "../api/axiosConfig";

/**
 * Aktif filtrelere göre TÜM sonuçları (sayfalama olmadan) Excel dosyası
 * olarak indirir.
 */
function ExportButton({ activeFilters }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await apiClient.get("waybills/export/", {
        params: {
          start_date: activeFilters.startDate,
          end_date: activeFilters.endDate,
          delivered:
            activeFilters.delivered && activeFilters.delivered !== "all"
              ? activeFilters.delivered
              : undefined,
          incomplete: activeFilters.incomplete ? "true" : undefined,
        },
        responseType: "blob",
      });

      const contentDisposition = response.headers["content-disposition"];
      let filename = "konsimentolar.xlsx";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      setExportError("Dışa aktarma sırasında bir hata oluştu.");
      console.error("Export hatası:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-container">
      <button onClick={handleExport} disabled={isExporting} className="export-button">
        {isExporting ? "Hazırlanıyor..." : "📊 Excel'e Aktar"}
      </button>

      {exportError && <p className="status-error">{exportError}</p>}
    </div>
  );
}

export default ExportButton;
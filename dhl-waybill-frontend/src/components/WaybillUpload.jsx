import { useState } from "react";
import apiClient from "../api/axiosConfig";

/**
 * Excel dosyası yükleme componenti.
 * Yükleme başarılı olduğunda parent'a haber verir (onUploadSuccess),
 * böylece tablo otomatik yenilenebilir.
 */
function WaybillUpload({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    // Dosya seçildiğinde önceki sonuç/hata mesajlarını temizle
    setUploadResult(null);
    setUploadError(null);

    // 1) input:
    accept=".xlsx,.xls,.csv"

    // 2) validasyon:
    const allowedExtensions = /\.(xlsx|xls|csv)$/i;
    if (file && !allowedExtensions.test(file.name)) {
      setUploadError("Yalnızca .xlsx, .xls veya .csv dosyaları kabul edilir.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Lütfen önce bir dosya seçin.");
      return;
    }

    // FormData: dosya yüklemede kullanılan standart tarayıcı API'si
    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const response = await apiClient.post("waybills/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadResult(response.data);
      setSelectedFile(null);

      // Parent component'e (App.jsx) haber ver, tablo yenilensin
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      // Backend'den dönen hata mesajını göstermeye çalış, yoksa genel mesaj
      const message =
        error.response?.data?.detail || "Yükleme sırasında bir hata oluştu.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h3>Excel Dosyası Yükle</h3>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <button onClick={handleUpload} disabled={isUploading || !selectedFile}>
        {isUploading ? "Yükleniyor..." : "Yükle"}
      </button>

      {/* Loading göstergesi */}
      {isUploading && <p className="status-loading">Dosya işleniyor, lütfen bekleyin...</p>}

      {/* Hata mesajı */}
      {uploadError && <p className="status-error">{uploadError}</p>}

      {/* Başarı mesajı + özet */}
      {uploadResult && (
        <div className="status-success">
          <p>{uploadResult.detail}</p>
          <p>
            Eklenen: {uploadResult.created} | Güncellenen: {uploadResult.updated}
            {uploadResult.error_count > 0 && ` | Hatalı satır: ${uploadResult.error_count}`}
          </p>
        </div>
      )}
    </div>
  );
}

export default WaybillUpload;
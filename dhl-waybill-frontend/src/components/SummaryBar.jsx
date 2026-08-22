/**
 * Filtrelenmiş sonuç kümesinin özetini gösterir: toplam kayıt sayısı ve toplam ağırlık.
 * Yenileme sırasında (sıralama/sayfa değişimi) component'i kaybetmek yerine,
 * mevcut veriyi ekranda tutup hafifçe soluklaştırıyoruz.
 */
function SummaryBar({ summary, isLoading }) {
  // Henüz hiç veri gelmediyse (ilk yükleme) hiçbir şey gösterme
  if (!summary) {
    return null;
  }

  const formattedWeight = summary.total_weight.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={`summary-bar ${isLoading ? "summary-refreshing" : ""}`}>
      <div className="summary-item">
        <span className="summary-value">{summary.total_count}</span>
        <span className="summary-label">Konşimento</span>
      </div>

      <div className="summary-divider" />

      <div className="summary-item">
        <span className="summary-value">{formattedWeight} kg</span>
        <span className="summary-label">Toplam Ağırlık</span>
      </div>
    </div>
  );
}

export default SummaryBar;
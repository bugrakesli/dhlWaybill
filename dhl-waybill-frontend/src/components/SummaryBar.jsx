/**
 * Filtrelenmiş sonuç kümesinin özetini gösterir:
 * toplam kayıt sayısı, toplam parça, toplam euro ve teslim edilen sayısı.
 */
function SummaryBar({ summary, isLoading }) {
  if (!summary) {
    return null;
  }

  const formattedEuro = (summary.total_euro ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedPieces = (summary.total_pieces ?? 0).toLocaleString("tr-TR");

  return (
    <div className={`summary-bar ${isLoading ? "summary-refreshing" : ""}`}>
      <div className="summary-item">
        <span className="summary-value">{summary.total_count}</span>
        <span className="summary-label">Toplam Konşimento</span>
      </div>

      <div className="summary-divider" />

      <div className="summary-item">
        <span className="summary-value">{formattedPieces}</span>
        <span className="summary-label">Toplam Parça</span>
      </div>

      <div className="summary-divider" />

      <div className="summary-item">
        <span className="summary-value">{formattedEuro} €</span>
        <span className="summary-label">Toplam Euro</span>
      </div>

      <div className="summary-divider" />

      <div className="summary-item">
        <span className="summary-value">
          {summary.delivered_count} <small style={{ fontSize: "0.9rem", color: "#888" }}>/ {summary.total_count}</small>
        </span>
        <span className="summary-label">Teslim Edildi</span>
      </div>
    </div>
  );
}

export default SummaryBar;
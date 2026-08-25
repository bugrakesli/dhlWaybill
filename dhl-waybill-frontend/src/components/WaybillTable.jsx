const COLUMNS = [
  { field: "shipment_date", label: "Tarih" },
  { field: "waybill_number", label: "AWB" },
  { field: "sender", label: "Gönderici" },
  { field: "destination", label: "Ülke / Varış" },
  { field: "piece_count", label: "Parça" },
  { field: "collected_by", label: "Toplayan" },
  { field: "delivered", label: "Teslim" },
  { field: "receiver", label: "Alıcı" },
  { field: "euro_amount", label: "Euro (€)" },
  { field: "exchange_rate", label: "Kur" },
  { field: "payment_amount", label: "Tutar (TL)" },
];

function formatDate(dateStr) {
  if (!dateStr || dateStr === "1900-01-01") return "VERİ YOK";
  try {
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount, symbol = "") {
  if (amount === null || amount === undefined) return "-";
  const num = parseFloat(amount);
  if (isNaN(num)) return "-";
  return `${num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${symbol ? ` ${symbol}` : ""}`;
}

function formatRate(rate) {
  if (rate === null || rate === undefined) return "-";
  const num = parseFloat(rate);
  if (isNaN(num)) return "-";
  return num.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function WaybillTable({
  waybills,
  isLoading,
  pagination,
  onPageChange,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
}) {
  const isInitialLoad = isLoading && (!waybills || waybills.length === 0);

  if (isInitialLoad) {
    return <p className="status-loading">Yükleniyor...</p>;
  }

  if (!isLoading && (!waybills || waybills.length === 0)) {
    return <p>Bu kriterlere uygun kayıt bulunamadı.</p>;
  }

  return (
    <div className={`table-container ${isLoading ? "table-refreshing" : ""}`}>
      <table>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const isActiveSort = sortField === column.field;
              return (
                <th
                  key={column.field}
                  onClick={() => onSort(column.field)}
                  className="sortable-header"
                >
                  {column.label}
                  {isActiveSort && (
                    <span className="sort-arrow">
                      {sortDirection === "asc" ? " ▲" : " ▼"}
                    </span>
                  )}
                </th>
              );
            })}
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {waybills.map((waybill) => (
            <tr key={waybill.id}>
              <td>{formatDate(waybill.shipment_date)}</td>
              <td><strong>{waybill.waybill_number}</strong></td>
              <td>{waybill.sender}</td>
              <td>{waybill.destination}</td>
              <td>{waybill.piece_count ?? "-"}</td>
              <td>{waybill.collected_by}</td>
              <td>
                <span className={`delivery-badge ${waybill.delivered ? "delivery-badge-yes" : "delivery-badge-no"}`}>
                  {waybill.delivered ? "Evet" : "Hayır"}
                </span>
              </td>
              <td>{waybill.receiver}</td>
              <td>{formatCurrency(waybill.euro_amount, "€")}</td>
              <td>{formatRate(waybill.exchange_rate)}</td>
              <td><strong>{formatCurrency(waybill.payment_amount, "₺")}</strong></td>
              <td className="actions-cell">
                <div className="actions-wrapper">
                  <button
                    className="action-button action-edit"
                    onClick={() => onEdit(waybill)}
                    title="Düzenle"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-button action-delete"
                    onClick={() => onDelete(waybill)}
                    title="Sil"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination-controls">
        <button
          onClick={() => onPageChange(pagination.currentPage - 1)}
          disabled={!pagination.previous}
        >
          ← Önceki
        </button>
        <span>
          Sayfa {pagination.currentPage} — Toplam {pagination.count} kayıt
        </span>
        <button
          onClick={() => onPageChange(pagination.currentPage + 1)}
          disabled={!pagination.next}
        >
          Sonraki →
        </button>
      </div>
    </div>
  );
}

export default WaybillTable;
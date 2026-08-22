const COLUMNS = [
  { field: "waybill_number", label: "Konşimento No" },
  { field: "shipment_date", label: "Sevkiyat Tarihi" },
  { field: "status", label: "Durum" },
  { field: "sender", label: "Gönderici" },
  { field: "receiver", label: "Alıcı" },
  { field: "weight", label: "Ağırlık (kg)" },
];

function WaybillTable({
  waybills,
  isLoading,
  pagination,
  onPageChange,
  sortField,
  sortDirection,
  onSort,
  onEdit,      // YENİ
  onDelete,    // YENİ
}) {
  const isInitialLoad = isLoading && (!waybills || waybills.length === 0);

  if (isInitialLoad) {
    return <p className="status-loading">Yükleniyor...</p>;
  }

  if (!isLoading && (!waybills || waybills.length === 0)) {
    return <p>Bu tarih aralığında kayıt bulunamadı.</p>;
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
              <td>{waybill.waybill_number}</td>
              <td>{waybill.shipment_date}</td>
              <td>{waybill.status}</td>
              <td>{waybill.sender}</td>
              <td>{waybill.receiver}</td>
              <td>{waybill.weight !== null ? waybill.weight : "VERİ YOK"}</td>
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
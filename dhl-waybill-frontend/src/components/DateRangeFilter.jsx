/**
 * Kullanıcının başlangıç/bitiş tarihini değiştirebileceği basit filtre componenti.
 * Controlled input'lar kullanıyoruz, state parent'ta (App.jsx) tutuluyor.
 */
function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onClear,
}) {
  return (
    <div className="date-filter-container">
      <label>
        Başlangıç Tarihi:
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </label>

      <label>
        Bitiş Tarihi:
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </label>

      <button type="button" onClick={onApply}>
        Filtrele
      </button>
      {(startDate || endDate) && onClear && (
        <button type="button" className="date-filter-clear" onClick={onClear}>
          Temizle (Tümü)
        </button>
      )}
    </div>
  );
}

export default DateRangeFilter;
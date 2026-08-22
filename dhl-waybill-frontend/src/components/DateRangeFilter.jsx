/**
 * Kullanıcının başlangıç/bitiş tarihini değiştirebileceği basit filtre componenti.
 * Controlled input'lar kullanıyoruz, state parent'ta (App.jsx) tutuluyor.
 */
function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange, onApply }) {
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

      <button onClick={onApply}>Filtrele</button>
    </div>
  );
}

export default DateRangeFilter;
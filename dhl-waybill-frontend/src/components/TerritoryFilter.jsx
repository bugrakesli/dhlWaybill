function TerritoryFilter({ territories = [], selectedTerritory = "", onSelectTerritory }) {
  return (
    <div className="territory-filter-container">
      <label htmlFor="territory-select" className="territory-filter-label">
        <span className="territory-icon">📍</span>
        <span>Sales Territory (BAST):</span>
      </label>
      <div className="territory-select-wrapper">
        <select
          id="territory-select"
          className={`territory-select ${selectedTerritory ? "territory-select-active" : ""}`}
          value={selectedTerritory}
          onChange={(e) => onSelectTerritory(e.target.value)}
        >
          <option value="">Filtre Uygulanmadı (Tümü)</option>
          {territories.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value="none">BAST Olmayanlar (Tanımsız)</option>
        </select>
        {selectedTerritory && selectedTerritory !== "" && (
          <button
            type="button"
            className="territory-clear-btn"
            title="Filtreyi Temizle"
            onClick={() => onSelectTerritory("")}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default TerritoryFilter;

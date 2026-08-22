import { STATUS_OPTIONS } from "../constants/statusOptions";

function StatusFilter({ selectedStatuses, onToggleStatus }) {
  return (
    <div className="status-filter-container">
      <span className="status-filter-label">Durum:</span>

      <div className="status-chip-group">
        {STATUS_OPTIONS.map((option) => {
          const isActive = selectedStatuses.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              className={`status-chip ${isActive ? "status-chip-active" : ""}`}
              style={{
                "--chip-color": option.color,
              }}
              onClick={() => onToggleStatus(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StatusFilter;
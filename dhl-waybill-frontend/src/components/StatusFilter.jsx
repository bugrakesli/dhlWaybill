import { DELIVERY_OPTIONS } from "../constants/statusOptions";

function StatusFilter({ selectedDelivered, onSelectDelivered }) {
  return (
    <div className="status-filter-container">
      <span className="status-filter-label">Teslim Durumu:</span>

      <div className="status-chip-group">
        {DELIVERY_OPTIONS.map((option) => {
          const isActive = selectedDelivered === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={`status-chip ${isActive ? "status-chip-active" : ""}`}
              style={{
                "--chip-color": option.color,
              }}
              onClick={() => onSelectDelivered(option.value)}
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
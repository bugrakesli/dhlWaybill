/**
 * Silme işlemi için onay penceresi. Tekil ve toplu silme için ortak
 * kullanılır -- isOpen=false ise kapalı kabul edilir.
 */
function DeleteConfirmDialog({ isOpen, title, message, onCancel, onConfirm, isDeleting }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="modal-actions">
          <button onClick={onCancel} disabled={isDeleting} className="modal-cancel-button">
            Vazgeç
          </button>
          <button onClick={onConfirm} disabled={isDeleting} className="modal-delete-button">
            {isDeleting ? "Siliniyor..." : "Evet, Sil"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmDialog;

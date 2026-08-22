/**
 * Silme işlemi için onay penceresi. waybill=null ise kapalı kabul edilir.
 */
function DeleteConfirmDialog({ waybill, onCancel, onConfirm, isDeleting }) {
  if (!waybill) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
        <h3>Kaydı Sil</h3>
        <p>
          <strong>{waybill.waybill_number}</strong> numaralı konşimentoyu silmek
          istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>

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
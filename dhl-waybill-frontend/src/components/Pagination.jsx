import { useState } from "react";
import "./Pagination.css";

function Pagination({
  currentPage = 1,
  totalCount = 0,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}) {
  const [jumpPage, setJumpPage] = useState("");
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (totalCount === 0) return null;

  const fromRecord = (currentPage - 1) * pageSize + 1;
  const toRecord = Math.min(currentPage * pageSize, totalCount);

  // Akıllı sayfa numaralandırma ve ellipsis (Windowing)
  const getPageNumbers = () => {
    const delta = 1; // Aktif sayfanın sağı ve solu
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return totalPages === 1 ? [1] : rangeWithDots;
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpPage("");
    }
  };

  return (
    <div className={`enterprise-pagination ${isLoading ? "pagination-loading" : ""}`}>
      {/* Sol: Kayıt Aralığı Bilgisi */}
      <div className="pagination-info">
        <span>Toplam <strong>{totalCount.toLocaleString("tr-TR")}</strong> kayıttan </span>
        <span className="record-range">
          <strong>{fromRecord}</strong> – <strong>{toRecord}</strong>
        </span>
        <span> arası gösteriliyor</span>
      </div>

      {/* Orta: Sayfa Boyutu ve Sayfa Numaraları */}
      <div className="pagination-actions">
        {onPageSizeChange && (
          <div className="page-size-selector">
            <label htmlFor="pageSizeSelect">Sayfa Başına:</label>
            <select
              id="pageSizeSelect"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="page-nav" aria-label="Tablo Sayfalama">
          {/* İlk Sayfa */}
          <button
            type="button"
            className="page-btn nav-arrow"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || isLoading}
            title="İlk Sayfa"
            aria-label="İlk Sayfaya Git"
          >
            «
          </button>

          {/* Önceki Sayfa */}
          <button
            type="button"
            className="page-btn nav-arrow"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            title="Önceki Sayfa"
            aria-label="Önceki Sayfaya Git"
          >
            ‹
          </button>

          {/* Sayfa Numaraları */}
          <div className="page-numbers">
            {getPageNumbers().map((item, idx) =>
              item === "..." ? (
                <span key={`dots-${idx}`} className="page-dots">
                  •••
                </span>
              ) : (
                <button
                  key={`page-${item}`}
                  type="button"
                  className={`page-btn page-num ${currentPage === item ? "active" : ""}`}
                  onClick={() => onPageChange(item)}
                  disabled={isLoading}
                  aria-current={currentPage === item ? "page" : undefined}
                >
                  {item}
                </button>
              )
            )}
          </div>

          {/* Sonraki Sayfa */}
          <button
            type="button"
            className="page-btn nav-arrow"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            title="Sonraki Sayfa"
            aria-label="Sonraki Sayfaya Git"
          >
            ›
          </button>

          {/* Son Sayfa */}
          <button
            type="button"
            className="page-btn nav-arrow"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || isLoading}
            title="Son Sayfa"
            aria-label="Son Sayfaya Git"
          >
            »
          </button>
        </nav>
      </div>

      {/* Sağ: Sayfaya Git (Jump to Page) */}
      {totalPages > 3 && (
        <form className="page-jump-form" onSubmit={handleJumpSubmit}>
          <label htmlFor="jumpInput">Sayfa:</label>
          <input
            id="jumpInput"
            type="number"
            min="1"
            max={totalPages}
            placeholder={currentPage.toString()}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="jump-btn" disabled={!jumpPage || isLoading}>
            Git
          </button>
        </form>
      )}
    </div>
  );
}

export default Pagination;

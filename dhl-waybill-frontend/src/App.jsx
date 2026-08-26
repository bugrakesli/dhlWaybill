import { useState, useEffect, useCallback } from "react";
import apiClient from "./api/axiosConfig";
import { getLastMonthRange } from "./utils/dateHelpers";
import WaybillUpload from "./components/WaybillUpload";
import WaybillTable from "./components/WaybillTable";
import DateRangeFilter from "./components/DateRangeFilter";
import StatusFilter from "./components/StatusFilter";
import SummaryBar from "./components/SummaryBar";
import SearchBar from "./components/SearchBar";
import ExportButton from "./components/ExportButton";
import TargetCalculator from "./components/TargetCalculator";
import EditWaybillModal from "./components/EditWaybillModal";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";
import "./App.css";

function App() {
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("shipment_date");
  const [sortDirection, setSortDirection] = useState("desc");

  const [{ startDate: defaultStart, endDate: defaultEnd }] = useState(getLastMonthRange);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [deliveredFilter, setDeliveredFilter] = useState("all");

  const [activeFilters, setActiveFilters] = useState({
    startDate: defaultStart,
    endDate: defaultEnd,
    delivered: "all",
    incomplete: false,
  });

  const [waybills, setWaybills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });
  const [summary, setSummary] = useState(null);

  const [editingWaybill, setEditingWaybill] = useState(null);
  const [deletingWaybill, setDeletingWaybill] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleToggleIncomplete = () => {
    setShowIncompleteOnly((prev) => {
      const nextVal = !prev;
      setActiveFilters((f) => ({ ...f, incomplete: nextVal }));
      return nextVal;
    });
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const fetchWaybills = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiClient.get("waybills/", {
        params: {
          start_date: showIncompleteOnly ? undefined : activeFilters.startDate,
          end_date: showIncompleteOnly ? undefined : activeFilters.endDate,
          delivered:
            activeFilters.delivered && activeFilters.delivered !== "all"
              ? activeFilters.delivered
              : undefined,
          ordering: sortDirection === "desc" ? `-${sortField}` : sortField,
          search: searchQuery || undefined,
          incomplete: showIncompleteOnly ? "true" : undefined,
          page: currentPage,
        },
      });

      setWaybills(response.data.results);
      setPagination({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        currentPage: currentPage,
      });
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Waybill listesi alınamadı:", error);
      setWaybills([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilters, currentPage, sortField, sortDirection, searchQuery, showIncompleteOnly]);

  useEffect(() => {
    fetchWaybills();
  }, [fetchWaybills]);

  // Filtre/sayfa/arama değiştiğinde ekrandaki kayıt kümesi değişir --
  // eski sayfadan kalan seçim başka kayıtları silmeye yol açmasın diye temizle.
  useEffect(() => {
    setSelectedIds([]);
  }, [activeFilters, currentPage, sortField, sortDirection, searchQuery, showIncompleteOnly]);

  const handleApplyFilter = () => {
    setCurrentPage(1);
    setActiveFilters((prev) => ({
      ...prev,
      startDate,
      endDate,
    }));
  };

  const handleSelectDelivered = (val) => {
    setDeliveredFilter(val);
    setCurrentPage(1);
    setActiveFilters((prev) => ({
      ...prev,
      delivered: val,
    }));
  };

  const handleUploadSuccess = () => {
    fetchWaybills();
  };

  const handleEditSaved = () => {
    fetchWaybills();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWaybill) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(`waybills/${deletingWaybill.id}/`);
      setDeletingWaybill(null);
      fetchWaybills();
    } catch (error) {
      console.error("Silme hatası:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((existingId) => existingId !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const pageIds = waybills.map((w) => w.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : [...new Set([...prev, ...pageIds])]
    );
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;

    setIsBulkDeleting(true);
    try {
      await apiClient.post("waybills/bulk-delete/", { ids: selectedIds });
      setSelectedIds([]);
      setIsBulkDeleteConfirmOpen(false);
      fetchWaybills();
    } catch (error) {
      console.error("Toplu silme hatası:", error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="app-container">
      <h1>DHL Konşimento Yönetimi</h1>

      <WaybillUpload onUploadSuccess={handleUploadSuccess} />

      <SearchBar onSearchChange={handleSearchChange} />

      <button
        type="button"
        className={`incomplete-toggle ${showIncompleteOnly ? "incomplete-toggle-active" : ""}`}
        onClick={handleToggleIncomplete}
      >
        ⚠️ {showIncompleteOnly ? "Eksik Veri Filtresi Açık" : "Sadece Eksik Verileri Göster"}
      </button>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
      />

      <StatusFilter
        selectedDelivered={deliveredFilter}
        onSelectDelivered={handleSelectDelivered}
      />

      <div className="summary-and-export">
        <SummaryBar summary={summary} isLoading={isLoading} />
        <ExportButton activeFilters={activeFilters} />
        <TargetCalculator summary={summary} />
        <button
          type="button"
          className="bulk-delete-button"
          disabled={selectedIds.length === 0}
          onClick={() => setIsBulkDeleteConfirmOpen(true)}
        >
          🗑️ Seçilenleri Sil {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
        </button>
      </div>

      <WaybillTable
        waybills={waybills}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setCurrentPage}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onEdit={setEditingWaybill}
        onDelete={setDeletingWaybill}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
      />

      <EditWaybillModal
        waybill={editingWaybill}
        onClose={() => setEditingWaybill(null)}
        onSaved={handleEditSaved}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingWaybill}
        title="Kaydı Sil"
        message={
          deletingWaybill
            ? `${deletingWaybill.waybill_number} numaralı konşimentoyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
            : ""
        }
        onCancel={() => setDeletingWaybill(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      <DeleteConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        title="Seçilenleri Sil"
        message={`${selectedIds.length} kayıt kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}

export default App;
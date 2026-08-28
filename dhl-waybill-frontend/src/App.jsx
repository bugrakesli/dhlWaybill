import { useState, useEffect, useCallback } from "react";
import apiClient from "./api/axiosConfig";
import { getLastMonthRange } from "./utils/dateHelpers";
import WaybillUpload from "./components/WaybillUpload";
import WaybillTable from "./components/WaybillTable";
import DateRangeFilter from "./components/DateRangeFilter";
import StatusFilter from "./components/StatusFilter";
import TerritoryFilter from "./components/TerritoryFilter";
import SummaryBar from "./components/SummaryBar";
import SearchBar from "./components/SearchBar";
import ExportButton from "./components/ExportButton";
import TargetCalculator from "./components/TargetCalculator";
import EditWaybillModal from "./components/EditWaybillModal";
import DeleteConfirmDialog from "./components/DeleteConfirmDialog";
import "./App.css";

function App() {
  const [incompleteMode, setIncompleteMode] = useState(0); // 0: Kapalı, 1: Vurgulu (Tümü), 2: Sadece Eksikler
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("shipment_date");
  const [sortDirection, setSortDirection] = useState("desc");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveredFilter, setDeliveredFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [territories, setTerritories] = useState([]);

  const [activeFilters, setActiveFilters] = useState({
    startDate: "",
    endDate: "",
    delivered: "all",
    territory: "",
    incompleteMode: 0,
  });

  const [waybills, setWaybills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
    totalPages: 1,
    pageSize: 25,
  });
  const [summary, setSummary] = useState(null);

  const [editingWaybill, setEditingWaybill] = useState(null);
  const [deletingWaybill, setDeletingWaybill] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery((prev) => {
      if (prev !== query) {
        setCurrentPage(1);
        return query;
      }
      return prev;
    });
  }, []);

  const handleToggleIncomplete = () => {
    setIncompleteMode((prev) => {
      const nextVal = (prev + 1) % 3;
      setActiveFilters((f) => ({ ...f, incompleteMode: nextVal }));
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

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const fetchTerritories = useCallback(async () => {
    try {
      const response = await apiClient.get("waybills/territories/");
      if (response.data && Array.isArray(response.data.territories)) {
        setTerritories(response.data.territories);
      }
    } catch (error) {
      console.error("Territory listesi alınamadı:", error);
    }
  }, []);

  useEffect(() => {
    fetchTerritories();
  }, [fetchTerritories]);

  const fetchWaybills = useCallback(async () => {
    setIsLoading(true);

    const isModeActive = incompleteMode > 0;
    const isModeOnlyIncomplete = incompleteMode === 2;

    try {
      const response = await apiClient.get("waybills/", {
        params: {
          start_date: isModeActive ? undefined : (activeFilters.startDate || undefined),
          end_date: isModeActive ? undefined : (activeFilters.endDate || undefined),
          delivered:
            activeFilters.delivered && activeFilters.delivered !== "all"
              ? activeFilters.delivered
              : undefined,
          territory:
            activeFilters.territory && activeFilters.territory !== ""
              ? activeFilters.territory
              : undefined,
          ordering: sortDirection === "desc" ? `-${sortField}` : sortField,
          search: searchQuery || undefined,
          incomplete: isModeOnlyIncomplete ? "true" : undefined,
          page: currentPage,
          page_size: pageSize,
        },
      });

      setWaybills(response.data.results);
      setPagination({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        currentPage: response.data.current_page || currentPage,
        totalPages: response.data.total_pages || Math.ceil((response.data.count || 0) / pageSize) || 1,
        pageSize: response.data.page_size || pageSize,
      });
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Waybill listesi alınamadı:", error);
      setWaybills([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilters, currentPage, pageSize, sortField, sortDirection, searchQuery, incompleteMode]);

  useEffect(() => {
    fetchWaybills();
  }, [fetchWaybills]);

  // Filtre/sayfa/arama/sayfa boyutu değiştiğinde ekrandaki kayıt kümesi değişir --
  // eski sayfadan kalan seçim başka kayıtları silmeye yol açmasın diye temizle.
  useEffect(() => {
    setSelectedIds([]);
  }, [activeFilters, currentPage, pageSize, sortField, sortDirection, searchQuery, incompleteMode]);

  const handleApplyFilter = () => {
    setCurrentPage(1);
    setActiveFilters((prev) => ({
      ...prev,
      startDate,
      endDate,
    }));
  };

  const handleClearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    setActiveFilters((prev) => ({
      ...prev,
      startDate: "",
      endDate: "",
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

  const handleSelectTerritory = (val) => {
    setTerritoryFilter(val);
    setCurrentPage(1);
    setActiveFilters((prev) => ({
      ...prev,
      territory: val,
    }));
  };

  const handleUploadSuccess = () => {
    fetchWaybills();
    fetchTerritories();
  };

  const handleEditSaved = () => {
    fetchWaybills();
    fetchTerritories();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWaybill) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(`waybills/${deletingWaybill.id}/`);
      setDeletingWaybill(null);
      fetchWaybills();
      fetchTerritories();
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
      fetchTerritories();
    } catch (error) {
      console.error("Toplu silme hatası:", error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleClearAllConfirm = async () => {
    setIsClearingAll(true);
    try {
      await apiClient.post("waybills/clear-all/");
      setSelectedIds([]);
      setIsClearAllConfirmOpen(false);
      setCurrentPage(1);
      fetchWaybills();
      fetchTerritories();
    } catch (error) {
      console.error("Tüm kayıtları silme hatası:", error);
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="app-container">
      <h1>DHL Konşimento Yönetimi</h1>

      <WaybillUpload onUploadSuccess={handleUploadSuccess} />

      <SearchBar onSearchChange={handleSearchChange} />

      <button
        type="button"
        className={`incomplete-toggle ${
          incompleteMode === 1
            ? "incomplete-toggle-stage1"
            : incompleteMode === 2
            ? "incomplete-toggle-active"
            : ""
        }`}
        onClick={handleToggleIncomplete}
        title={
          incompleteMode === 0
            ? "Eksik verileri vurgulamak için tıklayın (Mod 1)"
            : incompleteMode === 1
            ? "Sadece eksik verileri filtrelemek için tıklayın (Mod 2)"
            : "Eksik veri filtresini kapatıp varsayılan görünüme dönmek için tıklayın"
        }
      >
        {incompleteMode === 0 && "⚠️ Eksik Verileri Vurgula"}
        {incompleteMode === 1 && "⚠️ Eksik Veriler Vurgulandı (Tümü)"}
        {incompleteMode === 2 && "⚠️ Sadece Eksik Veriler"}
      </button>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        onClear={handleClearDateFilter}
      />

      <StatusFilter
        selectedDelivered={deliveredFilter}
        onSelectDelivered={handleSelectDelivered}
      />

      <TerritoryFilter
        territories={territories}
        selectedTerritory={territoryFilter}
        onSelectTerritory={handleSelectTerritory}
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
        <button
          type="button"
          className="clear-all-button"
          disabled={pagination.count === 0}
          onClick={() => setIsClearAllConfirmOpen(true)}
          title="Veritabanındaki tüm konşimento kayıtlarını kalıcı olarak siler"
        >
          💣 Tüm Listeyi Temizle
        </button>
      </div>

      <WaybillTable
        waybills={waybills}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onEdit={setEditingWaybill}
        onDelete={setDeletingWaybill}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        highlightIncomplete={incompleteMode > 0}
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

      <DeleteConfirmDialog
        isOpen={isClearAllConfirmOpen}
        title="Tüm Listeyi Temizle (Veritabanını Sıfırla)"
        message={`DİKKAT: Veritabanındaki TÜM (${pagination.count}) konşimento kaydı kalıcı olarak silinecektir (Drop/Truncate dengi). Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?`}
        onCancel={() => setIsClearAllConfirmOpen(false)}
        onConfirm={handleClearAllConfirm}
        isDeleting={isClearingAll}
      />
    </div>
  );
}

export default App;
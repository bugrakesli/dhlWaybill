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
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" veya "desc"

  const [{ startDate: defaultStart, endDate: defaultEnd }] = useState(getLastMonthRange);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  const [activeFilters, setActiveFilters] = useState({
    startDate: defaultStart,
    endDate: defaultEnd,
    statuses: [],
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

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleToggleIncomplete = () => {
    setShowIncompleteOnly((prev) => !prev);
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
          // Eksik veri filtresi aktifken tarih aralığını GÖNDERME --
          // yoksa placeholder tarihli (1900-01-01) kayıtlar normal tarih
          // aralığının dışında kaldığı için hiç görünmezler.
          start_date: showIncompleteOnly ? undefined : activeFilters.startDate,
          end_date: showIncompleteOnly ? undefined : activeFilters.endDate,
          status: activeFilters.statuses.length > 0 ? activeFilters.statuses.join(",") : undefined,
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

  const handleApplyFilter = () => {
    setCurrentPage(1);
    setActiveFilters({ startDate, endDate, statuses: selectedStatuses });
  };

  const handleToggleStatus = (statusValue) => {
    setSelectedStatuses((prev) =>
      prev.includes(statusValue)
        ? prev.filter((s) => s !== statusValue)
        : [...prev, statusValue]
    );
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
        selectedStatuses={selectedStatuses}
        onToggleStatus={handleToggleStatus}
      />

      <div className="summary-and-export">
        <SummaryBar summary={summary} isLoading={isLoading} />
        <ExportButton activeFilters={activeFilters} />
        <TargetCalculator summary={summary} />
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
      />

      <EditWaybillModal
        waybill={editingWaybill}
        onClose={() => setEditingWaybill(null)}
        onSaved={handleEditSaved}
      />

      <DeleteConfirmDialog
        waybill={deletingWaybill}
        onCancel={() => setDeletingWaybill(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default App;
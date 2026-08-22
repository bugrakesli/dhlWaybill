/**
 * Bugünün tarihine göre "geçen ayın" ilk ve son gününü hesaplar.
 * Backend'in beklediği format: YYYY-MM-DD (ISO date string)
 */
export function getLastMonthRange() {
  const today = new Date();

  const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const firstDayOfLastMonth = new Date(
    lastDayOfLastMonth.getFullYear(),
    lastDayOfLastMonth.getMonth(),
    1
  );

  return {
    startDate: formatDateToISO(firstDayOfLastMonth),
    endDate: formatDateToISO(lastDayOfLastMonth),
  };
}

/**
 * Date objesini "YYYY-MM-DD" formatına çevirir.
 * toISOString() kullanmıyoruz çünkü saat dilimi kayması riski var.
 */
export function formatDateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
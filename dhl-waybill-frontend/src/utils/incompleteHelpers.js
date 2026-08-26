/**
 * Bir konşimentonun eksik veri barındırıp barındırmadığını kontrol eder.
 * Backend'deki PLACEHOLDER_DATE ('1900-01-01') ve PLACEHOLDER_TEXT ('-')
 * mantığıyla tam uyumludur.
 */
export function isWaybillIncomplete(waybill) {
  if (!waybill) return false;

  if (waybill.is_incomplete !== undefined && waybill.is_incomplete !== null) {
    return Boolean(waybill.is_incomplete);
  }

  const isPlaceholderText = (val) =>
    !val || val === "-" || String(val).trim() === "" || String(val).trim() === "-";

  const isPlaceholderDate = (val) =>
    !val || val === "1900-01-01" || String(val).startsWith("1900-01-01");

  return (
    isPlaceholderDate(waybill.shipment_date) ||
    isPlaceholderText(waybill.sender) ||
    isPlaceholderText(waybill.receiver) ||
    isPlaceholderText(waybill.destination) ||
    isPlaceholderText(waybill.collected_by) ||
    waybill.euro_amount === null ||
    waybill.euro_amount === undefined ||
    waybill.exchange_rate === null ||
    waybill.exchange_rate === undefined ||
    waybill.piece_count === null ||
    waybill.piece_count === undefined
  );
}

/**
 * Eksik olan alanların isimlerini Türkçe etiketler olarak döner (tooltip için).
 */
export function getIncompleteFields(waybill) {
  if (!waybill) return [];

  const missing = [];

  const isPlaceholderText = (val) =>
    !val || val === "-" || String(val).trim() === "" || String(val).trim() === "-";

  const isPlaceholderDate = (val) =>
    !val || val === "1900-01-01" || String(val).startsWith("1900-01-01");

  if (isPlaceholderDate(waybill.shipment_date)) {
    missing.push("Tarih");
  }
  if (isPlaceholderText(waybill.sender)) {
    missing.push("Gönderici");
  }
  if (isPlaceholderText(waybill.destination)) {
    missing.push("Varış Noktası");
  }
  if (waybill.piece_count === null || waybill.piece_count === undefined) {
    missing.push("Parça");
  }
  if (isPlaceholderText(waybill.collected_by)) {
    missing.push("Toplayan");
  }
  if (isPlaceholderText(waybill.receiver)) {
    missing.push("Alıcı");
  }
  if (waybill.euro_amount === null || waybill.euro_amount === undefined) {
    missing.push("Euro");
  }
  if (waybill.exchange_rate === null || waybill.exchange_rate === undefined) {
    missing.push("Kur");
  }

  return missing;
}

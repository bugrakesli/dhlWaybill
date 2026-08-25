import { useState } from "react";

/**
 * Filtrelenmiş sonuçların (gerçekleşen sayı + toplam euro) elle girilen
 * hedeflere göre ne kadarının tutturulduğunu hesaplayan panel.
 *
 * Formül:
 *   hedef_gerceklesme_orani = (gerceklesen_adet * 100) / hedef_adet
 *   euro_orani              = (gerceklesen_euro * 100) / hedef_euro
 *   toplam_hedef            = (hedef_gerceklesme_orani * euro_orani) / 100
 */
function TargetCalculator({ summary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetCount, setTargetCount] = useState("");
  const [targetEuro, setTargetEuro] = useState("");

  const realizedCount = summary?.total_count ?? 0;
  const realizedEuro = summary?.total_euro ?? 0;

  const parsedTargetCount = parseFloat(targetCount);
  const parsedTargetEuro = parseFloat(targetEuro);

  const hasValidTargetCount = !isNaN(parsedTargetCount) && parsedTargetCount > 0;
  const hasValidTargetEuro = !isNaN(parsedTargetEuro) && parsedTargetEuro > 0;

  const completionRate = hasValidTargetCount
    ? Math.min((realizedCount * 100) / parsedTargetCount, 100)
    : null;

  const euroRate = hasValidTargetEuro
    ? Math.min((realizedEuro * 100) / parsedTargetEuro, 100)
    : null;

  const totalTarget =
    completionRate !== null && euroRate !== null
      ? (completionRate * euroRate) / 100
      : null;

  const formatPercent = (value) =>
    value === null ? "—" : `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;

  return (
    <div className="target-calculator-container">
      <button
        type="button"
        className="target-calculator-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        🎯 Hedef Hesaplama {isOpen ? "▲" : "▼"}
      </button>

      {isOpen && (
        <div className="target-calculator-panel">
          <div className="target-calculator-inputs">
            <label>
              Hedef Konşimento Sayısı
              <input
                type="number"
                min="0"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                placeholder="Örn: 50"
              />
            </label>

            <label>
              Hedef Tutar (€)
              <input
                type="number"
                min="0"
                value={targetEuro}
                onChange={(e) => setTargetEuro(e.target.value)}
                placeholder="Örn: 10000"
              />
            </label>
          </div>

          <div className="target-calculator-results">
            <div className="target-result-row">
              <span>Gerçekleşen Konşimento:</span>
              <strong>{realizedCount}</strong>
            </div>
            <div className="target-result-row">
              <span>Toplam Euro:</span>
              <strong>
                {realizedEuro.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </strong>
            </div>

            <hr />

            <div className="target-result-row">
              <span>Adet Gerçekleşme Oranı:</span>
              <strong>{formatPercent(completionRate)}</strong>
            </div>
            <div className="target-result-row">
              <span>Ciro / Tutar Oranı:</span>
              <strong>{formatPercent(euroRate)}</strong>
            </div>

            <div className="target-result-row target-result-final">
              <span>Toplam Hedef:</span>
              <strong>{formatPercent(totalTarget)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TargetCalculator;
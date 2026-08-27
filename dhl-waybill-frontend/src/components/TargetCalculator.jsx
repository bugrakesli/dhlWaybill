import { useState } from "react";

/**
 * Filtrelenmiş sonuçların (gerçekleşen konşimento sayısı + toplam ağırlık)
 * elle girilen hedeflere göre ne kadarının tutturulduğunu hesaplayan panel.
 *
 * Formül:
 *   hedef_gerceklesme_orani = (gerceklesen_adet * 100) / hedef_adet
 *   agirlik_orani           = (gerceklesen_agirlik * 100) / hedef_agirlik
 *   toplam_hedef            = (hedef_gerceklesme_orani * agirlik_orani) / 100
 */
function TargetCalculator({ summary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetCount, setTargetCount] = useState("");
  const [targetWeight, setTargetWeight] = useState("");

  const realizedCount = summary?.total_count ?? 0;
  const realizedWeight = summary?.total_weight ?? 0;

  const parsedTargetCount = parseFloat(targetCount);
  const parsedTargetWeight = parseFloat(targetWeight);

  const hasValidTargetCount = !isNaN(parsedTargetCount) && parsedTargetCount > 0;
  const hasValidTargetWeight = !isNaN(parsedTargetWeight) && parsedTargetWeight > 0;

  const countRate = hasValidTargetCount
    ? Math.min((realizedCount * 100) / parsedTargetCount, 100)
    : null;

  const weightRate = hasValidTargetWeight
    ? Math.min((realizedWeight * 100) / parsedTargetWeight, 100)
    : null;

  const totalTarget =
    countRate !== null && weightRate !== null
      ? (countRate * weightRate) / 100
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
              Hedef Ağırlık (kg)
              <input
                type="number"
                min="0"
                step="any"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="Örn: 500"
              />
            </label>
          </div>

          <div className="target-calculator-results">
            <div className="target-result-row">
              <span>Gerçekleşen Konşimento:</span>
              <strong>{realizedCount}</strong>
            </div>
            <div className="target-result-row">
              <span>Gerçekleşen Ağırlık:</span>
              <strong>
                {realizedWeight.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
              </strong>
            </div>

            <hr />

            <div className="target-result-row">
              <span>Konşimento Oranı:</span>
              <strong>{formatPercent(countRate)}</strong>
            </div>
            <div className="target-result-row">
              <span>Ağırlık Oranı:</span>
              <strong>{formatPercent(weightRate)}</strong>
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
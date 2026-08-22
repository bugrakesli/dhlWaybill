import { useState, useEffect, useRef } from "react";

/**
 * Konşimento no / gönderici / alıcı üzerinde serbest metin arama.
 * Debounce: kullanıcı yazmayı bıraktıktan 400ms sonra arama tetiklenir,
 * her tuş vuruşunda API'ye istek atılmaz.
 */
function SearchBar({ onSearchChange }) {
  const [inputValue, setInputValue] = useState("");
  const debounceTimer = useRef(null);

  useEffect(() => {
    // Önceki zamanlayıcıyı iptal et (kullanıcı hâlâ yazıyorsa)
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      onSearchChange(inputValue.trim());
    }, 400);

    // Component unmount olursa veya inputValue tekrar değişirse temizle
    return () => clearTimeout(debounceTimer.current);
  }, [inputValue, onSearchChange]);

  return (
    <div className="search-bar-container">
      <input
        type="text"
        placeholder="Konşimento no, gönderici veya alıcı ara..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="search-input"
      />
      {inputValue && (
        <button
          type="button"
          className="search-clear-button"
          onClick={() => setInputValue("")}
          aria-label="Aramayı temizle"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchBar;
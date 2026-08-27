import { useState, useEffect, useRef } from "react";

/**
 * Konşimento no / gönderici / alıcı üzerinde serbest metin arama.
 * Debounce: kullanıcı yazmayı bıraktıktan 400ms sonra arama tetiklenir,
 * her tuş vuruşunda API'ye istek atılmaz.
 */
function SearchBar({ onSearchChange }) {
  const [inputValue, setInputValue] = useState("");
  const debounceTimer = useRef(null);
  const isFirstRun = useRef(true);
  const onSearchChangeRef = useRef(onSearchChange);

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (onSearchChangeRef.current) {
        onSearchChangeRef.current(inputValue.trim());
      }
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputValue]);

  const handleClear = () => {
    setInputValue("");
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (onSearchChangeRef.current) {
      onSearchChangeRef.current("");
    }
  };

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
          onClick={handleClear}
          aria-label="Aramayı temizle"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchBar;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchHsn, autoCompleteHsn, getHsnGstRate } from '../services/api';
import toast from 'react-hot-toast';

/**
 * HSN Auto-Complete Component
 * 
 * Features:
 * - Search HSN by item name/description
 * - Auto-complete HSN code as user types
 * - Display GST rate and description
 * - Select exact 8-digit HSN code
 */
export default function HsnAutoComplete({ 
  value, 
  onChange, 
  onGstRateChange,
  placeholder = "Search by item name or HSN code...",
  className = "",
  disabled = false,
  showGstRate = true,
  // New: parent can push an auto-filled HSN object {hsnCode, description, gstRate}
  autoFilledHsn = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedHsn, setSelectedHsn] = useState(null);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // When parent auto-fills HSN (from item name), update display
  useEffect(() => {
    if (autoFilledHsn && autoFilledHsn.hsnCode) {
      setSelectedHsn(autoFilledHsn);
      setSearchTerm(`${autoFilledHsn.hsnCode}${autoFilledHsn.description ? ' - ' + autoFilledHsn.description : ''}`);
      setShowDropdown(false);
    }
  }, [autoFilledHsn]);

  // Reset when value is cleared from outside
  useEffect(() => {
    if (!value && !autoFilledHsn) {
      setSearchTerm('');
      setSelectedHsn(null);
    }
  }, [value, autoFilledHsn]);

  // Load HSN details if value is provided (edit mode)
  useEffect(() => {
    if (value && !selectedHsn && !autoFilledHsn) {
      loadHsnDetails(value);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadHsnDetails = async (hsnCode) => {
    try {
      const response = await getHsnGstRate(hsnCode);
      if (response.data && response.data.valid) {
        setSelectedHsn({ hsnCode, gstRate: response.data.gstRate });
      }
    } catch (err) {
      setSelectedHsn({ hsnCode, gstRate: 0 });
    }
  };

  // Search HSN codes from backend (HSN_SAC.json via API)
  const searchHsnCodes = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      let response;
      if (/^\d+$/.test(term)) {
        response = await autoCompleteHsn(term, 10);
      } else {
        response = await searchHsn(term, 10);
      }
      const results = Array.isArray(response.data) ? response.data : [];
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch (err) {
      console.error('HSN search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedHsn(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchHsnCodes(term);
    }, 300);
  };

  // Handle HSN selection
  const handleSelectHsn = (hsn) => {
    setSelectedHsn(hsn);
    setSearchTerm(`${hsn.hsnCode} - ${hsn.description}`);
    setShowDropdown(false);
    
    // Notify parent components
    onChange(hsn.hsnCode);
    if (onGstRateChange) {
      onGstRateChange(hsn.gstRate);
    }
  };

  // Handle manual HSN code entry
  const handleManualEntry = async (e) => {
    if (e.key === 'Enter') {
      const code = searchTerm.trim();
      if (/^\d{4,8}$/.test(code)) {
        try {
          const response = await getHsnGstRate(code);
          if (response.data && response.data.valid) {
            handleSelectHsn({ hsnCode: code, description: 'Manual entry', gstRate: response.data.gstRate });
          } else {
            onChange(code);
          }
        } catch (err) {
          onChange(code);
        }
      }
    }
  };

  // Clear selection
  const handleClear = () => {
    setSearchTerm('');
    setSelectedHsn(null);
    setSuggestions([]);
    onChange('');
    if (onGstRateChange) {
      onGstRateChange(0);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleManualEntry}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
        />
        
        {/* Clear button */}
        {(searchTerm || selectedHsn) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* GST Rate Badge */}
      {showGstRate && selectedHsn && (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-gray-500">HSN: {selectedHsn.hsnCode}</span>
          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
            GST {selectedHsn.gstRate}%
          </span>
        </div>
      )}

      {/* Dropdown Suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto">
          <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs text-gray-500 border-b">
            Select exact 8-digit HSN code
          </div>
          {suggestions.map((hsn, index) => (
            <div
              key={`${hsn.hsnCode}-${index}`}
              onClick={() => handleSelectHsn(hsn)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-blue-600">{hsn.hsnCode}</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                      {hsn.category}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                    {hsn.description}
                  </div>
                  {hsn.reason && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {hsn.reason}
                    </div>
                  )}
                </div>
                <div className="ml-3 text-right">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                    {hsn.gstRate}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showDropdown && !loading && suggestions.length === 0 && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center">
          <div className="text-gray-500 text-sm">No HSN codes found</div>
          <div className="text-xs text-gray-400 mt-1">
            Try searching with different keywords or enter HSN code manually
          </div>
        </div>
      )}
    </div>
  );
}

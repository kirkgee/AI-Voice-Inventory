'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Part } from '@/lib/dal/parts';

export interface PartSearchSelectProps {
  parts: Part[];
  selectedPartId: string | null;
  onSelect: (part: Part) => void;
  onAddNew: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function PartSearchSelect({
  parts,
  selectedPartId,
  onSelect,
  onAddNew,
  disabled = false,
  placeholder = 'Search by SKU or description...',
}: PartSearchSelectProps) {
  const [searchText, setSearchText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the currently selected part to display its label
  const selectedPart = parts.find(p => p.id === selectedPartId);

  // Filter parts by search text
  const filteredParts = searchText.trim()
    ? parts.filter(p => {
        const lower = searchText.toLowerCase();
        return (
          (p.sku?.toLowerCase().includes(lower)) ||
          (p.description?.toLowerCase().includes(lower))
        );
      })
    : parts;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [searchText]);

  function handleInputFocus() {
    if (!disabled) {
      setIsOpen(true);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchText(e.target.value);
    if (!isOpen) setIsOpen(true);
  }

  function handleSelectPart(part: Part) {
    onSelect(part);
    setSearchText('');
    setIsOpen(false);
  }

  function handleClear() {
    setSearchText('');
    onSelect({ id: '', tenantId: '' } as Part); // Signal deselection
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    // Total items = filtered parts + 1 (the "Create New Part" option)
    const totalItems = filteredParts.length + 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filteredParts.length) {
          handleSelectPart(filteredParts[highlightIndex]);
        } else if (highlightIndex === filteredParts.length) {
          onAddNew();
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }

  const displayValue = isOpen
    ? searchText
    : selectedPart
      ? `${selectedPart.sku || 'No SKU'} — ${selectedPart.description || 'No description'}`
      : '';

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.inputWrapper}>
        <input
          ref={inputRef}
          style={{
            ...styles.input,
            ...(disabled ? styles.inputDisabled : {}),
          }}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
        {selectedPartId && !isOpen && (
          <button
            style={styles.clearBtn}
            onClick={handleClear}
            disabled={disabled}
            title="Clear selection"
            type="button"
          >
            ✕
          </button>
        )}
        <button
          style={styles.chevronBtn}
          onClick={() => { if (!disabled) { setIsOpen(!isOpen); inputRef.current?.focus(); } }}
          disabled={disabled}
          type="button"
          tabIndex={-1}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {isOpen && (
        <div style={styles.dropdown}>
          {filteredParts.length === 0 && (
            <div style={styles.noResults}>No matching parts found</div>
          )}
          <div style={styles.listContainer}>
            {filteredParts.map((part, index) => (
              <div
                key={part.id}
                style={{
                  ...styles.option,
                  ...(index === highlightIndex ? styles.optionHighlighted : {}),
                  ...(part.id === selectedPartId ? styles.optionSelected : {}),
                }}
                onClick={() => handleSelectPart(part)}
                onMouseEnter={() => setHighlightIndex(index)}
              >
                <span style={styles.optionSku}>{part.sku || 'No SKU'}</span>
                <span style={styles.optionDesc}>{part.description || 'No description'}</span>
                {part.supplier && (
                  <span style={styles.optionSupplier}>{part.supplier}</span>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              ...styles.addNewOption,
              ...(highlightIndex === filteredParts.length ? styles.optionHighlighted : {}),
            }}
            onClick={() => { onAddNew(); setIsOpen(false); }}
            onMouseEnter={() => setHighlightIndex(filteredParts.length)}
          >
            <span style={styles.addNewIcon}>＋</span>
            <span style={styles.addNewText}>Create New Part</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '8px 60px 8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
  },
  clearBtn: {
    position: 'absolute',
    right: '30px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: '0.75rem',
    padding: '2px 4px',
  },
  chevronBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: '0.625rem',
    padding: '2px 4px',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    zIndex: 100,
    maxHeight: '240px',
    display: 'flex',
    flexDirection: 'column',
  },
  listContainer: {
    overflowY: 'auto',
    maxHeight: '190px',
    flexShrink: 1,
  },
  noResults: {
    padding: '10px 14px',
    color: '#9ca3af',
    fontSize: '0.8125rem',
    fontStyle: 'italic',
  },
  option: {
    padding: '8px 14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.875rem',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.1s',
  },
  optionHighlighted: {
    backgroundColor: '#eff6ff',
  },
  optionSelected: {
    backgroundColor: '#dbeafe',
    fontWeight: 500,
  },
  optionSku: {
    fontWeight: 600,
    color: '#1f2937',
    minWidth: '80px',
    flexShrink: 0,
  },
  optionDesc: {
    color: '#4b5563',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  optionSupplier: {
    color: '#9ca3af',
    fontSize: '0.75rem',
    flexShrink: 0,
  },
  addNewOption: {
    padding: '10px 14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderTop: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: '0 0 8px 8px',
    flexShrink: 0,
  },
  addNewIcon: {
    color: '#2563eb',
    fontWeight: 700,
    fontSize: '1rem',
  },
  addNewText: {
    color: '#2563eb',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
};

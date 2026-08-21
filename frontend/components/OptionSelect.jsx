import { useState } from 'react';

/**
 * Dropdown styled like CategorySelect with Clear selection.
 * options: string[] e.g. ['Event', 'Workshop']
 */
export default function OptionSelect({
  value = '',
  onChange,
  options = [],
  required = false,
  isOpen,
  onToggle,
  onClose,
  placeholder = 'Select option',
  label,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const actualIsOpen = isOpen !== undefined ? isOpen : internalIsOpen;
  const actualOnToggle = onToggle || (() => setInternalIsOpen(!internalIsOpen));
  const actualOnClose = onClose || (() => setInternalIsOpen(false));

  const selected = String(value || '').trim();

  const handleSelect = (next) => {
    onChange?.(next);
    actualOnClose();
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label ? (
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontWeight: 600,
            color: '#495057',
            fontSize: '0.95rem',
          }}
        >
          {label} {required ? <span style={{ color: 'red' }}>*</span> : null}
        </label>
      ) : null}
      <div
        style={{
          padding: '14px 16px',
          border: actualIsOpen ? '2px solid var(--system-secondary)' : '2px solid #e9ecef',
          borderRadius: '10px',
          backgroundColor: selected ? '#f0f8ff' : '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '1rem',
          color: selected ? 'var(--system-secondary)' : '#adb5bd',
          fontWeight: selected ? '600' : '400',
          transition: 'all 0.3s ease',
          boxShadow: actualIsOpen ? '0 0 0 3px rgba(201, 169, 106, 0.1)' : 'none',
        }}
        onClick={actualOnToggle}
        onBlur={() => setTimeout(actualOnClose, 200)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            actualOnToggle();
          }
        }}
        aria-required={required}
      >
        <span>{selected || placeholder}</span>
      </div>

      {actualIsOpen ? (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '2px solid #e9ecef',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxHeight: '220px',
            overflowY: 'auto',
            marginTop: '4px',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              borderBottom: '1px solid #f8f9fa',
              color: '#dc3545',
              fontWeight: 500,
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect('')}
          >
            ✕ Clear selection
          </div>
          {options.map((opt) => {
            const isSelected = selected === opt;
            return (
              <div
                key={opt}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f8f9fa',
                  color: isSelected ? 'var(--system-secondary)' : '#000000',
                  backgroundColor: isSelected ? '#f0f8ff' : '#ffffff',
                  fontWeight: isSelected ? 600 : 400,
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

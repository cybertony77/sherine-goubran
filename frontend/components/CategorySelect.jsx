import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../lib/axios';

function categoryRowKey(c) {
  if (c == null) return '';
  return String(c.id ?? c._id ?? c.name ?? '');
}

function selectedCategoryLabel(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.name === 'string') return value.name;
  return '';
}

function parseSelectedCategories(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

export function serializeCategories(list) {
  return (Array.isArray(list) ? list : [])
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(', ');
}

export default function CategorySelect({
  selectedCategory,
  onCategoryChange,
  required = false,
  isOpen,
  onToggle,
  onClose,
  placeholder = 'Select Category',
  multiple = false,
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const actualIsOpen = isOpen !== undefined ? isOpen : internalIsOpen;
  const actualOnToggle = onToggle || (() => setInternalIsOpen(!internalIsOpen));
  const actualOnClose = onClose || (() => setInternalIsOpen(false));

  const selectedList = useMemo(
    () => (multiple ? parseSelectedCategories(selectedCategory) : []),
    [multiple, selectedCategory]
  );

  const selectedLabel = useMemo(() => {
    if (multiple) return selectedList.join(', ');
    return selectedCategoryLabel(selectedCategory);
  }, [multiple, selectedCategory, selectedList]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/api/categories');
      return response.data;
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
  });

  const categories = useMemo(() => {
    if (Array.isArray(data?.categories)) return data.categories;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  const handleCategorySelect = (categoryName) => {
    if (!multiple) {
      onCategoryChange(categoryName);
      actualOnClose();
      return;
    }

    if (!categoryName) {
      onCategoryChange('');
      return;
    }

    const exists = selectedList.some(
      (item) => item.toLowerCase() === categoryName.toLowerCase()
    );
    const next = exists
      ? selectedList.filter((item) => item.toLowerCase() !== categoryName.toLowerCase())
      : [...selectedList, categoryName];
    onCategoryChange(serializeCategories(next));
  };

  const displayPlaceholder = multiple ? 'Select Categories' : placeholder;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          padding: '14px 16px',
          border: actualIsOpen ? '2px solid var(--system-secondary)' : '2px solid #e9ecef',
          borderRadius: '10px',
          backgroundColor: selectedLabel ? '#f0f8ff' : '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          fontSize: '1rem',
          color: selectedLabel ? 'var(--system-secondary)' : '#adb5bd',
          fontWeight: selectedLabel ? '600' : '400',
          transition: 'all 0.3s ease',
          boxShadow: actualIsOpen ? '0 0 0 3px rgba(201, 169, 106, 0.1)' : 'none',
          minHeight: 52,
          boxSizing: 'border-box',
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
        aria-multiselectable={multiple || undefined}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            lineHeight: 1.4,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {isLoading
            ? 'Loading categories...'
            : selectedLabel || displayPlaceholder}
        </span>
        {multiple && selectedList.length > 0 ? (
          <span
            style={{
              flexShrink: 0,
              fontSize: '0.78rem',
              fontWeight: 800,
              color: 'var(--system-secondary-hover)',
              background: 'rgba(201, 169, 106, 0.12)',
              border: '1px solid rgba(201, 169, 106, 0.25)',
              borderRadius: 999,
              padding: '3px 8px',
            }}
          >
            {selectedList.length}
          </span>
        ) : null}
      </div>

      {actualIsOpen && (
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
              transition: 'background-color 0.2s ease',
              color: '#dc3545',
              fontWeight: '500',
            }}
            onClick={() => handleCategorySelect('')}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fff5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            ✕ Clear selection
          </div>
          {error ? (
            <div
              style={{
                padding: '12px 16px',
                color: '#dc3545',
                fontSize: '0.9rem',
                textAlign: 'center',
              }}
            >
              Error loading categories
            </div>
          ) : isLoading ? (
            <div
              style={{
                padding: '12px 16px',
                color: '#666',
                fontSize: '0.9rem',
                textAlign: 'center',
              }}
            >
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div
              style={{
                padding: '12px 16px',
                color: '#666',
                fontSize: '0.9rem',
                textAlign: 'center',
              }}
            >
              No categories available
            </div>
          ) : (
            categories.map((category) => {
              const name = category?.name != null ? String(category.name) : '';
              const rowKey = categoryRowKey(category) || name;
              const isSelected = multiple
                ? selectedList.some((item) => item.toLowerCase() === name.toLowerCase())
                : Boolean(name && selectedLabel === name);
              return (
                <div
                  key={rowKey}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f8f9fa',
                    transition: 'background-color 0.2s ease',
                    color: isSelected ? 'var(--system-secondary)' : '#000000',
                    backgroundColor: isSelected ? '#f0f8ff' : '#ffffff',
                    fontWeight: isSelected ? '600' : '400',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleCategorySelect(name)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected
                      ? '#f0f8ff'
                      : '#ffffff';
                  }}
                >
                  {name || '(Unnamed category)'}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

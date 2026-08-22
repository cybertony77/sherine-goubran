import { useEffect, useRef, useState } from 'react';
import styles from '../styles/PublicSelect.module.css';

export default function PublicSelect({
  id,
  label,
  value,
  options = [],
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = options.find((item) => item.value === value) || options[0] || null;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.field}>
      {label ? (
        <label id={`${id}-label`} htmlFor={id} className={styles.fieldLabel}>
          {label}
        </label>
      ) : null}
      <div className={`${styles.selectWrap} ${open ? styles.selectWrapOpen : ''}`} ref={wrapRef}>
        <button
          id={id}
          type="button"
          className={`${styles.selectTrigger} ${open ? styles.selectOpen : ''}`}
          onClick={() => {
            if (!disabled) setOpen((state) => !state);
          }}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={label ? `${id}-label` : undefined}
        >
          <span>{selected?.label || 'Select'}</span>
          <span className={styles.selectChevron} aria-hidden="true" />
        </button>
        {open ? (
          <div className={styles.selectMenu} role="listbox" aria-labelledby={label ? `${id}-label` : id}>
            {options.map((item) => {
              const isSelected = item.value === value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.selectOption} ${isSelected ? styles.selectOptionActive : ''}`}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
